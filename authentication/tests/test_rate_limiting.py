"""
Tests for rate limiting functionality
"""
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User
from authentication.rate_limiting import check_rate_limit, reset_rate_limit


class RateLimitingTests(TestCase):
    """Test rate limiting for login attempts"""
    
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
            verification_status='approved'
        )
    
    def test_rate_limit_allows_initial_attempts(self):
        """Test that initial login attempts are allowed"""
        result = check_rate_limit('192.168.1.1', 'login')
        
        self.assertTrue(result['allowed'])
        self.assertEqual(result['attempts'], 1)
        self.assertEqual(result['retry_after'], 0)
    
    def test_rate_limit_blocks_after_max_attempts(self):
        """Test that rate limit blocks after 5 failed attempts"""
        ip_address = '192.168.1.2'
        
        # Make 5 failed login attempts
        for i in range(5):
            data = {
                'email': 'testuser@example.com',
                'password': 'WrongPassword123!'
            }
            response = self.client.post(
                self.login_url,
                data,
                format='json',
                REMOTE_ADDR=ip_address
            )
        
        # 6th attempt should be rate limited
        data = {
            'email': 'testuser@example.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(
            self.login_url,
            data,
            format='json',
            REMOTE_ADDR=ip_address
        )
        
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('error', response.data)
        self.assertIn('retry_after', response.data)
    
    def test_rate_limit_reset(self):
        """Test that rate limit can be reset"""
        ip_address = '192.168.1.3'
        
        # Make some attempts
        for i in range(3):
            check_rate_limit(ip_address, 'login')
        
        # Reset rate limit
        reset_rate_limit(ip_address, 'login')
        
        # Next attempt should be allowed as first attempt
        result = check_rate_limit(ip_address, 'login')
        self.assertTrue(result['allowed'])
        self.assertEqual(result['attempts'], 1)
    
    def test_successful_login_after_failed_attempts(self):
        """Test that successful login is allowed even after failed attempts"""
        ip_address = '192.168.1.4'
        
        # Make 3 failed attempts
        for i in range(3):
            data = {
                'email': 'testuser@example.com',
                'password': 'WrongPassword123!'
            }
            self.client.post(
                self.login_url,
                data,
                format='json',
                REMOTE_ADDR=ip_address
            )
        
        # Successful login should still work
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(
            self.login_url,
            data,
            format='json',
            REMOTE_ADDR=ip_address
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
