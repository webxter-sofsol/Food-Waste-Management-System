from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from food_listings.models import FoodListing
from authentication.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Test food listing API by creating sample data'
    
    def handle(self, *args, **options):
        """Create sample data for testing food listing API"""
        
        # Create test users if they don't exist
        donor, created = User.objects.get_or_create(
            email='testdonor@example.com',
            defaults={
                'username': 'testdonor',
                'role': 'donor',
                'verification_status': 'approved'
            }
        )
        if created:
            donor.set_password('testpass123')
            donor.save()
            self.stdout.write(f'Created donor user: {donor.email}')
        
        receiver, created = User.objects.get_or_create(
            email='testreceiver@example.com',
            defaults={
                'username': 'testreceiver',
                'role': 'receiver',
                'verification_status': 'approved'
            }
        )
        if created:
            receiver.set_password('testpass123')
            receiver.save()
            self.stdout.write(f'Created receiver user: {receiver.email}')
        
        # Create user profiles
        donor_profile, created = UserProfile.objects.get_or_create(
            user=donor,
            defaults={
                'full_name': 'Test Donor Restaurant',
                'organization_name': 'Test Restaurant'
            }
        )
        if created:
            donor_profile.phone = '+1234567890'
            donor_profile.address = '123 Restaurant St, New York, NY'
            donor_profile.latitude = 40.7128
            donor_profile.longitude = -74.0060
            donor_profile.save()
            self.stdout.write(f'Created donor profile for: {donor.email}')
        
        receiver_profile, created = UserProfile.objects.get_or_create(
            user=receiver,
            defaults={
                'full_name': 'Test Receiver Organization'
            }
        )
        if created:
            receiver_profile.phone = '+1234567891'
            receiver_profile.address = '456 Shelter Ave, New York, NY'
            receiver_profile.latitude = 40.7589
            receiver_profile.longitude = -73.9851
            receiver_profile.dietary_preferences = ['vegetarian', 'gluten_free']
            receiver_profile.allergies = ['nuts', 'dairy']
            receiver_profile.save()
            self.stdout.write(f'Created receiver profile for: {receiver.email}')
        
        # Create sample food listings
        sample_listings = [
            {
                'food_type': 'Vegetarian Pasta',
                'description': 'Fresh vegetarian pasta with tomato sauce and vegetables',
                'quantity': 15,
                'unit': 'servings',
                'preparation_time': timezone.now() - timedelta(hours=1),
                'expiry_time': timezone.now() + timedelta(hours=5),
                'pickup_address': '123 Restaurant St, New York, NY',
                'pickup_latitude': 40.7128,
                'pickup_longitude': -74.0060,
                'is_vegetarian': True,
                'is_vegan': False,
                'is_gluten_free': False,
                'allergen_info': ['gluten'],
                'images': ['https://example.com/pasta1.jpg', 'https://example.com/pasta2.jpg']
            },
            {
                'food_type': 'Vegan Curry',
                'description': 'Delicious vegan curry with rice and vegetables',
                'quantity': 20,
                'unit': 'servings',
                'preparation_time': timezone.now() - timedelta(minutes=30),
                'expiry_time': timezone.now() + timedelta(hours=8),
                'pickup_address': '123 Restaurant St, New York, NY',
                'pickup_latitude': 40.7128,
                'pickup_longitude': -74.0060,
                'is_vegetarian': True,
                'is_vegan': True,
                'is_gluten_free': True,
                'allergen_info': [],
                'images': ['https://example.com/curry1.jpg']
            },
            {
                'food_type': 'Chicken Sandwiches',
                'description': 'Grilled chicken sandwiches with fresh vegetables',
                'quantity': 10,
                'unit': 'servings',
                'preparation_time': timezone.now() - timedelta(hours=2),
                'expiry_time': timezone.now() + timedelta(hours=3),
                'pickup_address': '123 Restaurant St, New York, NY',
                'pickup_latitude': 40.7128,
                'pickup_longitude': -74.0060,
                'is_vegetarian': False,
                'is_vegan': False,
                'is_gluten_free': False,
                'allergen_info': ['gluten', 'dairy'],
                'images': ['https://example.com/sandwich1.jpg']
            }
        ]
        
        created_count = 0
        for listing_data in sample_listings:
            listing, created = FoodListing.objects.get_or_create(
                donor=donor,
                food_type=listing_data['food_type'],
                defaults=listing_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'Created food listing: {listing.food_type}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} food listings. '
                f'Total listings: {FoodListing.objects.count()}'
            )
        )
        
        # Display API endpoints for testing
        self.stdout.write('\n' + '='*50)
        self.stdout.write('API ENDPOINTS FOR TESTING:')
        self.stdout.write('='*50)
        self.stdout.write('POST /api/food-listings/ - Create food listing (donor only)')
        self.stdout.write('GET /api/food-listings/browse/ - Browse listings (receiver only)')
        self.stdout.write('GET /api/food-listings/<id>/ - Get listing details')
        self.stdout.write('PUT /api/food-listings/<id>/update/ - Update listing (donor only)')
        self.stdout.write('DELETE /api/food-listings/<id>/cancel/ - Cancel listing (donor only)')
        self.stdout.write('POST /api/food-listings/compare/ - Compare listings (receiver only)')
        self.stdout.write('GET /api/food-listings/search-preferences/ - Get search preferences (receiver only)')
        self.stdout.write('PUT /api/food-listings/search-preferences/ - Update search preferences (receiver only)')
        self.stdout.write('PUT /api/food-listings/search-preferences/clear/ - Clear preferences (receiver only)')
        
        self.stdout.write('\nTEST USERS:')
        self.stdout.write(f'Donor: {donor.email} / testpass123')
        self.stdout.write(f'Receiver: {receiver.email} / testpass123')
        
        self.stdout.write('\nSAMPLE FILTER PARAMETERS:')
        self.stdout.write('?vegetarian=true - Filter vegetarian food')
        self.stdout.write('?vegan=true - Filter vegan food')
        self.stdout.write('?gluten_free=true - Filter gluten-free food')
        self.stdout.write('?food_type=pasta - Filter by food type')
        self.stdout.write('?max_distance=10 - Filter by distance (km)')
        self.stdout.write('?expiry_hours=6 - Filter by expiry time')
        self.stdout.write('?sort_by=freshness_score&sort_order=desc - Sort by freshness')
        self.stdout.write('?sort_by=quantity&sort_order=asc - Sort by quantity')