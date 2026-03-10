"""
Integration tests for complete authentication flows
"""
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserProfile
from safety_analytics.models import AuditLog


class AuthenticationIntegrationTests(TestCase):
    """Test complete authentication workflows"""
    
    def setUp(self):
        self.client = APIClient()
        cache.clear()
    
    def test_complete_user_registration_and_login_flow(self):
        """Test complete flow: register -> login -> access profile -> logout"""
        
        # Step 1: Register a new user
        register_data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'donor',
            'full_name': 'New User'
        }
        register_response = self.client.post(
            reverse('authentication:register'),
            register_data,
            format='json'
        )
        
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data['user']['verification_status'], 'pending')
        
        # Verify user was created
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.role, 'donor')
        self.assertEqual(user.verification_status, 'pending')
        
        # Approve user (simulate admin action)
        user.verification_status = 'approved'
        user.save()
        
        # Step 2: Login with the new user
        login_data = {
            'email': 'newuser@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(
            reverse('authentication:login'),
            login_data,
            format='json'
        )
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)
        self.assertIn('refresh', login_response.data)
        
        access_token = login_response.data['access']
        refresh_token = login_response.data['refresh']
        
        # Step 3: Access profile with access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get(reverse('authentication:user_profile'))
        
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['email'], 'newuser@example.com')
        self.assertEqual(profile_response.data['role'], 'donor')
        
        # Step 4: Update profile
        update_data = {
            'full_name': 'Updated User Name',
            'organization_name': 'Test Restaurant',
            'phone': '1234567890',
            'address': '123 Test St'
        }
        update_response = self.client.put(
            reverse('authentication:user_profile'),
            update_data,
            format='json'
        )
        
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['full_name'], 'Updated User Name')
        self.assertEqual(update_response.data['organization_name'], 'Test Restaurant')
        
        # Verify encryption
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.phone, '1234567890')
        self.assertEqual(profile.address, '123 Test St')
        
        # Step 5: Logout
        logout_data = {'refresh': refresh_token}
        logout_response = self.client.post(
            reverse('authentication:logout'),
            logout_data,
            format='json'
        )
        
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        
        # Verify audit logs were created for all actions
        self.assertTrue(AuditLog.objects.filter(user=user, action_type='register').exists())
        self.assertTrue(AuditLog.objects.filter(user=user, action_type='login').exists())
        self.assertTrue(AuditLog.objects.filter(user=user, action_type='update').exists())
        self.assertTrue(AuditLog.objects.filter(user=user, action_type='logout').exists())
    
    def test_receiver_profile_with_dietary_preferences(self):
        """Test receiver can set dietary preferences and allergies"""
        
        # Register receiver
        register_data = {
            'email': 'receiver@example.com',
            'username': 'receiver',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'receiver',
            'full_name': 'Test Receiver'
        }
        self.client.post(reverse('authentication:register'), register_data, format='json')
        
        # Approve and login
        user = User.objects.get(email='receiver@example.com')
        user.verification_status = 'approved'
        user.save()
        
        login_data = {
            'email': 'receiver@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(
            reverse('authentication:login'),
            login_data,
            format='json'
        )
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Update profile with receiver-specific fields
        update_data = {
            'full_name': 'Test Receiver',
            'dietary_preferences': ['vegetarian', 'gluten-free'],
            'allergies': ['peanuts', 'shellfish']
        }
        update_response = self.client.put(
            reverse('authentication:user_profile'),
            update_data,
            format='json'
        )
        
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['dietary_preferences'], ['vegetarian', 'gluten-free'])
        self.assertEqual(update_response.data['allergies'], ['peanuts', 'shellfish'])
    
    def test_volunteer_profile_with_availability(self):
        """Test volunteer can set availability and transportation capacity"""
        
        # Register volunteer
        register_data = {
            'email': 'volunteer@example.com',
            'username': 'volunteer',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': 'volunteer',
            'full_name': 'Test Volunteer'
        }
        self.client.post(reverse('authentication:register'), register_data, format='json')
        
        # Approve and login
        user = User.objects.get(email='volunteer@example.com')
        user.verification_status = 'approved'
        user.save()
        
        login_data = {
            'email': 'volunteer@example.com',
            'password': 'SecurePass123!'
        }
        login_response = self.client.post(
            reverse('authentication:login'),
            login_data,
            format='json'
        )
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Update profile with volunteer-specific fields
        update_data = {
            'full_name': 'Test Volunteer',
            'available_time_slots': ['Monday 9-5', 'Wednesday 9-5', 'Friday 9-5'],
            'transportation_capacity': 50
        }
        update_response = self.client.put(
            reverse('authentication:user_profile'),
            update_data,
            format='json'
        )
        
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(update_response.data['available_time_slots']), 3)
        self.assertEqual(update_response.data['transportation_capacity'], 50)
