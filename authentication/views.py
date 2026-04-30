"""
Views for authentication module
"""
import os
import uuid
from django.core.cache import cache
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import update_session_auth_hash
from django.utils import timezone
from .models import User, UserProfile
from .serializers import (
    UserRegistrationSerializer,
    LoginSerializer,
    UserProfileSerializer
)
from .permissions import IsDonor, IsReceiver, IsVolunteer, IsAdmin
from .utils import log_audit_event
from .rate_limiting import check_rate_limit


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    User registration endpoint
    POST /api/auth/register
    
    Validates email format, password strength, and required fields.
    Encrypts password using bcrypt with work factor 12.
    Sets initial verification_status to 'pending'.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Create user profile, handling multipart form data for verification_document
        profile_kwargs = {
            'user': user,
            'full_name': request.data.get('full_name', ''),
        }
        if user.role == 'receiver':
            profile_kwargs['receiver_type'] = request.data.get('receiver_type', 'individual')
        
        profile = UserProfile.objects.create(**profile_kwargs)
        
        # Save verification document if provided
        verification_document = request.FILES.get('verification_document')
        if verification_document and user.role == 'receiver':
            profile.verification_document = verification_document
            profile.save()
        
        # Log registration
        log_audit_event(
            user=user,
            action_type='register',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'role': user.role}
        )
        
        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'verification_status': user.verification_status
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    User login endpoint
    POST /api/auth/login
    
    Authenticates user with email and password.
    Generates JWT access and refresh tokens on success.
    Returns 401 for invalid credentials.
    Implements rate limiting (5 attempts per 15 minutes per IP).
    """
    ip_address = get_client_ip(request)
    
    # Check rate limiting
    rate_limit_result = check_rate_limit(ip_address, 'login')
    if not rate_limit_result['allowed']:
        log_audit_event(
            user=None,
            action_type='login_rate_limited',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'attempts': rate_limit_result['attempts']}
        )
        return Response({
            'error': 'Too many login attempts. Please try again later.',
            'retry_after': rate_limit_result['retry_after']
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Log successful login
        log_audit_event(
            user=user,
            action_type='login',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={'success': True}
        )
        
        return Response({
            'message': 'Login successful',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'verification_status': user.verification_status
            }
        }, status=status.HTTP_200_OK)
    
    # Log failed login attempt
    log_audit_event(
        user=None,
        action_type='login',
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={'success': False, 'email': request.data.get('email')}
    )
    
    return Response({
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    User logout endpoint
    POST /api/auth/logout
    
    Blacklists the refresh token to invalidate the session.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        # Log logout
        log_audit_event(
            user=request.user,
            action_type='logout',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            details={}
        )
        
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    
    except (TokenError, InvalidToken) as e:
        return Response({
            'error': 'Invalid token'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_session(request):
    """
    Verify session validity endpoint
    GET /api/auth/verify-session
    
    Returns user information if session is valid.
    """
    user = request.user
    return Response({
        'valid': True,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'verification_status': user.verification_status,
            'is_active': user.is_active
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    User profile management endpoint
    GET /api/profile - Retrieve user profile
    PUT /api/profile - Update user profile
    
    Handles role-specific fields and encrypts sensitive data.
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist
        profile = UserProfile.objects.create(
            user=request.user,
            full_name=''
        )
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Log profile update
            log_audit_event(
                user=request.user,
                action_type='update',
                entity_type='UserProfile',
                entity_id=profile.id,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={'fields_updated': list(request.data.keys())}
            )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    Request a password reset link.
    POST /api/auth/forgot-password/
    Body: { "email": "user@example.com" }

    Generates a short-lived token (stored in cache for 1 hour),
    then emails a reset link to the user.
    Always returns 200 to avoid user enumeration.
    """
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Return success anyway to prevent user enumeration
        return Response(
            {'message': 'If that email exists, a reset link has been sent.'},
            status=status.HTTP_200_OK
        )

    # Generate a secure token and cache it for 1 hour
    token = str(uuid.uuid4())
    cache_key = f'password_reset_{token}'
    cache.set(cache_key, user.id, timeout=3600)

    # Build reset URL (frontend handles the actual reset form)
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    reset_url = f'{frontend_url}/reset-password?token={token}'

    from django.core.mail import send_mail
    from django.conf import settings as django_settings

    # If SMTP credentials are not configured, fall back to console backend for this send
    using_smtp = bool(django_settings.EMAIL_HOST_USER and django_settings.EMAIL_HOST_PASSWORD)
    if not using_smtp:
        from django.test.utils import override_settings
        from django.core.mail import get_connection
        connection = get_connection(backend='django.core.mail.backends.console.EmailBackend')
    else:
        connection = None  # use default backend from settings

    send_mail(
        subject='Reset your FoodShare password',
        message=(
            f'Hi {user.username},\n\n'
            f'Click the link below to reset your password. '
            f'This link expires in 1 hour.\n\n'
            f'{reset_url}\n\n'
            f'If you did not request this, you can safely ignore this email.\n\n'
            f'— The FoodShare Team'
        ),
        from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@foodshare.com'),
        recipient_list=[user.email],
        fail_silently=False,
        connection=connection,
    )

    log_audit_event(
        user=user,
        action_type='password_reset_request',
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={'email': email}
    )

    return Response(
        {'message': 'If that email exists, a reset link has been sent.'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset password using a token from the email link.
    POST /api/auth/reset-password/
    Body: { "token": "...", "password": "...", "password_confirm": "..." }
    """
    token = request.data.get('token', '').strip()
    password = request.data.get('password', '')
    password_confirm = request.data.get('password_confirm', '')

    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not password:
        return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
    if password != password_confirm:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(password)
    except DjangoValidationError as e:
        return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    # Look up token in cache
    cache_key = f'password_reset_{token}'
    user_id = cache.get(cache_key)
    if not user_id:
        return Response(
            {'error': 'This reset link is invalid or has expired.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    user.set_password(password)
    user.save()

    # Invalidate the token immediately after use
    cache.delete(cache_key)

    log_audit_event(
        user=user,
        action_type='password_reset',
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={'success': True}
    )

    return Response({'message': 'Password reset successfully. You can now log in.'}, status=status.HTTP_200_OK)
