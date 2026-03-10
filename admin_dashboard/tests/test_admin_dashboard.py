"""
Unit tests for admin dashboard module
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.core import mail
from django.utils import timezone
from datetime import timedelta

from authentication.models import User, UserProfile
from food_listings.models import FoodListing
from matching.models import Match, FoodRequest
from volunteers.models import PickupCoordination
from tracking.models import DeliveryTracking


class AdminVerificationTests(TestCase):
    """Test cases for user verification endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        
        # Create pending users
        self.pending_donor = User.objects.create_user(
            email='donor@test.com',
            username='donor',
            password='DonorPass123!',
            role='donor',
            verification_status='pending'
        )
        UserProfile.objects.create(
            user=self.pending_donor,
            full_name='Test Donor',
            organization_name='Test Restaurant'
        )
        
        self.pending_receiver = User.objects.create_user(
            email='receiver@test.com',
            username='receiver',
            password='ReceiverPass123!',
            role='receiver',
            verification_status='pending'
        )
        UserProfile.objects.create(
            user=self.pending_receiver,
            full_name='Test Receiver'
        )
    
    def test_get_pending_verifications_as_admin(self):
        """Test admin can retrieve pending verifications"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('pending-verifications')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_get_pending_verifications_as_non_admin(self):
        """Test non-admin cannot retrieve pending verifications"""
        self.client.force_authenticate(user=self.pending_donor)
        
        url = reverse('pending-verifications')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_verify_user_success(self):
        """Test admin can verify a pending user"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('verify-user', kwargs={'user_id': self.pending_donor.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'User verified successfully')
        
        # Check user status updated
        self.pending_donor.refresh_from_db()
        self.assertEqual(self.pending_donor.verification_status, 'approved')
        self.assertTrue(self.pending_donor.is_active)
        
        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('verified', mail.outbox[0].subject.lower())
    
    def test_verify_already_verified_user(self):
        """Test cannot verify already verified user"""
        self.client.force_authenticate(user=self.admin)
        
        # First verification
        url = reverse('verify-user', kwargs={'user_id': self.pending_donor.id})
        self.client.put(url)
        
        # Try to verify again
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already verified', response.data['error'].lower())
    
    def test_verify_nonexistent_user(self):
        """Test verifying non-existent user returns 404"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('verify-user', kwargs={'user_id': 99999})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_reject_user_success(self):
        """Test admin can reject a pending user"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('reject-user', kwargs={'user_id': self.pending_receiver.id})
        data = {'reason': 'Invalid documentation'}
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'User rejected successfully')
        
        # Check user status updated
        self.pending_receiver.refresh_from_db()
        self.assertEqual(self.pending_receiver.verification_status, 'rejected')
        self.assertFalse(self.pending_receiver.is_active)
        
        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Invalid documentation', mail.outbox[0].body)
    
    def test_reject_user_without_reason(self):
        """Test rejecting user without reason still works"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('reject-user', kwargs={'user_id': self.pending_receiver.id})
        response = self.client.put(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('No reason provided', response.data['reason'])


class AdminMetricsTests(TestCase):
    """Test cases for admin metrics endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        
        # Create verified users
        self.donor = User.objects.create_user(
            email='donor@test.com',
            username='donor',
            password='DonorPass123!',
            role='donor',
            verification_status='approved'
        )
        UserProfile.objects.create(user=self.donor, full_name='Donor')
        
        self.receiver = User.objects.create_user(
            email='receiver@test.com',
            username='receiver',
            password='ReceiverPass123!',
            role='receiver',
            verification_status='approved'
        )
        UserProfile.objects.create(user=self.receiver, full_name='Receiver')
        
        self.volunteer = User.objects.create_user(
            email='volunteer@test.com',
            username='volunteer',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        UserProfile.objects.create(user=self.volunteer, full_name='Volunteer')
        
        # Create pending user
        self.pending_user = User.objects.create_user(
            email='pending@test.com',
            username='pending',
            password='PendingPass123!',
            role='donor',
            verification_status='pending'
        )
        
        # Create food listing
        self.listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Vegetarian Meal',
            description='Test meal',
            quantity=10,
            unit='servings',
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=4),
            pickup_address='123 Test St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            status='available',
            available_quantity=10
        )
        
        # Create food request
        self.food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=5,
            pickup_time_preference=timezone.now() + timedelta(hours=2),
            status='approved'
        )
        
        # Create match
        self.match = Match.objects.create(
            listing=self.listing,
            request=self.food_request,
            donor=self.donor,
            receiver=self.receiver,
            matched_quantity=5,
            status='completed',
            completed_at=timezone.now()
        )
    
    def test_get_metrics_as_admin(self):
        """Test admin can retrieve metrics"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-metrics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check user counts
        self.assertEqual(response.data['user_counts']['donor'], 1)
        self.assertEqual(response.data['user_counts']['receiver'], 1)
        self.assertEqual(response.data['user_counts']['volunteer'], 1)
        self.assertEqual(response.data['user_counts']['admin'], 1)
        
        # Check food listing metrics
        self.assertEqual(response.data['food_listings']['total'], 1)
        self.assertEqual(response.data['food_listings']['active'], 1)
        
        # Check match metrics
        self.assertEqual(response.data['matches']['total'], 1)
        self.assertEqual(response.data['matches']['completed_deliveries'], 1)
        
        # Check pending verifications
        self.assertEqual(response.data['pending_verifications'], 1)
    
    def test_get_metrics_as_non_admin(self):
        """Test non-admin cannot retrieve metrics"""
        self.client.force_authenticate(user=self.donor)
        
        url = reverse('admin-metrics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_metrics_caching(self):
        """Test metrics are cached for 5 minutes"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-metrics')
        
        # First request
        response1 = self.client.get(url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Create new user
        User.objects.create_user(
            email='newdonor@test.com',
            username='newdonor',
            password='NewDonorPass123!',
            role='donor',
            verification_status='approved'
        )
        
        # Second request should return cached data
        response2 = self.client.get(url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # User count should still be the same (cached)
        self.assertEqual(response2.data['user_counts']['donor'], 1)


class AdminReportsTests(TestCase):
    """Test cases for admin reports endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        
        # Create test users
        self.donor = User.objects.create_user(
            email='donor@test.com',
            username='donor',
            password='DonorPass123!',
            role='donor',
            verification_status='approved'
        )
        
        self.receiver = User.objects.create_user(
            email='receiver@test.com',
            username='receiver',
            password='ReceiverPass123!',
            role='receiver',
            verification_status='approved'
        )
    
    def test_get_users_report(self):
        """Test generating users report"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'users'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['report_type'], 'users')
        self.assertGreaterEqual(len(response.data['data']), 2)
    
    def test_get_users_report_with_role_filter(self):
        """Test filtering users report by role"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'users', 'role': 'donor'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # All returned users should be donors
        for user in response.data['data']:
            self.assertEqual(user['role'], 'donor')
    
    def test_get_listings_report(self):
        """Test generating listings report"""
        self.client.force_authenticate(user=self.admin)
        
        # Create a listing
        FoodListing.objects.create(
            donor=self.donor,
            food_type='Test Food',
            description='Test',
            quantity=10,
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=4),
            pickup_address='123 Test St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            available_quantity=10
        )
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'listings'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['report_type'], 'listings')
        self.assertGreaterEqual(len(response.data['data']), 1)
    
    def test_get_matches_report(self):
        """Test generating matches report"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'matches'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['report_type'], 'matches')
    
    def test_invalid_report_type(self):
        """Test invalid report type returns error"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'invalid'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_export_csv_report(self):
        """Test exporting report as CSV"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('export-report')
        data = {
            'format': 'csv',
            'type': 'users'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
    
    def test_export_pdf_report_not_implemented(self):
        """Test PDF export returns not implemented"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('export-report')
        data = {
            'format': 'pdf',
            'type': 'users'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_501_NOT_IMPLEMENTED)
    
    def test_export_invalid_format(self):
        """Test invalid export format returns error"""
        self.client.force_authenticate(user=self.admin)
        
        url = reverse('export-report')
        data = {
            'format': 'xml',
            'type': 'users'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reports_pagination(self):
        """Test reports are paginated with 20 items per page"""
        self.client.force_authenticate(user=self.admin)
        
        # Create 25 users to test pagination
        for i in range(25):
            User.objects.create_user(
                email=f'user{i}@test.com',
                username=f'user{i}',
                password='TestPass123!',
                role='receiver',
                verification_status='approved'
            )
        
        url = reverse('admin-reports')
        response = self.client.get(url, {'type': 'users'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return 20 items on first page
        self.assertEqual(len(response.data['data']), 20)
        # Should have next page
        self.assertIsNotNone(response.data.get('next'))
