from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import json

from food_listings.models import FoodListing
from safety_analytics.models import SearchPreference

User = get_user_model()


class FoodListingAPITestCase(APITestCase):
    """Test cases for Food Listing API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.donor = User.objects.create_user(
            email='donor@test.com',
            username='donor',
            password='testpass123',
            role='donor',
            verification_status='approved'
        )
        
        self.receiver = User.objects.create_user(
            email='receiver@test.com',
            username='receiver',
            password='testpass123',
            role='receiver',
            verification_status='approved'
        )
        
        # Create user profiles
        from authentication.models import UserProfile
        self.donor_profile = UserProfile.objects.create(
            user=self.donor,
            full_name='Test Donor',
            organization_name='Test Restaurant'
        )
        self.donor_profile.latitude = 40.7128
        self.donor_profile.longitude = -74.0060
        self.donor_profile.save()
        
        self.receiver_profile = UserProfile.objects.create(
            user=self.receiver,
            full_name='Test Receiver'
        )
        self.receiver_profile.latitude = 40.7589
        self.receiver_profile.longitude = -73.9851
        self.receiver_profile.save()
        
        # Sample food listing data
        self.listing_data = {
            'food_type': 'Vegetarian Curry',
            'description': 'Delicious vegetarian curry with rice',
            'quantity': 10,
            'unit': 'servings',
            'preparation_time': timezone.now().isoformat(),
            'expiry_time': (timezone.now() + timedelta(hours=6)).isoformat(),
            'pickup_address': '123 Test Street, New York, NY',
            'pickup_latitude': 40.7128,
            'pickup_longitude': -74.0060,
            'is_vegetarian': True,
            'is_vegan': False,
            'is_gluten_free': False,
            'allergen_info': ['nuts'],
            'images': ['http://example.com/image1.jpg']
        }
    
    def test_create_food_listing_as_donor(self):
        """Test creating food listing as donor"""
        self.client.force_authenticate(user=self.donor)
        
        response = self.client.post(
            reverse('food-listing-create'),
            self.listing_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FoodListing.objects.count(), 1)
        
        listing = FoodListing.objects.first()
        self.assertEqual(listing.donor, self.donor)
        self.assertEqual(listing.food_type, 'Vegetarian Curry')
        self.assertTrue(listing.freshness_score > 0)
    
    def test_create_food_listing_as_receiver_fails(self):
        """Test that receivers cannot create food listings"""
        self.client.force_authenticate(user=self.receiver)
        
        response = self.client.post(
            reverse('food-listing-create'),
            self.listing_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_browse_food_listings_as_receiver(self):
        """Test browsing food listings as receiver"""
        # Create a food listing
        self.client.force_authenticate(user=self.donor)
        self.client.post(reverse('food-listing-create'), self.listing_data, format='json')
        
        # Browse as receiver
        self.client.force_authenticate(user=self.receiver)
        response = self.client.get(reverse('food-listing-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        listing = response.data['results'][0]
        self.assertIn('distance', listing)
        self.assertIn('expiry_countdown', listing)
    
    def test_food_listing_filtering(self):
        """Test filtering food listings"""
        # Create multiple listings
        self.client.force_authenticate(user=self.donor)
        
        # Vegetarian listing
        veg_data = self.listing_data.copy()
        veg_data['food_type'] = 'Vegetarian Pasta'
        veg_data['is_vegetarian'] = True
        self.client.post(reverse('food-listing-create'), veg_data, format='json')
        
        # Non-vegetarian listing
        non_veg_data = self.listing_data.copy()
        non_veg_data['food_type'] = 'Chicken Curry'
        non_veg_data['is_vegetarian'] = False
        self.client.post(reverse('food-listing-create'), non_veg_data, format='json')
        
        # Test filtering
        self.client.force_authenticate(user=self.receiver)
        
        # Filter by vegetarian
        response = self.client.get(reverse('food-listing-list') + '?vegetarian=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertTrue(response.data['results'][0]['is_vegetarian'])
        
        # Filter by food type
        response = self.client.get(reverse('food-listing-list') + '?food_type=pasta')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Pasta', response.data['results'][0]['food_type'])
    
    def test_compare_food_listings(self):
        """Test comparing food listings"""
        # Create multiple listings
        self.client.force_authenticate(user=self.donor)
        
        listing1_data = self.listing_data.copy()
        listing1_data['food_type'] = 'Pasta'
        response1 = self.client.post(reverse('food-listing-create'), listing1_data, format='json')
        listing1_id = response1.data['id']
        
        listing2_data = self.listing_data.copy()
        listing2_data['food_type'] = 'Pizza'
        listing2_data['quantity'] = 5
        response2 = self.client.post(reverse('food-listing-create'), listing2_data, format='json')
        listing2_id = response2.data['id']
        
        # Compare as receiver
        self.client.force_authenticate(user=self.receiver)
        
        compare_data = {
            'listing_ids': [listing1_id, listing2_id]
        }
        
        response = self.client.post(
            reverse('food-listing-compare'),
            compare_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['listings']), 2)
        self.assertIn('differences', response.data)
        
        # Check that differences are identified
        differences = response.data['differences']
        food_type_diff = next((d for d in differences if d['field'] == 'food_type'), None)
        self.assertIsNotNone(food_type_diff)
    
    def test_compare_too_many_listings_fails(self):
        """Test that comparing more than 4 listings fails"""
        self.client.force_authenticate(user=self.receiver)
        
        compare_data = {
            'listing_ids': [1, 2, 3, 4, 5]  # 5 listings
        }
        
        response = self.client.post(
            reverse('food-listing-compare'),
            compare_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Maximum 4 listings', response.data['error'])
    
    def test_search_preferences(self):
        """Test search preferences functionality"""
        self.client.force_authenticate(user=self.receiver)
        
        # Get initial preferences (should be empty)
        response = self.client.get(reverse('search-preferences'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filters'], {})
        self.assertEqual(response.data['recent_searches'], [])
        
        # Update preferences
        preferences_data = {
            'filters': {
                'food_type': 'pasta',
                'vegetarian': True,
                'max_distance': 10
            },
            'recent_searches': ['pasta', 'pizza']
        }
        
        response = self.client.put(
            reverse('search-preferences'),
            preferences_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filters']['food_type'], 'pasta')
        self.assertEqual(len(response.data['recent_searches']), 2)
    
    def test_clear_search_preferences(self):
        """Test clearing search preferences"""
        self.client.force_authenticate(user=self.receiver)
        
        # Set some preferences first
        SearchPreference.objects.create(
            user=self.receiver,
            filters={'food_type': 'pasta'},
            recent_searches=['pasta', 'pizza']
        )
        
        # Clear preferences
        response = self.client.put(reverse('clear-search-preferences'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify they're cleared
        preference = SearchPreference.objects.get(user=self.receiver)
        self.assertEqual(preference.filters, {})
        self.assertEqual(preference.recent_searches, [])
    
    def test_update_listing_before_match(self):
        """Test updating listing before match is created"""
        # Create listing
        self.client.force_authenticate(user=self.donor)
        response = self.client.post(reverse('food-listing-create'), self.listing_data, format='json')
        listing_id = response.data['id']
        
        # Update listing
        update_data = {
            'description': 'Updated description'
        }
        
        response = self.client.patch(
            reverse('food-listing-update', kwargs={'pk': listing_id}),
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'Updated description')
    
    def test_cancel_listing(self):
        """Test cancelling a food listing"""
        # Create listing
        self.client.force_authenticate(user=self.donor)
        response = self.client.post(reverse('food-listing-create'), self.listing_data, format='json')
        listing_id = response.data['id']
        
        # Cancel listing
        cancel_data = {
            'reason': 'No longer available'
        }
        
        response = self.client.delete(
            reverse('food-listing-cancel', kwargs={'pk': listing_id}),
            cancel_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify listing is cancelled
        listing = FoodListing.objects.get(id=listing_id)
        self.assertEqual(listing.status, 'cancelled')