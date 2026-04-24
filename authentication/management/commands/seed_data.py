"""
Management command to seed the database with demo users and food listings.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear   # wipe existing seed data first
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with demo admin, donor, receiver, and volunteer accounts plus food listings'

    # ── Seed credentials (printed at the end) ──────────────────────────────────
    USERS = [
        {
            'email': 'admin@foodshare.com',
            'username': 'admin',
            'password': 'Admin@1234',
            'role': 'admin',
            'full_name': 'System Admin',
            'phone': '+1-555-000-0001',
            'address': '1 Admin Plaza, Springfield, IL 62701',
            'verification_status': 'approved',
            'is_staff': True,
            'is_superuser': True,
        },
        {
            'email': 'donor@foodshare.com',
            'username': 'donor1',
            'password': 'Donor@1234',
            'role': 'donor',
            'full_name': 'Green Leaf Restaurant',
            'phone': '+1-555-100-0001',
            'address': '42 Oak Street, Chicago, IL 60601',
            'organization_name': 'Green Leaf Restaurant',
            'food_types': ['Indian', 'Continental', 'Desserts'],
            'operating_hours': {
                'monday': '09:00-21:00',
                'tuesday': '09:00-21:00',
                'wednesday': '09:00-21:00',
                'thursday': '09:00-21:00',
                'friday': '09:00-22:00',
                'saturday': '10:00-22:00',
                'sunday': '10:00-20:00',
            },
            'latitude': 41.8781,
            'longitude': -87.6298,
            'verification_status': 'approved',
        },
        {
            'email': 'donor2@foodshare.com',
            'username': 'donor2',
            'password': 'Donor@1234',
            'role': 'donor',
            'full_name': 'Sunrise Banquet Hall',
            'phone': '+1-555-100-0002',
            'address': '88 Maple Ave, Chicago, IL 60602',
            'organization_name': 'Sunrise Banquet Hall',
            'food_types': ['Buffet', 'Catering', 'Beverages'],
            'operating_hours': {
                'friday': '16:00-23:00',
                'saturday': '12:00-23:00',
                'sunday': '12:00-20:00',
            },
            'latitude': 41.8850,
            'longitude': -87.6350,
            'verification_status': 'approved',
        },
        {
            'email': 'receiver@foodshare.com',
            'username': 'receiver1',
            'password': 'Receiver@1234',
            'role': 'receiver',
            'full_name': 'Hope Shelter',
            'phone': '+1-555-200-0001',
            'address': '15 Elm Road, Chicago, IL 60603',
            'dietary_preferences': ['Vegetarian', 'Halal'],
            'allergies': ['Peanuts', 'Shellfish'],
            'latitude': 41.8700,
            'longitude': -87.6200,
            'verification_status': 'approved',
        },
        {
            'email': 'receiver2@foodshare.com',
            'username': 'receiver2',
            'password': 'Receiver@1234',
            'role': 'receiver',
            'full_name': 'Bright Future Orphanage',
            'phone': '+1-555-200-0002',
            'address': '77 Pine Street, Chicago, IL 60604',
            'dietary_preferences': ['Vegan'],
            'allergies': ['Dairy', 'Gluten'],
            'latitude': 41.8820,
            'longitude': -87.6400,
            'verification_status': 'approved',
        },
        {
            'email': 'volunteer@foodshare.com',
            'username': 'volunteer1',
            'password': 'Volunteer@1234',
            'role': 'volunteer',
            'full_name': 'Alex Johnson',
            'phone': '+1-555-300-0001',
            'address': '33 Cedar Lane, Chicago, IL 60605',
            'available_time_slots': ['Weekday Mornings', 'Weekend Afternoons'],
            'transportation_capacity': 50,
            'latitude': 41.8760,
            'longitude': -87.6320,
            'verification_status': 'approved',
        },
        {
            'email': 'pending@foodshare.com',
            'username': 'pending1',
            'password': 'Pending@1234',
            'role': 'donor',
            'full_name': 'New Donor Pending',
            'phone': '+1-555-400-0001',
            'address': '99 Birch Blvd, Chicago, IL 60606',
            'organization_name': 'Pending Bistro',
            'food_types': ['Fast Food'],
            'operating_hours': {},
            'latitude': 41.8900,
            'longitude': -87.6450,
            'verification_status': 'pending',
        },
    ]

    LISTINGS = [
        {
            'donor_email': 'donor@foodshare.com',
            'food_type': 'Butter Chicken & Naan',
            'description': 'Freshly prepared butter chicken with garlic naan. Mild spice level, perfect for families.',
            'quantity': 40,
            'unit': 'servings',
            'hours_until_expiry': 6,
            'hours_prepared_ago': 1,
            'pickup_address': '42 Oak Street, Chicago, IL 60601',
            'pickup_latitude': 41.8781,
            'pickup_longitude': -87.6298,
            'is_vegetarian': False,
            'is_vegan': False,
            'is_gluten_free': False,
            'allergen_info': ['Dairy', 'Gluten'],
        },
        {
            'donor_email': 'donor@foodshare.com',
            'food_type': 'Vegetable Biryani',
            'description': 'Aromatic basmati rice cooked with seasonal vegetables and whole spices.',
            'quantity': 30,
            'unit': 'servings',
            'hours_until_expiry': 8,
            'hours_prepared_ago': 2,
            'pickup_address': '42 Oak Street, Chicago, IL 60601',
            'pickup_latitude': 41.8781,
            'pickup_longitude': -87.6298,
            'is_vegetarian': True,
            'is_vegan': True,
            'is_gluten_free': True,
            'allergen_info': [],
        },
        {
            'donor_email': 'donor@foodshare.com',
            'food_type': 'Chocolate Lava Cake',
            'description': 'Warm chocolate lava cakes with vanilla ice cream. Individually portioned.',
            'quantity': 25,
            'unit': 'servings',
            'hours_until_expiry': 4,
            'hours_prepared_ago': 1,
            'pickup_address': '42 Oak Street, Chicago, IL 60601',
            'pickup_latitude': 41.8781,
            'pickup_longitude': -87.6298,
            'is_vegetarian': True,
            'is_vegan': False,
            'is_gluten_free': False,
            'allergen_info': ['Dairy', 'Eggs', 'Gluten'],
        },
        {
            'donor_email': 'donor2@foodshare.com',
            'food_type': 'Wedding Buffet Leftovers',
            'description': 'Mixed buffet from a wedding event: rice, curries, salads, and breads. Assorted items.',
            'quantity': 100,
            'unit': 'servings',
            'hours_until_expiry': 5,
            'hours_prepared_ago': 3,
            'pickup_address': '88 Maple Ave, Chicago, IL 60602',
            'pickup_latitude': 41.8850,
            'pickup_longitude': -87.6350,
            'is_vegetarian': False,
            'is_vegan': False,
            'is_gluten_free': False,
            'allergen_info': ['Dairy', 'Gluten', 'Eggs'],
        },
        {
            'donor_email': 'donor2@foodshare.com',
            'food_type': 'Fresh Fruit Platter',
            'description': 'Assorted seasonal fruits: watermelon, mango, pineapple, grapes, and berries.',
            'quantity': 20,
            'unit': 'kg',
            'hours_until_expiry': 12,
            'hours_prepared_ago': 1,
            'pickup_address': '88 Maple Ave, Chicago, IL 60602',
            'pickup_latitude': 41.8850,
            'pickup_longitude': -87.6350,
            'is_vegetarian': True,
            'is_vegan': True,
            'is_gluten_free': True,
            'allergen_info': [],
        },
        {
            'donor_email': 'donor2@foodshare.com',
            'food_type': 'Assorted Beverages',
            'description': 'Unopened juice boxes, water bottles, and soft drinks from the event.',
            'quantity': 60,
            'unit': 'servings',
            'hours_until_expiry': 48,
            'hours_prepared_ago': 0,
            'pickup_address': '88 Maple Ave, Chicago, IL 60602',
            'pickup_latitude': 41.8850,
            'pickup_longitude': -87.6350,
            'is_vegetarian': True,
            'is_vegan': True,
            'is_gluten_free': True,
            'allergen_info': [],
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing seed data before creating new records',
        )

    def handle(self, *args, **options):
        from authentication.models import User, UserProfile
        from food_listings.models import FoodListing

        if options['clear']:
            self.stdout.write('Clearing existing seed data...')
            seed_emails = [u['email'] for u in self.USERS]
            User.objects.filter(email__in=seed_emails).delete()
            self.stdout.write(self.style.WARNING('  Deleted seed users and their related data.'))

        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seeding Food Share Database ===\n'))

        created_users = {}

        # ── Create users ────────────────────────────────────────────────────────
        for data in self.USERS:
            email = data['email']
            try:
                user = User.objects.get(email=email)
                created = False
            except User.DoesNotExist:
                # Make username unique if it already exists (e.g. from a previous partial run)
                username = data['username']
                if User.objects.filter(username=username).exists():
                    username = f"{username}_seed"
                user = User(
                    email=email,
                    username=username,
                    role=data['role'],
                    verification_status=data['verification_status'],
                    is_staff=data.get('is_staff', False),
                    is_superuser=data.get('is_superuser', False),
                    is_active=True,
                )
                user.set_password(data['password'])
                user.save()
                created = True

            # Create / update profile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.full_name = data['full_name']
            profile.phone = data.get('phone')
            profile.address = data.get('address')
            profile.latitude = data.get('latitude')
            profile.longitude = data.get('longitude')

            # Role-specific profile fields
            if data['role'] == 'donor':
                profile.organization_name = data.get('organization_name', '')
                profile.food_types = data.get('food_types', [])
                profile.operating_hours = data.get('operating_hours', {})
            elif data['role'] == 'receiver':
                profile.dietary_preferences = data.get('dietary_preferences', [])
                profile.allergies = data.get('allergies', [])
            elif data['role'] == 'volunteer':
                profile.available_time_slots = data.get('available_time_slots', [])
                profile.transportation_capacity = data.get('transportation_capacity')

            profile.save()
            created_users[email] = user

            status = self.style.SUCCESS('created') if created else self.style.WARNING('already exists')
            self.stdout.write(f'  [{data["role"].upper():9}] {email}  ({status})')

        # ── Create food listings ─────────────────────────────────────────────────
        self.stdout.write('')
        now = timezone.now()
        listings_created = 0

        for item in self.LISTINGS:
            donor = created_users.get(item['donor_email'])
            if not donor:
                continue

            prep_time = now - timedelta(hours=item['hours_prepared_ago'])
            expiry_time = now + timedelta(hours=item['hours_until_expiry'])

            listing, created = FoodListing.objects.get_or_create(
                donor=donor,
                food_type=item['food_type'],
                defaults={
                    'description': item['description'],
                    'quantity': item['quantity'],
                    'unit': item['unit'],
                    'preparation_time': prep_time,
                    'expiry_time': expiry_time,
                    'pickup_address': item['pickup_address'],
                    'pickup_latitude': item['pickup_latitude'],
                    'pickup_longitude': item['pickup_longitude'],
                    'is_vegetarian': item['is_vegetarian'],
                    'is_vegan': item['is_vegan'],
                    'is_gluten_free': item['is_gluten_free'],
                    'allergen_info': item['allergen_info'],
                    'status': 'available',
                    'available_quantity': item['quantity'],
                }
            )
            if created:
                listings_created += 1
                self.stdout.write(f'  [LISTING] {item["food_type"]} ({item["quantity"]} {item["unit"]})  ({self.style.SUCCESS("created")})')
            else:
                self.stdout.write(f'  [LISTING] {item["food_type"]}  ({self.style.WARNING("already exists")})')

        # ── Summary ──────────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Seed Complete ===\n'))
        self.stdout.write(self.style.SUCCESS('LOGIN CREDENTIALS'))
        self.stdout.write('─' * 52)
        self.stdout.write(f'  {"Role":<12} {"Email":<30} {"Password"}')
        self.stdout.write('─' * 52)
        for u in self.USERS:
            self.stdout.write(f'  {u["role"].upper():<12} {u["email"]:<30} {u["password"]}')
        self.stdout.write('─' * 52)
        self.stdout.write(f'\n  {listings_created} food listing(s) created.\n')
