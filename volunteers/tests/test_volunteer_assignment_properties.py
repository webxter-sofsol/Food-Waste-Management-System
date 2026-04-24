"""
Property-based tests for volunteer assignment acceptance functionality
Task 7.3: Implement volunteer assignment acceptance API

**Validates: Requirements 9.3, 9.4**
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase

from authentication.models import User, UserProfile
from food_listings.models import FoodListing
from matching.models import Match, FoodRequest
from volunteers.models import PickupCoordination
from safety_analytics.models import Notification


class VolunteerAssignmentPropertiesTest(HypothesisTestCase):
    """Property-based tests for volunteer assignment acceptance"""
    
    def setUp(self):
        """Set up test data"""
        # Create users with unique identifiers to avoid conflicts
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        self.donor = User.objects.create_user(
            email=f'donor_{unique_id}@test.com',
            username=f'donor_{unique_id}',
            password='DonorPass123!',
            role='donor',
            verification_status='approved'
        )
        
        self.receiver = User.objects.create_user(
            email=f'receiver_{unique_id}@test.com',
            username=f'receiver_{unique_id}',
            password='ReceiverPass123!',
            role='receiver',
            verification_status='approved'
        )
        
        # Create profiles
        UserProfile.objects.create(
            user=self.donor,
            full_name=f'Test Donor {unique_id}',
            phone='1234567890',
            address='123 Donor St',
            latitude=40.7128,
            longitude=-74.0060
        )
        
        UserProfile.objects.create(
            user=self.receiver,
            full_name=f'Test Receiver {unique_id}',
            phone='0987654321',
            address='456 Receiver Ave',
            latitude=40.7589,
            longitude=-73.9851
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
    
    @given(
        volunteer_name=st.text(min_size=1, max_size=50),
        food_quantity=st.integers(min_value=1, max_value=100)
    )
    @settings(max_examples=20, deadline=None)
    def test_property_37_volunteer_assignment_creation(self, volunteer_name, food_quantity):
        """
        Feature: buffet-management-food-distribution
        Property 37: Volunteer Assignment Creation
        
        **Validates: Requirements 9.3**
        
        For any volunteer accepting an assignment, the system should create a 
        pickup coordination record and notify both donor and receiver.
        """
        # Create volunteer with unique email
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        volunteer = User.objects.create_user(
            email=f"vol_{unique_id}@test.com",
            username=f"vol_{unique_id}",
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        UserProfile.objects.create(
            user=volunteer,
            full_name=volunteer_name,
            phone='5555555555',
            address='789 Volunteer Blvd',
            latitude=40.7505,
            longitude=-73.9934
        )
        
        # Create pickup coordination with the given quantity
        pickup_coordination = PickupCoordination.objects.create(
            match=self.match,
            donor_location={'lat': 40.7128, 'lon': -74.0060},
            receiver_location={'lat': 40.7589, 'lon': -73.9851},
            food_quantity=food_quantity,
            required_pickup_time=timezone.now() + timedelta(hours=2),
            assignment_status='pending'
        )
        
        # Clear any existing notifications
        Notification.objects.all().delete()
        
        # Authenticate as volunteer and accept assignment
        client = APIClient()
        client.force_authenticate(user=volunteer)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': pickup_coordination.pk})
        response = client.post(url)
        
        # Should succeed
        assert response.status_code == status.HTTP_200_OK
        
        # Check pickup coordination record was updated
        pickup_coordination.refresh_from_db()
        assert pickup_coordination.volunteer == volunteer
        assert pickup_coordination.assignment_status == 'accepted'
        assert pickup_coordination.assigned_at is not None
        
        # Check notifications were created for both donor and receiver
        donor_notifications = Notification.objects.filter(
            user=self.donor,
            notification_type='volunteer_assignment'
        )
        receiver_notifications = Notification.objects.filter(
            user=self.receiver,
            notification_type='volunteer_assignment'
        )
        
        assert donor_notifications.exists()
        assert receiver_notifications.exists()
        
        # Check notification content includes volunteer name
        donor_notification = donor_notifications.first()
        receiver_notification = receiver_notifications.first()
        
        assert volunteer_name in donor_notification.message
        assert volunteer_name in receiver_notification.message
    
    @given(
        assignment_status=st.sampled_from(['assigned', 'accepted', 'completed'])
    )
    @settings(max_examples=10, deadline=None)
    def test_property_38_single_volunteer_assignment(self, assignment_status):
        """
        Feature: buffet-management-food-distribution
        Property 38: Single Volunteer Assignment
        
        **Validates: Requirements 9.4**
        
        For any pickup coordination, the system should allow only one volunteer 
        to accept the assignment and reject subsequent acceptance attempts.
        """
        # Create two volunteers with unique identifiers
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        volunteer1 = User.objects.create_user(
            email=f'vol1_{unique_id}@test.com',
            username=f'vol1_{unique_id}',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        volunteer2 = User.objects.create_user(
            email=f'vol2_{unique_id}@test.com',
            username=f'vol2_{unique_id}',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        UserProfile.objects.create(
            user=volunteer1,
            full_name=f'Volunteer 1 {unique_id}',
            phone='5555555555',
            address='789 Volunteer Blvd',
            latitude=40.7505,
            longitude=-73.9934
        )
        
        UserProfile.objects.create(
            user=volunteer2,
            full_name=f'Volunteer 2 {unique_id}',
            phone='6666666666',
            address='321 Helper St',
            latitude=40.7614,
            longitude=-73.9776
        )
        
        # Create pickup coordination
        pickup_coordination = PickupCoordination.objects.create(
            match=self.match,
            donor_location={'lat': 40.7128, 'lon': -74.0060},
            receiver_location={'lat': 40.7589, 'lon': -73.9851},
            food_quantity=5,
            required_pickup_time=timezone.now() + timedelta(hours=2),
            assignment_status='pending'
        )
        
        # If testing non-pending status, set it up
        if assignment_status != 'pending':
            pickup_coordination.volunteer = volunteer1
            pickup_coordination.assignment_status = assignment_status
            pickup_coordination.assigned_at = timezone.now()
            pickup_coordination.save()
        
        # First volunteer tries to accept
        client1 = APIClient()
        client1.force_authenticate(user=volunteer1)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': pickup_coordination.pk})
        response1 = client1.post(url)
        
        if assignment_status == 'pending':
            # Should succeed for pending assignments
            assert response1.status_code == status.HTTP_200_OK
            
            # Second volunteer tries to accept
            client2 = APIClient()
            client2.force_authenticate(user=volunteer2)
            response2 = client2.post(url)
            
            # Should fail with conflict
            assert response2.status_code == status.HTTP_409_CONFLICT
            assert 'already been accepted' in response2.data['message']
            
            # Check final state - only first volunteer assigned
            pickup_coordination.refresh_from_db()
            assert pickup_coordination.volunteer == volunteer1
            assert pickup_coordination.assignment_status == 'accepted'
        else:
            # Should fail for non-pending assignments
            assert response1.status_code == status.HTTP_409_CONFLICT
            assert 'already been accepted' in response1.data['message']
    
    @given(
        user_role=st.sampled_from(['donor', 'receiver', 'admin'])
    )
    @settings(max_examples=10, deadline=None)
    def test_property_volunteer_role_restriction(self, user_role):
        """
        Test that only volunteers can accept assignments
        
        For any user that is not a volunteer, attempting to accept an assignment
        should be rejected with a permission error.
        """
        # Create user with non-volunteer role
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        user = User.objects.create_user(
            email=f'{user_role}_{unique_id}@test.com',
            username=f'{user_role}_{unique_id}',
            password='TestPass123!',
            role=user_role,
            verification_status='approved'
        )
        
        UserProfile.objects.create(
            user=user,
            full_name=f'Test {user_role.title()} {unique_id}',
            phone='1111111111',
            address='123 Test St',
            latitude=40.7128,
            longitude=-74.0060
        )
        
        # Create pickup coordination
        pickup_coordination = PickupCoordination.objects.create(
            match=self.match,
            donor_location={'lat': 40.7128, 'lon': -74.0060},
            receiver_location={'lat': 40.7589, 'lon': -73.9851},
            food_quantity=5,
            required_pickup_time=timezone.now() + timedelta(hours=2),
            assignment_status='pending'
        )
        
        # Try to accept assignment as non-volunteer
        client = APIClient()
        client.force_authenticate(user=user)
        
        url = reverse('volunteer-accept-assignment', kwargs={'pk': pickup_coordination.pk})
        response = client.post(url)
        
        # Should be forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Assignment should remain unchanged
        pickup_coordination.refresh_from_db()
        assert pickup_coordination.volunteer is None
        assert pickup_coordination.assignment_status == 'pending'
    
    @given(
        notification_failure=st.booleans()
    )
    @settings(max_examples=10, deadline=None)
    def test_property_assignment_resilience(self, notification_failure):
        """
        Test that assignment acceptance is resilient to notification failures
        
        For any volunteer assignment acceptance, the core assignment should 
        succeed even if notification delivery fails.
        """
        # Create volunteer
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        volunteer = User.objects.create_user(
            email=f'vol_resilience_{unique_id}@test.com',
            username=f'vol_resilience_{unique_id}',
            password='VolunteerPass123!',
            role='volunteer',
            verification_status='approved'
        )
        
        UserProfile.objects.create(
            user=volunteer,
            full_name=f'Resilient Volunteer {unique_id}',
            phone='5555555555',
            address='789 Volunteer Blvd',
            latitude=40.7505,
            longitude=-73.9934
        )
        
        # Create pickup coordination
        pickup_coordination = PickupCoordination.objects.create(
            match=self.match,
            donor_location={'lat': 40.7128, 'lon': -74.0060},
            receiver_location={'lat': 40.7589, 'lon': -73.9851},
            food_quantity=5,
            required_pickup_time=timezone.now() + timedelta(hours=2),
            assignment_status='pending'
        )
        
        # Mock notification failure if needed
        if notification_failure:
            from unittest.mock import patch
            with patch('volunteers.views.Notification.objects.create', side_effect=Exception("Notification failed")):
                client = APIClient()
                client.force_authenticate(user=volunteer)
                
                url = reverse('volunteer-accept-assignment', kwargs={'pk': pickup_coordination.pk})
                response = client.post(url)
        else:
            client = APIClient()
            client.force_authenticate(user=volunteer)
            
            url = reverse('volunteer-accept-assignment', kwargs={'pk': pickup_coordination.pk})
            response = client.post(url)
        
        # Assignment should succeed regardless of notification failure
        assert response.status_code == status.HTTP_200_OK
        
        # Check assignment was completed
        pickup_coordination.refresh_from_db()
        assert pickup_coordination.volunteer == volunteer
        assert pickup_coordination.assignment_status == 'accepted'
        assert pickup_coordination.assigned_at is not None
        
        # Check match status was updated
        self.match.refresh_from_db()
        assert self.match.status == 'in_progress'