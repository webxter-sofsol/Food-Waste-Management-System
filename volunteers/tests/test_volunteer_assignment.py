"""
Tests for volunteer assignment acceptance functionality
Task 7.3: Implement volunteer assignment acceptance API
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.db import transaction
from rest_framework.test import APIClient
from rest_framework import status
from datetime import datetime, timedelta
from unittest.mock import patch
import threading
import time

from authentication.models import User, UserProfile
from food_listings.models import FoodListing
from matching.models import Match, FoodRequest
from volunteers.models import PickupCoordination
from safety_analytics.models import Notification


class VolunteerAssignmentAcceptanceTest(TestCase):
    """Test volunteer assignment acceptance API"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
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
        
        self.volunteer1 = User.objects.create_user(
            email='volunteer1@test.com',
            username='volunteer1',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        self.volunteer2 = User.objects.create_user(
            email='volunteer2@test.com',
            username='volunteer2',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        # Create profiles
        UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor',
            phone='1234567890',
            address='123 Donor St',
            latitude=40.7128,
            longitude=-74.0060
        )
        
        UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver',
            phone='0987654321',
            address='456 Receiver Ave',
            latitude=40.7589,
            longitude=-73.9851
        )
        
        UserProfile.objects.create(
            user=self.volunteer1,
            full_name='Test Volunteer 1',
            phone='5555555555',
            address='789 Volunteer Blvd',
            latitude=40.7505,
            longitude=-73.9934
        )
        
        UserProfile.objects.create(
            user=self.volunteer2,
            full_name='Test Volunteer 2',
            phone='6666666666',
            address='321 Helper St',
            latitude=40.7614,
            longitude=-73.9776
        )
        
        # Create food listing
        self.food_listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Vegetarian',
            description='Fresh vegetarian meals',
            quantity=10,
            unit='servings',
            preparation_time=timezone.now() - timedelta(hours=1),
            expiry_time=timezone.now() + timedelta(hours=6),
            pickup_address='123 Donor St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            is_vegetarian=True,
            status='available'
        )
        
        # Create food request
        self.food_request = FoodRequest.objects.create(
            listing=self.food_listing,
            receiver=self.receiver,
            requested_quantity=5,
            pickup_time_preference=timezone.now() + timedelta(hours=2),
            status='approved'
        )
        
        # Create match
        self.match = Match.objects.create(
            listing=self.food_listing,
            request=self.food_request,
            donor=self.donor,
            receiver=self.receiver,
            matched_quantity=5,
            status='matched'
        )
        
        # Create pickup coordination
        self.pickup_coordination = PickupCoordination.objects.create(
            match=self.match,
            donor_location={'lat': 40.7128, 'lon': -74.0060},
            receiver_location={'lat': 40.7589, 'lon': -73.9851},
            food_quantity=5,
            required_pickup_time=timezone.now() + timedelta(hours=2),
            assignment_status='pending'
        )
        
        self.client = APIClient()
    
    def test_successful_assignment_acceptance(self):
        """Test successful volunteer assignment acceptance"""
        # Authenticate as volunteer
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['volunteer'], self.volunteer1.id)
        self.assertEqual(response.data['assignment_status'], 'accepted')
        
        # Check database updates
        self.pickup_coordination.refresh_from_db()
        self.assertEqual(self.pickup_coordination.volunteer, self.volunteer1)
        self.assertEqual(self.pickup_coordination.assignment_status, 'accepted')
        self.assertIsNotNone(self.pickup_coordination.assigned_at)
        
        # Check match status update
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'in_progress')
        
        # Check notifications were created
        donor_notifications = Notification.objects.filter(
            user=self.donor,
            notification_type='volunteer_assignment'
        )
        receiver_notifications = Notification.objects.filter(
            user=self.receiver,
            notification_type='volunteer_assignment'
        )
        
        self.assertTrue(donor_notifications.exists())
        self.assertTrue(receiver_notifications.exists())
    
    def test_conflict_when_already_assigned(self):
        """Test 409 Conflict when assignment already accepted"""
        # First volunteer accepts
        self.pickup_coordination.volunteer = self.volunteer1
        self.pickup_coordination.assignment_status = 'accepted'
        self.pickup_coordination.assigned_at = timezone.now()
        self.pickup_coordination.save()
        
        # Second volunteer tries to accept
        self.client.force_authenticate(user=self.volunteer2)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already been accepted', response.data['message'])
    
    def test_conflict_when_status_not_pending(self):
        """Test 409 Conflict when assignment status is not pending"""
        # Set status to completed
        self.pickup_coordination.assignment_status = 'completed'
        self.pickup_coordination.save()
        
        # Volunteer tries to accept
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already been accepted', response.data['message'])
    
    def test_volunteer_permission_required(self):
        """Test that only volunteers can accept assignments"""
        # Try as donor
        self.client.force_authenticate(user=self.donor)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try as receiver
        self.client.force_authenticate(user=self.receiver)
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_authentication_required(self):
        """Test that authentication is required"""
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_nonexistent_assignment_404(self):
        """Test 404 for nonexistent assignment"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': 99999})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_race_condition_prevention(self):
        """Test that database transaction prevents race conditions"""
        # SQLite has limitations with threading, so we'll test the logic differently
        # by simulating the race condition scenario
        
        # First volunteer accepts
        self.client.force_authenticate(user=self.volunteer1)
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response1 = self.client.post(url)
        
        # Verify first acceptance succeeded
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Second volunteer tries to accept the same assignment
        self.client.force_authenticate(user=self.volunteer2)
        response2 = self.client.post(url)
        
        # Verify second acceptance fails with conflict
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        
        # Check final state - only first volunteer should be assigned
        self.pickup_coordination.refresh_from_db()
        self.assertEqual(self.pickup_coordination.volunteer, self.volunteer1)
        self.assertEqual(self.pickup_coordination.assignment_status, 'accepted')
    
    def test_notification_content(self):
        """Test notification content for donor and receiver"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check donor notification
        donor_notification = Notification.objects.get(
            user=self.donor,
            notification_type='volunteer_assignment'
        )
        self.assertEqual(donor_notification.title, 'Volunteer Assigned')
        self.assertIn('Test Volunteer 1', donor_notification.message)
        self.assertIn('Vegetarian', donor_notification.message)
        self.assertEqual(donor_notification.related_entity_type, 'pickup_coordination')
        self.assertEqual(donor_notification.related_entity_id, self.pickup_coordination.id)
        
        # Check receiver notification
        receiver_notification = Notification.objects.get(
            user=self.receiver,
            notification_type='volunteer_assignment'
        )
        self.assertEqual(receiver_notification.title, 'Volunteer Assigned')
        self.assertIn('Test Volunteer 1', receiver_notification.message)
        self.assertIn('Vegetarian', receiver_notification.message)
        self.assertEqual(receiver_notification.related_entity_type, 'pickup_coordination')
        self.assertEqual(receiver_notification.related_entity_id, self.pickup_coordination.id)
    
    @patch('volunteers.views.Notification.objects.create')
    def test_notification_failure_handling(self, mock_notification):
        """Test that assignment still succeeds if notification fails"""
        # Make notification creation fail
        mock_notification.side_effect = Exception("Notification service down")
        
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        # Assignment should still succeed
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check database updates
        self.pickup_coordination.refresh_from_db()
        self.assertEqual(self.pickup_coordination.volunteer, self.volunteer1)
        self.assertEqual(self.pickup_coordination.assignment_status, 'accepted')
    
    def test_response_data_completeness(self):
        """Test that response contains all required data"""
        self.client.force_authenticate(user=self.volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': self.pickup_coordination.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response data structure
        required_fields = [
            'id', 'match_id', 'volunteer', 'volunteer_name',
            'donor_name', 'receiver_name', 'food_type',
            'donor_location', 'receiver_location', 'pickup_address',
            'food_quantity', 'required_pickup_time',
            'assignment_status', 'escalation_count',
            'created_at', 'assigned_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, response.data)
        
        # Check specific values
        self.assertEqual(response.data['volunteer'], self.volunteer1.id)
        self.assertEqual(response.data['volunteer_name'], 'Test Volunteer 1')
        self.assertEqual(response.data['assignment_status'], 'accepted')
        self.assertEqual(response.data['food_quantity'], 5)