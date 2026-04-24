from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from matching.models import FoodRequest, Match
from food_listings.models import FoodListing
from authentication.models import UserProfile
from safety_analytics.models import Notification

User = get_user_model()


class FoodRequestAPITestCase(TestCase):
    """Test cases for food request API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create donor user
        self.donor = User.objects.create_user(
            username='donor1',
            email='donor@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor',
            organization_name='Test Restaurant'
        )
        self.donor_profile.phone = '1234567890'
        self.donor_profile.address = '123 Donor St'
        self.donor_profile.latitude = 40.7128
        self.donor_profile.longitude = -74.0060
        self.donor_profile.save()
        
        # Create receiver user
        self.receiver = User.objects.create_user(
            username='receiver1',
            email='receiver@test.com',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver',
            dietary_preferences=['vegetarian']
        )
        self.receiver_profile.phone = '0987654321'
        self.receiver_profile.address = '456 Receiver Ave'
        self.receiver_profile.latitude = 40.7589
        self.receiver_profile.longitude = -73.9851
        self.receiver_profile.save()
        
        # Create food listing
        self.listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Vegetarian Curry',
            description='Delicious curry',
            quantity=10,
            unit='servings',
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=6),
            pickup_address='123 Donor St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            is_vegetarian=True,
            status='available',
            available_quantity=10
        )
    
    def test_create_food_request_success(self):
        """Test successful food request creation"""
        self.client.force_authenticate(user=self.receiver)
        
        data = {
            'listing': self.listing.id,
            'requested_quantity': 5,
            'pickup_time_preference': (timezone.now() + timedelta(hours=2)).isoformat(),
            'special_instructions': 'Please call before delivery'
        }
        
        response = self.client.post('/api/food-requests', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FoodRequest.objects.count(), 1)
        
        food_request = FoodRequest.objects.first()
        self.assertEqual(food_request.receiver, self.receiver)
        self.assertEqual(food_request.listing, self.listing)
        self.assertEqual(food_request.requested_quantity, 5)
        self.assertEqual(food_request.status, 'pending')
        
        # Verify notification was sent to donor
        self.assertTrue(
            Notification.objects.filter(
                user=self.donor,
                notification_type='food_request'
            ).exists()
        )
    
    def test_create_food_request_exceeds_available_quantity(self):
        """Test food request with quantity exceeding available quantity"""
        self.client.force_authenticate(user=self.receiver)
        
        data = {
            'listing': self.listing.id,
            'requested_quantity': 15,  # More than available (10)
            'pickup_time_preference': (timezone.now() + timedelta(hours=2)).isoformat()
        }
        
        response = self.client.post('/api/food-requests', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('requested_quantity', str(response.data))
        self.assertEqual(FoodRequest.objects.count(), 0)
    
    def test_create_duplicate_food_request(self):
        """Test prevention of duplicate food requests"""
        self.client.force_authenticate(user=self.receiver)
        
        # Create first request
        FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=5,
            pickup_time_preference=timezone.now() + timedelta(hours=2),
            status='pending'
        )
        
        # Try to create duplicate
        data = {
            'listing': self.listing.id,
            'requested_quantity': 3,
            'pickup_time_preference': (timezone.now() + timedelta(hours=2)).isoformat()
        }
        
        response = self.client.post('/api/food-requests', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('active request', str(response.data))
        self.assertEqual(FoodRequest.objects.count(), 1)
    
    def test_create_food_request_unauthorized_role(self):
        """Test that only receivers can create food requests"""
        self.client.force_authenticate(user=self.donor)
        
        data = {
            'listing': self.listing.id,
            'requested_quantity': 5,
            'pickup_time_preference': (timezone.now() + timedelta(hours=2)).isoformat()
        }
        
        response = self.client.post('/api/food-requests', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_food_request_unavailable_listing(self):
        """Test food request for unavailable listing"""
        self.listing.status = 'reserved'
        self.listing.save()
        
        self.client.force_authenticate(user=self.receiver)
        
        data = {
            'listing': self.listing.id,
            'requested_quantity': 5,
            'pickup_time_preference': (timezone.now() + timedelta(hours=2)).isoformat()
        }
        
        response = self.client.post('/api/food-requests', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available', str(response.data))


class FoodRequestApprovalTestCase(TestCase):
    """Test cases for food request approval"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.donor = User.objects.create_user(
            username='donor1',
            email='donor@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor'
        )
        
        self.receiver = User.objects.create_user(
            username='receiver1',
            email='receiver@test.com',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver'
        )
        self.receiver_profile.address = '456 Receiver Ave'
        self.receiver_profile.latitude = 40.7589
        self.receiver_profile.longitude = -73.9851
        self.receiver_profile.save()
        
        # Create listing
        self.listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Rice',
            description='White rice',
            quantity=20,
            unit='kg',
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=8),
            pickup_address='123 Donor St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            status='available',
            available_quantity=20
        )
        
        # Create food request
        self.food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=10,
            pickup_time_preference=timezone.now() + timedelta(hours=3),
            status='pending'
        )
    
    def test_approve_food_request_success(self):
        """Test successful food request approval"""
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.put(f'/api/food-requests/{self.food_request.id}/approve')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify request status updated
        self.food_request.refresh_from_db()
        self.assertEqual(self.food_request.status, 'approved')
        
        # Verify match created
        self.assertEqual(Match.objects.count(), 1)
        match = Match.objects.first()
        self.assertEqual(match.listing, self.listing)
        self.assertEqual(match.request, self.food_request)
        self.assertEqual(match.donor, self.donor)
        self.assertEqual(match.receiver, self.receiver)
        self.assertEqual(match.matched_quantity, 10)
        self.assertEqual(match.status, 'matched')
        
        # Verify listing quantity reduced
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.available_quantity, 10)
        self.assertEqual(self.listing.status, 'available')
        
        # Verify notification sent to receiver
        self.assertTrue(
            Notification.objects.filter(
                user=self.receiver,
                notification_type='match_created'
            ).exists()
        )
    
    def test_approve_food_request_full_quantity(self):
        """Test approval when requested quantity equals available quantity"""
        self.food_request.requested_quantity = 20
        self.food_request.save()
        
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.put(f'/api/food-requests/{self.food_request.id}/approve')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify listing marked as reserved
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'reserved')
        self.assertEqual(self.listing.available_quantity, 0)
    
    def test_approve_food_request_unauthorized_donor(self):
        """Test that only the listing owner can approve requests"""
        other_donor = User.objects.create_user(
            username='donor2',
            email='donor2@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        
        self.client.force_authenticate(user=other_donor)
        
        response = self.client.put(f'/api/food-requests/{self.food_request.id}/approve')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Match.objects.count(), 0)
    
    def test_approve_already_approved_request(self):
        """Test approval of already approved request"""
        self.food_request.status = 'approved'
        self.food_request.save()
        
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.put(f'/api/food-requests/{self.food_request.id}/approve')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FoodRequestRejectionTestCase(TestCase):
    """Test cases for food request rejection"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.donor = User.objects.create_user(
            username='donor1',
            email='donor@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor'
        )
        
        self.receiver = User.objects.create_user(
            username='receiver1',
            email='receiver@test.com',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver'
        )
        
        # Create listing and request
        self.listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Pasta',
            description='Italian pasta',
            quantity=15,
            unit='servings',
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=5),
            pickup_address='123 Donor St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            status='available',
            available_quantity=15
        )
        
        self.food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=8,
            pickup_time_preference=timezone.now() + timedelta(hours=2),
            status='pending'
        )
    
    def test_reject_food_request_with_reason(self):
        """Test food request rejection with reason"""
        self.client.force_authenticate(user=self.donor)
        
        data = {
            'rejection_reason': 'Already committed to another receiver'
        }
        
        response = self.client.put(
            f'/api/food-requests/{self.food_request.id}/reject',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify request status and reason
        self.food_request.refresh_from_db()
        self.assertEqual(self.food_request.status, 'rejected')
        self.assertEqual(self.food_request.rejection_reason, 'Already committed to another receiver')
        
        # Verify notification sent
        notification = Notification.objects.filter(
            user=self.receiver,
            notification_type='food_request'
        ).first()
        self.assertIsNotNone(notification)
        self.assertIn('rejected', notification.message)
        self.assertIn('Already committed', notification.message)
    
    def test_reject_food_request_without_reason(self):
        """Test food request rejection without reason"""
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.put(f'/api/food-requests/{self.food_request.id}/reject')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.food_request.refresh_from_db()
        self.assertEqual(self.food_request.status, 'rejected')
        self.assertEqual(self.food_request.rejection_reason, '')


class FoodRequestCancellationTestCase(TestCase):
    """Test cases for food request cancellation"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.donor = User.objects.create_user(
            username='donor1',
            email='donor@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor'
        )
        
        self.receiver = User.objects.create_user(
            username='receiver1',
            email='receiver@test.com',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver'
        )
        
        # Create listing
        self.listing = FoodListing.objects.create(
            donor=self.donor,
            food_type='Bread',
            description='Fresh bread',
            quantity=30,
            unit='servings',
            preparation_time=timezone.now(),
            expiry_time=timezone.now() + timedelta(hours=12),
            pickup_address='123 Donor St',
            pickup_latitude=40.7128,
            pickup_longitude=-74.0060,
            status='available',
            available_quantity=30
        )
    
    def test_cancel_pending_request_by_receiver(self):
        """Test cancellation of pending request by receiver"""
        food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=10,
            pickup_time_preference=timezone.now() + timedelta(hours=3),
            status='pending'
        )
        
        self.client.force_authenticate(user=self.receiver)
        
        response = self.client.delete(f'/api/food-requests/{food_request.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        food_request.refresh_from_db()
        self.assertEqual(food_request.status, 'cancelled')
        
        # Verify donor notified
        self.assertTrue(
            Notification.objects.filter(
                user=self.donor,
                notification_type='cancellation'
            ).exists()
        )
    
    def test_cancel_pending_request_by_donor_fails(self):
        """Test that donor cannot cancel pending request"""
        food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=10,
            pickup_time_preference=timezone.now() + timedelta(hours=3),
            status='pending'
        )
        
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.delete(f'/api/food-requests/{food_request.id}')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cancel_matched_request_with_mutual_agreement(self):
        """Test cancellation of matched request with mutual agreement"""
        food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=10,
            pickup_time_preference=timezone.now() + timedelta(hours=3),
            status='approved'
        )
        
        # Create match
        match = Match.objects.create(
            listing=self.listing,
            request=food_request,
            donor=self.donor,
            receiver=self.receiver,
            matched_quantity=10,
            status='matched'
        )
        
        # Update listing
        self.listing.available_quantity = 20
        self.listing.save()
        
        self.client.force_authenticate(user=self.receiver)
        
        data = {'mutual_agreement': True}
        response = self.client.delete(
            f'/api/food-requests/{food_request.id}',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify cancellation
        food_request.refresh_from_db()
        match.refresh_from_db()
        self.listing.refresh_from_db()
        
        self.assertEqual(food_request.status, 'cancelled')
        self.assertEqual(match.status, 'cancelled')
        self.assertEqual(self.listing.available_quantity, 30)  # Restored
    
    def test_cancel_matched_request_without_mutual_agreement_fails(self):
        """Test that matched request cancellation requires mutual agreement"""
        food_request = FoodRequest.objects.create(
            listing=self.listing,
            receiver=self.receiver,
            requested_quantity=10,
            pickup_time_preference=timezone.now() + timedelta(hours=3),
            status='approved'
        )
        
        Match.objects.create(
            listing=self.listing,
            request=food_request,
            donor=self.donor,
            receiver=self.receiver,
            matched_quantity=10,
            status='matched'
        )
        
        self.client.force_authenticate(user=self.receiver)
        
        response = self.client.delete(f'/api/food-requests/{food_request.id}')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('mutual agreement', str(response.data))


class MatchListAPITestCase(TestCase):
    """Test cases for match listing API"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.donor = User.objects.create_user(
            username='donor1',
            email='donor@test.com',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor'
        )
        
        self.receiver = User.objects.create_user(
            username='receiver1',
            email='receiver@test.com',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver'
        )
        self.receiver_profile.address = '456 Receiver Ave'
        self.receiver_profile.latitude = 40.7589
        self.receiver_profile.longitude = -73.9851
        self.receiver_profile.save()
        
        # Create listings and matches
        for i in range(3):
            listing = FoodListing.objects.create(
                donor=self.donor,
                food_type=f'Food {i}',
                description=f'Description {i}',
                quantity=10,
                unit='servings',
                preparation_time=timezone.now(),
                expiry_time=timezone.now() + timedelta(hours=6),
                pickup_address='123 Donor St',
                pickup_latitude=40.7128,
                pickup_longitude=-74.0060,
                status='reserved',
                available_quantity=0
            )
            
            food_request = FoodRequest.objects.create(
                listing=listing,
                receiver=self.receiver,
                requested_quantity=10,
                pickup_time_preference=timezone.now() + timedelta(hours=2),
                status='approved'
            )
            
            Match.objects.create(
                listing=listing,
                request=food_request,
                donor=self.donor,
                receiver=self.receiver,
                matched_quantity=10,
                status='matched'
            )
    
    def test_list_matches_as_donor(self):
        """Test listing matches as donor"""
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.get('/api/matches')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
    
    def test_list_matches_as_receiver(self):
        """Test listing matches as receiver"""
        self.client.force_authenticate(user=self.receiver)
        
        response = self.client.get('/api/matches')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
    
    def test_list_matches_with_status_filter(self):
        """Test listing matches with status filter"""
        # Update one match to completed
        match = Match.objects.first()
        match.status = 'completed'
        match.save()
        
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.get('/api/matches?status=matched')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_matches_pagination(self):
        """Test match listing pagination"""
        # Create more matches to test pagination
        for i in range(25):
            listing = FoodListing.objects.create(
                donor=self.donor,
                food_type=f'Food Extra {i}',
                description=f'Description {i}',
                quantity=5,
                unit='servings',
                preparation_time=timezone.now(),
                expiry_time=timezone.now() + timedelta(hours=6),
                pickup_address='123 Donor St',
                pickup_latitude=40.7128,
                pickup_longitude=-74.0060,
                status='reserved',
                available_quantity=0
            )
            
            food_request = FoodRequest.objects.create(
                listing=listing,
                receiver=self.receiver,
                requested_quantity=5,
                pickup_time_preference=timezone.now() + timedelta(hours=2),
                status='approved'
            )
            
            Match.objects.create(
                listing=listing,
                request=food_request,
                donor=self.donor,
                receiver=self.receiver,
                matched_quantity=5,
                status='matched'
            )
        
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.get('/api/matches')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)  # Default page size
        self.assertIsNotNone(response.data.get('next'))
