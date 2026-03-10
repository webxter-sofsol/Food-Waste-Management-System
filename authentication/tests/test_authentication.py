"""
Unit tests for authentication module
"""
import pytest
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile
from safety_analytics.models import AuditLog


class UserRegistrationTests(TestCase):
    """Test user registration functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('authentication:register')
        cache.clear()  # Clear cache before each test
    
    def test_register_donor_with_valid_data(self):
        """Test registering a donor with valid data"""
        data = {
            'email': 'donor@example.com',
            'username': 'donor1',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'donor',
            'full_name': 'Test Donor'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'donor@example.com')
        self.assertEqual(response.data['user']['role'], 'donor')
        self.assertEqual(response.data['user']['verification_status'], 'pending')
        
        # Verify user was created
        user = User.objects.get(email='donor@example.com')
        self.assertTrue(user.check_password('SecurePass123!'))
        self.assertEqual(user.verification_status, 'pending')
        
        # Verify profile was created
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
    
    def test_register_with_invalid_email(self):
        """Test registration with invalid email format"""
        data = {
            'email': 'invalid-email',
            'username': 'user1',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'receiver'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_register_with_weak_password(self):
        """Test registration with weak password"""
        data = {
            'email': 'user@example.com',
            'username': 'user1',
            'password': 'weak',
            'password_confirm': 'weak',
            'role': 'receiver'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_register_with_password_mismatch(self):
        """Test registration with mismatched passwords"""
        data = {
            'email': 'user@example.com',
            'username': 'user1',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'role': 'receiver'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)
    
    def test_register_with_duplicate_email(self):
        """Test registration with already existing email"""
        # Create first user
        User.objects.create_user(
            email='existing@example.com',
            username='existing',
            password='SecurePass123!',
            role='donor'
        )
        
        # Try to register with same email
        data = {
            'email': 'existing@example.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'receiver'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class UserLoginTests(TestCase):
    """Test user login functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('authentication:login')
        cache.clear()  # Clear cache before each test
        
        # Create test user
        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='donor',
            verification_status='approved',
            is_active=True
        )
    
    def test_login_with_valid_credentials(self):
        """Test login with valid credentials"""
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'testuser@example.com')
        
        # Verify audit log was created
        self.assertTrue(AuditLog.objects.filter(
            user=self.user,
            action_type='login'
        ).exists())
    
    def test_login_with_invalid_password(self):
        """Test login with invalid password"""
        data = {
            'email': 'testuser@example.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
    
    def test_login_with_nonexistent_email(self):
        """Test login with non-existent email"""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_login_with_inactive_user(self):
        """Test login with inactive user account"""
        # Create inactive user
        inactive_user = User.objects.create_user(
            email='inactive@example.com',
            username='inactive',
            password='SecurePass123!',
            role='receiver',
            is_active=False
        )
        
        data = {
            'email': 'inactive@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileTests(TestCase):
    """Test user profile management"""
    
    def setUp(self):
        self.client = APIClient()
        self.profile_url = reverse('authentication:user_profile')
        cache.clear()  # Clear cache before each test
        
        # Create test user
        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='receiver',
            verification_status='approved'
        )
        
        # Create profile
        self.profile = UserProfile.objects.create(
            user=self.user,
            full_name='Test User'
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.user)
    
    def test_get_user_profile(self):
        """Test retrieving user profile"""
        response = self.client.get(self.profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Test User')
        self.assertEqual(response.data['email'], 'testuser@example.com')
        self.assertEqual(response.data['role'], 'receiver')
    
    def test_update_user_profile(self):
        """Test updating user profile"""
        data = {
            'full_name': 'Updated Name',
            'phone': '1234567890',
            'address': '123 Test St',
            'dietary_preferences': ['vegetarian', 'gluten-free'],
            'allergies': ['peanuts']
        }
        response = self.client.put(self.profile_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Updated Name')
        
        # Verify profile was updated
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.full_name, 'Updated Name')
        self.assertEqual(self.profile.phone, '1234567890')
        self.assertEqual(self.profile.address, '123 Test St')
        self.assertEqual(self.profile.dietary_preferences, ['vegetarian', 'gluten-free'])
    
    def test_update_profile_with_encrypted_fields(self):
        """Test that sensitive fields are encrypted"""
        data = {
            'phone': '9876543210',
            'address': '456 Secret Ave',
            'latitude': 40.7128,
            'longitude': -74.0060
        }
        response = self.client.put(self.profile_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify encryption
        self.profile.refresh_from_db()
        self.assertIsNotNone(self.profile.phone_encrypted)
        self.assertIsNotNone(self.profile.address_encrypted)
        self.assertIsNotNone(self.profile.latitude_encrypted)
        self.assertIsNotNone(self.profile.longitude_encrypted)
        
        # Verify decryption works
        self.assertEqual(self.profile.phone, '9876543210')
        self.assertEqual(self.profile.address, '456 Secret Ave')
        self.assertEqual(self.profile.latitude, 40.7128)
        self.assertEqual(self.profile.longitude, -74.0060)


class RBACTests(TestCase):
    """Test role-based access control"""
    
    def setUp(self):
        self.client = APIClient()
        cache.clear()  # Clear cache before each test
        
        # Create users with different roles
        self.donor = User.objects.create_user(
            email='donor@example.com',
            username='donor',
            password='SecurePass123!',
            role='donor',
            verification_status='approved'
        )
        
        self.receiver = User.objects.create_user(
            email='receiver@example.com',
            username='receiver',
            password='SecurePass123!',
            role='receiver',
            verification_status='approved'
        )
        
        self.volunteer = User.objects.create_user(
            email='volunteer@example.com',
            username='volunteer',
            password='SecurePass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        self.admin = User.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='SecurePass123!',
            role='admin',
            verification_status='approved'
        )
    
    def test_authenticated_user_can_access_profile(self):
        """Test that authenticated users can access their profile"""
        self.client.force_authenticate(user=self.donor)
        response = self.client.get(reverse('authentication:user_profile'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_unauthenticated_user_cannot_access_profile(self):
        """Test that unauthenticated users cannot access profile"""
        response = self.client.get(reverse('authentication:user_profile'))
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutTests(TestCase):
    """Test user logout functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.logout_url = reverse('authentication:logout')
        cache.clear()  # Clear cache before each test
        
        # Create and authenticate user
        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='donor',
            verification_status='approved'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_logout_with_valid_token(self):
        """Test logout with valid refresh token"""
        # First login to get tokens
        login_data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(
            reverse('authentication:login'),
            login_data,
            format='json'
        )
        refresh_token = login_response.data['refresh']
        
        # Now logout
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
