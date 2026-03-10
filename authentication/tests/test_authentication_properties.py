"""
Property-based tests for authentication functionality.

This module contains property-based tests using Hypothesis to verify:
- Property 3: Valid Credential Authentication
- Property 4: Invalid Credential Rejection
- Property 6: Session Expiration

**Validates: Requirements 1.4, 1.5, 1.7**
"""

import pytest
import uuid
from datetime import timedelta
from hypothesis import given, strategies as st, settings
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import User


# Hypothesis strategies for generating test data
@st.composite
def valid_email(draw):
    """Generate valid email addresses with unique identifiers"""
    username = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=15
    ))
    # Add UUID to ensure uniqueness
    unique_id = uuid.uuid4().hex[:8]
    domain = draw(st.sampled_from(['example.com', 'test.org', 'mail.net', 'domain.io']))
    return f"{username}{unique_id}@{domain}"


@st.composite
def valid_password(draw):
    """Generate valid passwords (min 8 chars, with special character)"""
    base_password = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
        min_size=8,
        max_size=30
    ))
    # Add special character to meet password requirements
    return base_password + "!@#"


@st.composite
def user_role(draw):
    """Generate valid user roles"""
    return draw(st.sampled_from(['donor', 'receiver', 'volunteer', 'admin']))


@st.composite
def invalid_password(draw):
    """Generate passwords that don't match the valid password"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
        min_size=8,
        max_size=30
    )) + "!@#WRONG"


# Property Tests

@pytest.mark.django_db
@pytest.mark.property
class TestValidCredentialAuthenticationProperty:
    """
    Property 3: Valid Credential Authentication
    
    **Validates: Requirements 1.4**
    
    For any user with valid credentials, attempting to log in should result in 
    successful authentication and session creation.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_credentials_authenticate_successfully(self, email, password, role):
        """
        Test that users with valid credentials can authenticate successfully.
        
        For any user with correct email and password, login should succeed
        and return JWT tokens.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user with known credentials
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Attempt login with valid credentials
        client = APIClient()
        login_data = {
            'email': email,
            'password': password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        
        # Verify successful authentication
        assert response.status_code == status.HTTP_200_OK, \
            f"Login failed with valid credentials: {response.data}"
        
        # Verify response contains required fields
        assert 'access' in response.data, \
            "Access token not returned in login response"
        assert 'refresh' in response.data, \
            "Refresh token not returned in login response"
        assert 'user' in response.data, \
            "User data not returned in login response"
        
        # Verify user data is correct
        assert response.data['user']['email'] == email, \
            f"Email mismatch: expected {email}, got {response.data['user']['email']}"
        assert response.data['user']['role'] == role, \
            f"Role mismatch: expected {role}, got {response.data['user']['role']}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_login_creates_session(self, email, password, role):
        """
        Test that successful login creates a valid session.
        
        For any user with valid credentials, login should create a session
        that allows access to protected resources.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Login
        client = APIClient()
        login_data = {
            'email': email,
            'password': password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Extract access token
        access_token = response.data['access']
        
        # Use token to access protected resource
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = client.get('/api/auth/profile')
        
        # Verify session allows access
        assert profile_response.status_code == status.HTTP_200_OK, \
            f"Session token does not allow access to protected resources: {profile_response.data}"
        
        # Verify correct user is authenticated
        assert profile_response.data['email'] == email, \
            "Session authenticated wrong user"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=30, deadline=None)
    def test_valid_login_updates_last_login(self, email, password, role):
        """
        Test that successful login updates the user's last_login timestamp.
        
        For any successful authentication, the user's last_login field
        should be updated to the current time.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Record time before login
        time_before_login = timezone.now()
        
        # Login
        client = APIClient()
        login_data = {
            'email': email,
            'password': password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Refresh user from database
        user.refresh_from_db()
        
        # Verify last_login was updated
        assert user.last_login is not None, \
            "last_login not set after successful login"
        
        assert user.last_login >= time_before_login, \
            f"last_login ({user.last_login}) is before login time ({time_before_login})"


@pytest.mark.django_db
@pytest.mark.property
class TestInvalidCredentialRejectionProperty:
    """
    Property 4: Invalid Credential Rejection
    
    **Validates: Requirements 1.5**
    
    For any login attempt with invalid credentials (wrong email or password), 
    the system should reject the authentication and return an error.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        wrong_password=invalid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_wrong_password_rejected(self, email, password, wrong_password, role):
        """
        Test that login attempts with incorrect password are rejected.
        
        For any user with valid email but wrong password, login should fail
        with 401 Unauthorized status.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user with known password
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Attempt login with wrong password
        client = APIClient()
        login_data = {
            'email': email,
            'password': wrong_password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        
        # Verify authentication is rejected
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, \
            f"Login with wrong password should return 401, got {response.status_code}"
        
        # Verify error message is present
        assert 'error' in response.data, \
            "Error message not returned for invalid credentials"
        
        # Verify no tokens are returned
        assert 'access' not in response.data, \
            "Access token should not be returned for invalid credentials"
        assert 'refresh' not in response.data, \
            "Refresh token should not be returned for invalid credentials"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=50, deadline=None)
    def test_nonexistent_email_rejected(self, email, password, role):
        """
        Test that login attempts with non-existent email are rejected.
        
        For any email that doesn't exist in the system, login should fail
        with 401 Unauthorized status.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Do NOT create user - email doesn't exist
        
        # Attempt login with non-existent email
        client = APIClient()
        login_data = {
            'email': email,
            'password': password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        
        # Verify authentication is rejected
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, \
            f"Login with non-existent email should return 401, got {response.status_code}"
        
        # Verify error message is present
        assert 'error' in response.data, \
            "Error message not returned for non-existent email"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=30, deadline=None)
    def test_inactive_user_rejected(self, email, password, role):
        """
        Test that login attempts by inactive users are rejected.
        
        For any user with is_active=False, login should fail even with
        correct credentials.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create inactive user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=False  # User is inactive
        )
        
        # Attempt login with correct credentials
        client = APIClient()
        login_data = {
            'email': email,
            'password': password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        
        # Verify authentication is rejected
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, \
            f"Login by inactive user should return 401, got {response.status_code}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        wrong_password=invalid_password(),
        role=user_role()
    )
    @settings(max_examples=30, deadline=None)
    def test_invalid_login_does_not_create_session(self, email, password, wrong_password, role):
        """
        Test that failed login attempts do not create valid sessions.
        
        For any login with invalid credentials, no session should be created
        and no access to protected resources should be granted.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Attempt login with wrong password
        client = APIClient()
        login_data = {
            'email': email,
            'password': wrong_password
        }
        
        response = client.post('/api/auth/login', login_data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Attempt to access protected resource without valid token
        profile_response = client.get('/api/auth/profile')
        
        # Verify access is denied
        assert profile_response.status_code == status.HTTP_401_UNAUTHORIZED, \
            "Failed login should not grant access to protected resources"


@pytest.mark.django_db
@pytest.mark.property
class TestSessionExpirationProperty:
    """
    Property 6: Session Expiration
    
    **Validates: Requirements 1.7**
    
    For any user session created more than 24 hours ago, attempting to access 
    protected resources should require re-authentication.
    """
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=30, deadline=None)
    def test_token_expires_after_24_hours(self, email, password, role):
        """
        Test that JWT access tokens expire after 24 hours.
        
        For any user session, the access token should become invalid
        after 24 hours, requiring re-authentication.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Generate token manually with custom expiry
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Set token to expire 24 hours + 1 minute ago
        access_token.set_exp(from_time=timezone.now() - timedelta(hours=24, minutes=1))
        
        # Try to use expired token
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')
        
        response = client.get('/api/auth/profile')
        
        # Verify access is denied with expired token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, \
            f"Expired token (24+ hours old) should be rejected, got {response.status_code}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=30, deadline=None)
    def test_valid_token_within_24_hours_works(self, email, password, role):
        """
        Test that JWT access tokens are valid within 24 hours.
        
        For any user session less than 24 hours old, the access token
        should allow access to protected resources.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Generate fresh token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Use token immediately (well within 24 hours)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = client.get('/api/auth/profile')
        
        # Verify access is granted with valid token
        assert response.status_code == status.HTTP_200_OK, \
            f"Valid token (< 24 hours) should be accepted, got {response.status_code}: {response.data}"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role()
    )
    @settings(max_examples=20, deadline=None)
    def test_expired_token_requires_reauthentication(self, email, password, role):
        """
        Test that expired tokens require re-authentication.
        
        For any expired token, the user must login again to get a new
        valid token to access protected resources.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Generate expired token
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        access_token.set_exp(from_time=timezone.now() - timedelta(hours=25))
        
        # Try to use expired token
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')
        
        response = client.get('/api/auth/profile')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Re-authenticate with valid credentials
        client.credentials()  # Clear old credentials
        login_data = {
            'email': email,
            'password': password
        }
        
        login_response = client.post('/api/auth/login', login_data, format='json')
        assert login_response.status_code == status.HTTP_200_OK
        
        # Use new token
        new_access_token = login_response.data['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access_token}')
        
        new_response = client.get('/api/auth/profile')
        
        # Verify new token works
        assert new_response.status_code == status.HTTP_200_OK, \
            "Re-authentication should provide valid token for protected resources"
    
    @given(
        email=valid_email(),
        password=valid_password(),
        role=user_role(),
        hours_until_expiry=st.integers(min_value=1, max_value=23)
    )
    @settings(max_examples=20, deadline=None)
    def test_token_valid_before_24_hour_threshold(self, email, password, role, hours_until_expiry):
        """
        Test that tokens are valid at various times before 24-hour expiry.
        
        For any token that is less than 24 hours old, it should remain valid
        regardless of how close it is to the 24-hour threshold.
        """
        cache.clear()  # Clear rate limiting cache
        
        # Create user
        unique_username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:8]}"
        user = User.objects.create_user(
            username=unique_username,
            email=email,
            password=password,
            role=role,
            verification_status='approved',
            is_active=True
        )
        
        # Generate token that will expire in 'hours_until_expiry' hours
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Set expiry to be in the future (within 24 hours)
        access_token.set_exp(from_time=timezone.now() + timedelta(hours=hours_until_expiry))
        
        # Use token
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access_token)}')
        
        response = client.get('/api/auth/profile')
        
        # Verify token is still valid
        assert response.status_code == status.HTTP_200_OK, \
            f"Token with {hours_until_expiry} hours until expiry should be valid, got {response.status_code}"

