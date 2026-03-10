"""
Views for admin dashboard module
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache

from authentication.models import User
from authentication.permissions import IsAdmin
from food_listings.models import FoodListing
from matching.models import Match
from tracking.models import DeliveryTracking
from volunteers.models import PickupCoordination
from .serializers import PendingUserSerializer, UserVerificationSerializer


class PendingVerificationsView(generics.ListAPIView):
    """
    GET /api/admin/pending-verifications
    List all pending user verifications
    """
    serializer_class = PendingUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Get all users with pending verification status"""
        return User.objects.filter(
            verification_status='pending'
        ).select_related('profile').order_by('-date_joined')


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def verify_user(request, user_id):
    """
    PUT /api/admin/users/{id}/verify
    Approve a user's registration
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if user is already verified
    if user.verification_status == 'approved':
        return Response(
            {'error': 'User is already verified'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update user status
    user.verification_status = 'approved'
    user.is_active = True
    user.save()
    
    # Send confirmation email
    try:
        send_mail(
            subject='Account Verified - Buffet Management System',
            message=f'Dear {user.username},\n\n'
                    f'Your account has been verified and approved. '
                    f'You can now access all features of the Buffet Management System.\n\n'
                    f'Thank you for joining us!\n\n'
                    f'Best regards,\n'
                    f'Buffet Management Team',
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@buffet.com',
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to send verification email: {e}")
    
    serializer = PendingUserSerializer(user)
    return Response(
        {
            'message': 'User verified successfully',
            'user': serializer.data
        },
        status=status.HTTP_200_OK
    )


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def reject_user(request, user_id):
    """
    PUT /api/admin/users/{id}/reject
    Reject a user's registration
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate request data
    serializer = UserVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    reason = serializer.validated_data.get('reason', 'No reason provided')
    
    # Update user status
    user.verification_status = 'rejected'
    user.is_active = False
    user.save()
    
    # Send rejection email
    try:
        send_mail(
            subject='Account Registration - Buffet Management System',
            message=f'Dear {user.username},\n\n'
                    f'We regret to inform you that your account registration has been rejected.\n\n'
                    f'Reason: {reason}\n\n'
                    f'If you believe this is an error, please contact our support team.\n\n'
                    f'Best regards,\n'
                    f'Buffet Management Team',
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@buffet.com',
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to send rejection email: {e}")
    
    return Response(
        {
            'message': 'User rejected successfully',
            'user_id': user_id,
            'reason': reason
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_metrics(request):
    """
    GET /api/admin/metrics
    Get admin dashboard metrics with 5-minute caching
    """
    # Try to get cached metrics
    cache_key = 'admin_metrics'
    cached_metrics = cache.get(cache_key)
    
    if cached_metrics:
        return Response(cached_metrics, status=status.HTTP_200_OK)
    
    # Calculate metrics
    # User counts by role
    user_counts = User.objects.filter(
        verification_status='approved',
        is_active=True
    ).values('role').annotate(count=Count('id'))
    
    user_counts_dict = {item['role']: item['count'] for item in user_counts}
    
    # Food listing metrics
    total_food_listings = FoodListing.objects.count()
    active_food_listings = FoodListing.objects.filter(status='available').count()
    
    # Match metrics
    total_matches = Match.objects.count()
    completed_deliveries = Match.objects.filter(status='completed').count()
    
    # Calculate average response times
    # Average time from match creation to volunteer assignment
    avg_volunteer_assignment_time = PickupCoordination.objects.filter(
        assigned_at__isnull=False
    ).annotate(
        response_time=F('assigned_at') - F('created_at')
    ).aggregate(
        avg_time=Avg('response_time')
    )['avg_time']
    
    # Average time from match creation to completion
    avg_delivery_time = Match.objects.filter(
        completed_at__isnull=False
    ).annotate(
        completion_time=F('completed_at') - F('created_at')
    ).aggregate(
        avg_time=Avg('completion_time')
    )['avg_time']
    
    # Convert timedelta to seconds for JSON serialization
    avg_volunteer_assignment_seconds = None
    if avg_volunteer_assignment_time:
        avg_volunteer_assignment_seconds = avg_volunteer_assignment_time.total_seconds()
    
    avg_delivery_seconds = None
    if avg_delivery_time:
        avg_delivery_seconds = avg_delivery_time.total_seconds()
    
    # Pending verifications
    pending_verifications = User.objects.filter(verification_status='pending').count()
    
    # System alerts (example: expiring soon listings)
    expiring_soon = FoodListing.objects.filter(
        status='available',
        expiry_time__lte=timezone.now() + timedelta(hours=2),
        expiry_time__gt=timezone.now()
    ).count()
    
    metrics = {
        'user_counts': {
            'donor': user_counts_dict.get('donor', 0),
            'receiver': user_counts_dict.get('receiver', 0),
            'volunteer': user_counts_dict.get('volunteer', 0),
            'admin': user_counts_dict.get('admin', 0),
            'total': sum(user_counts_dict.values())
        },
        'food_listings': {
            'total': total_food_listings,
            'active': active_food_listings
        },
        'matches': {
            'total': total_matches,
            'completed_deliveries': completed_deliveries
        },
        'average_response_times': {
            'volunteer_assignment_seconds': avg_volunteer_assignment_seconds,
            'delivery_completion_seconds': avg_delivery_seconds
        },
        'pending_verifications': pending_verifications,
        'system_alerts': {
            'expiring_soon_listings': expiring_soon
        }
    }
    
    # Cache metrics for 5 minutes
    cache.set(cache_key, metrics, 300)
    
    return Response(metrics, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_reports(request):
    """
    GET /api/admin/reports
    Generate admin reports with filtering
    """
    # Get filter parameters
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    role = request.query_params.get('role')
    location = request.query_params.get('location')
    report_type = request.query_params.get('type', 'users')  # users, listings, matches
    
    # Build base queryset based on report type
    if report_type == 'users':
        queryset = User.objects.all()
        
        # Apply filters
        if role:
            queryset = queryset.filter(role=role)
        
        if start_date:
            queryset = queryset.filter(date_joined__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(date_joined__lte=end_date)
        
        # Prepare report data
        data = queryset.values(
            'id', 'email', 'username', 'role', 
            'verification_status', 'is_active', 'date_joined'
        ).order_by('-date_joined')
        
    elif report_type == 'listings':
        queryset = FoodListing.objects.select_related('donor')
        
        # Apply filters
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        if location:
            # Simple location filter by address contains
            queryset = queryset.filter(pickup_address__icontains=location)
        
        # Prepare report data
        data = queryset.values(
            'id', 'food_type', 'quantity', 'unit', 'status',
            'preparation_time', 'expiry_time', 'freshness_score',
            'pickup_address', 'created_at'
        ).order_by('-created_at')
        
    elif report_type == 'matches':
        queryset = Match.objects.select_related('donor', 'receiver', 'listing')
        
        # Apply filters
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Prepare report data
        data = queryset.values(
            'id', 'matched_quantity', 'status',
            'created_at', 'completed_at',
            'donor__email', 'receiver__email',
            'listing__food_type'
        ).order_by('-created_at')
        
    else:
        return Response(
            {'error': 'Invalid report type. Must be one of: users, listings, matches'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Paginate results (20 items per page as per requirements)
    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    
    # Convert queryset to list for pagination
    data_list = list(data)
    paginated_data = paginator.paginate_queryset(data_list, request)
    
    # Build response with pagination
    response_data = {
        'report_type': report_type,
        'filters': {
            'start_date': start_date,
            'end_date': end_date,
            'role': role,
            'location': location
        },
        'data': paginated_data,
        'count': len(data_list),
        'next': paginator.get_next_link(),
        'previous': paginator.get_previous_link()
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_report(request):
    """
    POST /api/admin/reports/export
    Export reports in CSV or PDF format
    """
    import csv
    from django.http import HttpResponse
    
    # Get export parameters
    export_format = request.data.get('format', 'csv')  # csv or pdf
    report_type = request.data.get('type', 'users')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    role = request.data.get('role')
    location = request.data.get('location')
    
    # Validate format
    if export_format not in ['csv', 'pdf']:
        return Response(
            {'error': 'Invalid format. Must be csv or pdf'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Build queryset (same logic as admin_reports)
    if report_type == 'users':
        queryset = User.objects.all()
        
        if role:
            queryset = queryset.filter(role=role)
        if start_date:
            queryset = queryset.filter(date_joined__gte=start_date)
        if end_date:
            queryset = queryset.filter(date_joined__lte=end_date)
        
        data = queryset.values(
            'id', 'email', 'username', 'role', 
            'verification_status', 'is_active', 'date_joined'
        )
        
        fields = ['id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined']
        
    elif report_type == 'listings':
        queryset = FoodListing.objects.all()
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        if location:
            queryset = queryset.filter(pickup_address__icontains=location)
        
        data = queryset.values(
            'id', 'food_type', 'quantity', 'unit', 'status',
            'preparation_time', 'expiry_time', 'freshness_score',
            'pickup_address', 'created_at'
        )
        
        fields = ['id', 'food_type', 'quantity', 'unit', 'status', 
                  'preparation_time', 'expiry_time', 'freshness_score',
                  'pickup_address', 'created_at']
        
    elif report_type == 'matches':
        queryset = Match.objects.select_related('donor', 'receiver', 'listing')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        data = queryset.values(
            'id', 'matched_quantity', 'status',
            'created_at', 'completed_at',
            'donor__email', 'receiver__email',
            'listing__food_type'
        )
        
        fields = ['id', 'matched_quantity', 'status', 'created_at', 'completed_at',
                  'donor__email', 'receiver__email', 'listing__food_type']
    else:
        return Response(
            {'error': 'Invalid report type'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Export as CSV
    if export_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'
        
        writer = csv.DictWriter(response, fieldnames=fields)
        writer.writeheader()
        
        for row in data:
            writer.writerow(row)
        
        return response
    
    # Export as PDF (simplified - would need reportlab or similar in production)
    elif export_format == 'pdf':
        # For now, return a simple text response
        # In production, use reportlab or weasyprint
        return Response(
            {
                'message': 'PDF export not yet implemented',
                'note': 'Use CSV export for now'
            },
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
