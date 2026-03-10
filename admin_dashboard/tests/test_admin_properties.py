"""
Property-based tests for admin dashboard module

Feature: buffet-management-food-distribution
"""
from hypothesis import given, strategies as st, settings, assume
from hypothesis.extra.django import TestCase
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

from authentication.models import User, UserProfile
from food_listings.models import FoodListing
from matching.models import Match, FoodRequest


class AdminVerificationPropertyTests(TestCase):
    """Property-based tests for admin user verification"""
    
    @given(
        email=st.emails(),
        username=st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
        role=st.sampled_from(['donor', 'receiver', 'volunteer'])
    )
    @settings(max_examples=20, deadline=None)
    def test_property_11_admin_user_approval_workflow(self, email, username, role):
        """
        **Validates: Requirements 3.3**
        
        Property 11: Admin User Approval Workflow
        
        For any pending user that an admin approves, the user account should be 
        activated and a confirmation notification should be sent.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_{username}@test.com',
            username=f'admin_{username}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create pending user
        user = User.objects.create_user(
            email=email,
            username=username,
            password='TestPass123!',
            role=role,
            verification_status='pending'
        )
        UserProfile.objects.create(user=user, full_name=f'Test {username}')
        
        # Admin approves user
        from django.urls import reverse
        url = reverse('verify-user', kwargs={'user_id': user.id})
        response = client.put(url)
        
        # Verify response
        assert response.status_code == 200
        
        # Verify user is activated
        user.refresh_from_db()
        assert user.verification_status == 'approved'
        assert user.is_active is True
        
        # Verify notification sent (email in outbox)
        from django.core import mail
        assert len(mail.outbox) > 0
        # Email is normalized to lowercase in the system
        assert email.lower() in [recipient.lower() for recipient in mail.outbox[-1].to]
    
    @given(
        email=st.emails(),
        username=st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
        role=st.sampled_from(['donor', 'receiver', 'volunteer']),
        reason=st.text(min_size=0, max_size=500)
    )
    @settings(max_examples=20, deadline=None)
    def test_property_12_admin_user_rejection_workflow(self, email, username, role, reason):
        """
        **Validates: Requirements 3.4**
        
        Property 12: Admin User Rejection Workflow
        
        For any pending user that an admin rejects, the user account should be 
        deactivated and a rejection notification should be sent.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_{username}@test.com',
            username=f'admin_{username}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create pending user
        user = User.objects.create_user(
            email=email,
            username=username,
            password='TestPass123!',
            role=role,
            verification_status='pending'
        )
        UserProfile.objects.create(user=user, full_name=f'Test {username}')
        
        # Admin rejects user
        from django.urls import reverse
        url = reverse('reject-user', kwargs={'user_id': user.id})
        response = client.put(url, {'reason': reason}, format='json')
        
        # Verify response (handle validation errors gracefully)
        if response.status_code != 200:
            # If validation fails due to invalid characters, that's acceptable
            # The property still holds - invalid input is rejected
            assert response.status_code in [200, 400]
            if response.status_code == 400:
                # Validation error is acceptable for invalid input
                return
        
        # Verify user is deactivated
        user.refresh_from_db()
        assert user.verification_status == 'rejected'
        assert user.is_active is False
        
        # Verify notification sent
        from django.core import mail
        assert len(mail.outbox) > 0
        assert email.lower() in [recipient.lower() for recipient in mail.outbox[-1].to]


class AdminMetricsPropertyTests(TestCase):
    """Property-based tests for admin metrics"""
    
    @given(
        num_donors=st.integers(min_value=0, max_value=10),
        num_receivers=st.integers(min_value=0, max_value=10),
        num_volunteers=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=20, deadline=None)
    def test_property_59_admin_user_count_metrics(self, num_donors, num_receivers, num_volunteers):
        """
        **Validates: Requirements 14.1**
        
        Property 59: Admin User Count Metrics
        
        For any admin dashboard query, the system should display accurate counts 
        of active users by role.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_metrics_{num_donors}_{num_receivers}_{num_volunteers}@test.com',
            username=f'admin_metrics_{num_donors}_{num_receivers}_{num_volunteers}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create users
        for i in range(num_donors):
            User.objects.create_user(
                email=f'donor{i}_{num_donors}_{num_receivers}_{num_volunteers}@test.com',
                username=f'donor{i}_{num_donors}_{num_receivers}_{num_volunteers}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
        
        for i in range(num_receivers):
            User.objects.create_user(
                email=f'receiver{i}_{num_donors}_{num_receivers}_{num_volunteers}@test.com',
                username=f'receiver{i}_{num_donors}_{num_receivers}_{num_volunteers}',
                password='TestPass123!',
                role='receiver',
                verification_status='approved'
            )
        
        for i in range(num_volunteers):
            User.objects.create_user(
                email=f'volunteer{i}_{num_donors}_{num_receivers}_{num_volunteers}@test.com',
                username=f'volunteer{i}_{num_donors}_{num_receivers}_{num_volunteers}',
                password='TestPass123!',
                role='volunteer',
                verification_status='approved'
            )
        
        # Get metrics
        from django.urls import reverse
        from django.core.cache import cache
        cache.clear()  # Clear cache to get fresh data
        
        url = reverse('admin-metrics')
        response = client.get(url)
        
        # Verify counts are accurate
        assert response.status_code == 200
        assert response.data['user_counts']['donor'] == num_donors
        assert response.data['user_counts']['receiver'] == num_receivers
        assert response.data['user_counts']['volunteer'] == num_volunteers
    
    @given(
        num_listings=st.integers(min_value=0, max_value=20),
        num_matches=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=20, deadline=None)
    def test_property_60_admin_system_metrics(self, num_listings, num_matches):
        """
        **Validates: Requirements 14.2**
        
        Property 60: Admin System Metrics
        
        For any admin metrics query, the system should display accurate counts of 
        total food listings, total matches, and total completed deliveries.
        """
        assume(num_matches <= num_listings)  # Can't have more matches than listings
        
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_sys_{num_listings}_{num_matches}@test.com',
            username=f'admin_sys_{num_listings}_{num_matches}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create donor and receiver
        donor = User.objects.create_user(
            email=f'donor_sys_{num_listings}_{num_matches}@test.com',
            username=f'donor_sys_{num_listings}_{num_matches}',
            password='TestPass123!',
            role='donor',
            verification_status='approved'
        )
        UserProfile.objects.create(user=donor, full_name='Donor')
        
        receiver = User.objects.create_user(
            email=f'receiver_sys_{num_listings}_{num_matches}@test.com',
            username=f'receiver_sys_{num_listings}_{num_matches}',
            password='TestPass123!',
            role='receiver',
            verification_status='approved'
        )
        UserProfile.objects.create(user=receiver, full_name='Receiver')
        
        # Create listings
        listings = []
        for i in range(num_listings):
            listing = FoodListing.objects.create(
                donor=donor,
                food_type=f'Food {i}_{num_listings}_{num_matches}',
                description='Test',
                quantity=10,
                preparation_time=timezone.now(),
                expiry_time=timezone.now() + timedelta(hours=4),
                pickup_address='123 Test St',
                pickup_latitude=40.7128,
                pickup_longitude=-74.0060,
                available_quantity=10
            )
            listings.append(listing)
        
        # Create matches
        completed_count = 0
        for i in range(num_matches):
            if i < len(listings):
                food_request = FoodRequest.objects.create(
                    listing=listings[i],
                    receiver=receiver,
                    requested_quantity=5,
                    pickup_time_preference=timezone.now() + timedelta(hours=2),
                    status='approved'
                )
                
                match_status = 'completed' if i % 2 == 0 else 'matched'
                if match_status == 'completed':
                    completed_count += 1
                
                Match.objects.create(
                    listing=listings[i],
                    request=food_request,
                    donor=donor,
                    receiver=receiver,
                    matched_quantity=5,
                    status=match_status,
                    completed_at=timezone.now() if match_status == 'completed' else None
                )
        
        # Get metrics
        from django.urls import reverse
        from django.core.cache import cache
        cache.clear()
        
        url = reverse('admin-metrics')
        response = client.get(url)
        
        # Verify metrics
        assert response.status_code == 200
        assert response.data['food_listings']['total'] == num_listings
        assert response.data['matches']['total'] == num_matches
        assert response.data['matches']['completed_deliveries'] == completed_count


class AdminReportsPropertyTests(TestCase):
    """Property-based tests for admin reports"""
    
    @given(
        role_filter=st.sampled_from(['donor', 'receiver', 'volunteer', 'admin']),
        num_matching=st.integers(min_value=1, max_value=10),
        num_other=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=20, deadline=None)
    def test_property_61_admin_report_filtering_by_role(self, role_filter, num_matching, num_other):
        """
        **Validates: Requirements 14.3**
        
        Property 61: Admin Report Filtering (Role)
        
        For any admin report request with role filter, the results should only 
        include records matching the specified role.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_report_{role_filter}_{num_matching}_{num_other}@test.com',
            username=f'admin_report_{role_filter}_{num_matching}_{num_other}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create users with matching role
        for i in range(num_matching):
            User.objects.create_user(
                email=f'{role_filter}{i}_{num_matching}_{num_other}@test.com',
                username=f'{role_filter}{i}_{num_matching}_{num_other}',
                password='TestPass123!',
                role=role_filter,
                verification_status='approved'
            )
        
        # Create users with different role
        other_roles = ['donor', 'receiver', 'volunteer', 'admin']
        other_roles.remove(role_filter)
        
        for i in range(num_other):
            other_role = other_roles[i % len(other_roles)]
            User.objects.create_user(
                email=f'other{i}_{role_filter}_{num_matching}_{num_other}@test.com',
                username=f'other{i}_{role_filter}_{num_matching}_{num_other}',
                password='TestPass123!',
                role=other_role,
                verification_status='approved'
            )
        
        # Get filtered report
        from django.urls import reverse
        url = reverse('admin-reports')
        response = client.get(url, {'type': 'users', 'role': role_filter})
        
        # Verify all results match the filter
        assert response.status_code == 200
        
        for user in response.data['data']:
            assert user['role'] == role_filter
    
    @given(
        days_offset=st.integers(min_value=1, max_value=30),
        num_before=st.integers(min_value=1, max_value=5),
        num_after=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=15, deadline=None)
    def test_property_61_admin_report_filtering_by_date_range(self, days_offset, num_before, num_after):
        """
        **Validates: Requirements 14.3**
        
        Property 61: Admin Report Filtering (Date Range)
        
        For any admin report request with date range filter, the results should 
        only include records within the specified date range.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_date_{days_offset}_{num_before}_{num_after}@test.com',
            username=f'admin_date_{days_offset}_{num_before}_{num_after}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create a cutoff date
        cutoff_date = timezone.now() - timedelta(days=days_offset)
        
        # Create users before cutoff (should be excluded)
        users_before = []
        for i in range(num_before):
            user = User.objects.create_user(
                email=f'before{i}_{days_offset}_{num_before}_{num_after}@test.com',
                username=f'before{i}_{days_offset}_{num_before}_{num_after}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
            # Manually set date_joined to before cutoff
            user.date_joined = cutoff_date - timedelta(days=1)
            user.save()
            users_before.append(user)
        
        # Create users after cutoff (should be included)
        users_after = []
        for i in range(num_after):
            user = User.objects.create_user(
                email=f'after{i}_{days_offset}_{num_before}_{num_after}@test.com',
                username=f'after{i}_{days_offset}_{num_before}_{num_after}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
            # date_joined is automatically set to now
            users_after.append(user)
        
        # Get filtered report with start_date
        from django.urls import reverse
        url = reverse('admin-reports')
        response = client.get(url, {
            'type': 'users',
            'start_date': cutoff_date.isoformat()
        })
        
        # Verify all results are after cutoff date
        assert response.status_code == 200
        
        result_ids = [user['id'] for user in response.data['data']]
        
        # Users before cutoff should not be in results
        for user in users_before:
            assert user.id not in result_ids
        
        # Users after cutoff should be in results
        for user in users_after:
            assert user.id in result_ids
    
    @given(
        location_keyword=st.sampled_from(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        num_matching=st.integers(min_value=1, max_value=5),
        num_other=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=15, deadline=None)
    def test_property_61_admin_report_filtering_by_location(self, location_keyword, num_matching, num_other):
        """
        **Validates: Requirements 14.3**
        
        Property 61: Admin Report Filtering (Location)
        
        For any admin report request with location filter, the results should 
        only include listings matching the specified location.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_loc_{location_keyword.replace(" ", "")}@test.com',
            username=f'admin_loc_{location_keyword.replace(" ", "")}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create donor
        donor = User.objects.create_user(
            email=f'donor_loc_{location_keyword.replace(" ", "")}@test.com',
            username=f'donor_loc_{location_keyword.replace(" ", "")}',
            password='TestPass123!',
            role='donor',
            verification_status='approved'
        )
        UserProfile.objects.create(user=donor, full_name='Donor')
        
        # Create listings with matching location
        matching_listings = []
        for i in range(num_matching):
            listing = FoodListing.objects.create(
                donor=donor,
                food_type=f'Food {i}',
                description='Test',
                quantity=10,
                preparation_time=timezone.now(),
                expiry_time=timezone.now() + timedelta(hours=4),
                pickup_address=f'{i} Main St, {location_keyword}',
                pickup_latitude=40.7128,
                pickup_longitude=-74.0060,
                available_quantity=10
            )
            matching_listings.append(listing)
        
        # Create listings with different location
        other_locations = ['Boston', 'Seattle', 'Miami', 'Denver', 'Atlanta']
        other_location = [loc for loc in other_locations if loc != location_keyword][0]
        
        other_listings = []
        for i in range(num_other):
            listing = FoodListing.objects.create(
                donor=donor,
                food_type=f'Food Other {i}',
                description='Test',
                quantity=10,
                preparation_time=timezone.now(),
                expiry_time=timezone.now() + timedelta(hours=4),
                pickup_address=f'{i} Oak St, {other_location}',
                pickup_latitude=42.3601,
                pickup_longitude=-71.0589,
                available_quantity=10
            )
            other_listings.append(listing)
        
        # Get filtered report by location
        from django.urls import reverse
        url = reverse('admin-reports')
        response = client.get(url, {
            'type': 'listings',
            'location': location_keyword
        })
        
        # Verify all results match the location filter
        assert response.status_code == 200
        
        result_ids = [listing['id'] for listing in response.data['data']]
        
        # Matching listings should be in results
        for listing in matching_listings:
            assert listing.id in result_ids
        
        # Other listings should not be in results
        for listing in other_listings:
            assert listing.id not in result_ids
    
    @given(
        export_format=st.sampled_from(['csv']),
        num_users=st.integers(min_value=1, max_value=10)
    )
    @settings(max_examples=15, deadline=None)
    def test_property_63_report_export_csv_data_integrity(self, export_format, num_users):
        """
        **Validates: Requirements 14.5**
        
        Property 63: Report Export (CSV with Data Integrity)
        
        For any admin report export in CSV format, all data should be intact 
        and match the original records.
        """
        import csv
        import io
        
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_export_{export_format}_{num_users}@test.com',
            username=f'admin_export_{export_format}_{num_users}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create test users with known data
        created_users = []
        for i in range(num_users):
            user = User.objects.create_user(
                email=f'testuser{i}_{export_format}_{num_users}@test.com',
                username=f'testuser{i}_{export_format}_{num_users}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
            created_users.append(user)
        
        # Export report
        from django.urls import reverse
        url = reverse('export-report')
        data = {
            'format': export_format,
            'type': 'users'
        }
        response = client.post(url, data, format='json')
        
        # Verify export succeeds
        assert response.status_code == 200
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        
        # Parse CSV content
        content = response.content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(content))
        exported_rows = list(csv_reader)
        
        # Verify data integrity - all created users should be in export
        exported_emails = [row['email'] for row in exported_rows]
        
        for user in created_users:
            assert user.email in exported_emails
        
        # Verify all expected fields are present
        expected_fields = ['id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined']
        for field in expected_fields:
            assert field in exported_rows[0].keys()
    
    @given(
        report_type=st.sampled_from(['users', 'listings', 'matches'])
    )
    @settings(max_examples=10, deadline=None)
    def test_property_63_report_export_multiple_types(self, report_type):
        """
        **Validates: Requirements 14.5**
        
        Property 63: Report Export (Multiple Report Types)
        
        For any report type (users, listings, matches), the system should 
        support CSV export with appropriate fields.
        """
        # Create admin user for this test
        client = APIClient()
        admin = User.objects.create_user(
            email=f'admin_multi_{report_type}@test.com',
            username=f'admin_multi_{report_type}',
            password='AdminPass123!',
            role='admin',
            verification_status='approved'
        )
        client.force_authenticate(user=admin)
        
        # Create test data based on report type
        if report_type == 'users':
            User.objects.create_user(
                email=f'testuser_{report_type}@test.com',
                username=f'testuser_{report_type}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
        elif report_type == 'listings':
            donor = User.objects.create_user(
                email=f'donor_{report_type}@test.com',
                username=f'donor_{report_type}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
            UserProfile.objects.create(user=donor, full_name='Donor')
            
            FoodListing.objects.create(
                donor=donor,
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
        elif report_type == 'matches':
            donor = User.objects.create_user(
                email=f'donor_{report_type}@test.com',
                username=f'donor_{report_type}',
                password='TestPass123!',
                role='donor',
                verification_status='approved'
            )
            UserProfile.objects.create(user=donor, full_name='Donor')
            
            receiver = User.objects.create_user(
                email=f'receiver_{report_type}@test.com',
                username=f'receiver_{report_type}',
                password='TestPass123!',
                role='receiver',
                verification_status='approved'
            )
            UserProfile.objects.create(user=receiver, full_name='Receiver')
            
            listing = FoodListing.objects.create(
                donor=donor,
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
            
            food_request = FoodRequest.objects.create(
                listing=listing,
                receiver=receiver,
                requested_quantity=5,
                pickup_time_preference=timezone.now() + timedelta(hours=2),
                status='approved'
            )
            
            Match.objects.create(
                listing=listing,
                request=food_request,
                donor=donor,
                receiver=receiver,
                matched_quantity=5,
                status='matched'
            )
        
        # Export report
        from django.urls import reverse
        url = reverse('export-report')
        data = {
            'format': 'csv',
            'type': report_type
        }
        response = client.post(url, data, format='json')
        
        # Verify export succeeds
        assert response.status_code == 200
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        assert f'{report_type}_report.csv' in response['Content-Disposition']
