"""
Tests for audit logging functionality
"""
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile
from safety_analytics.models import AuditLog


class AuditLoggingTests(TestCase):
    """Test audit logging for authentication events"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('authentication:register')
        self.login_url = reverse('authentication:login')
        self.logout_url = reverse('authentication:logout')
        self.profile_url = reverse('authentication:user_profile')
        cache.clear()  # Clear cache before each test
    
    def test_registration_creates_audit_log(self):
        """Test that user registration creates an audit log entry"""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'donor',
            'full_name': 'New User'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify audit log was created
        user = User.objects.get(email='newuser@example.com')
        audit_log = AuditLog.objects.filter(
            user=user,
            action_type='register'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action_type, 'register')
        self.assertIn('role', audit_log.details)
        self.assertEqual(audit_log.details['role'], 'donor')
    
    def test_successful_login_creates_audit_log(self):
        """Test that successful login creates an audit log entry"""
        # Create user
        user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='receiver',
            verification_status='approved'
        )
        
        # Login
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify audit log was created
        audit_log = AuditLog.objects.filter(
            user=user,
            action_type='login'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action_type, 'login')
        self.assertTrue(audit_log.details.get('success'))
    
    def test_failed_login_creates_audit_log(self):
        """Test that failed login creates an audit log entry"""
        # Create user
        user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='receiver',
            verification_status='approved'
        )
        
        # Failed login
        data = {
            'email': 'testuser@example.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify audit log was created
        audit_log = AuditLog.objects.filter(
            action_type='login',
            details__success=False
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action_type, 'login')
        self.assertFalse(audit_log.details.get('success'))
        self.assertEqual(audit_log.details.get('email'), 'testuser@example.com')
    
    def test_logout_creates_audit_log(self):
        """Test that logout creates an audit log entry"""
        # Create and authenticate user
        user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='donor',
            verification_status='approved'
        )
        
        # Login to get tokens
        login_data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']
        
        # Authenticate for logout
        self.client.force_authenticate(user=user)
        
        # Logout
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify audit log was created
        audit_log = AuditLog.objects.filter(
            user=user,
            action_type='logout'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action_type, 'logout')
    
    def test_profile_update_creates_audit_log(self):
        """Test that profile update creates an audit log entry"""
        # Create user and profile
        user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='receiver',
            verification_status='approved'
        )
        profile = UserProfile.objects.create(
            user=user,
            full_name='Test User'
        )
        
        # Authenticate
        self.client.force_authenticate(user=user)
        
        # Update profile
        data = {
            'full_name': 'Updated Name',
            'phone': '1234567890'
        }
        response = self.client.put(self.profile_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify audit log was created
        audit_log = AuditLog.objects.filter(
            user=user,
            action_type='update',
            entity_type='UserProfile'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.action_type, 'update')
        self.assertEqual(audit_log.entity_type, 'UserProfile')
        self.assertEqual(audit_log.entity_id, profile.id)
        self.assertIn('fields_updated', audit_log.details)
    
    def test_audit_log_includes_ip_and_user_agent(self):
        """Test that audit logs include IP address and user agent"""
        # Create user
        user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='SecurePass123!',
            role='donor',
            verification_status='approved'
        )
        
        # Login with custom headers
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(
            self.login_url,
            data,
            format='json',
            HTTP_USER_AGENT='TestBrowser/1.0'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify audit log includes IP and user agent
        audit_log = AuditLog.objects.filter(
            user=user,
            action_type='login'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertIsNotNone(audit_log.ip_address)
        self.assertEqual(audit_log.user_agent, 'TestBrowser/1.0')
