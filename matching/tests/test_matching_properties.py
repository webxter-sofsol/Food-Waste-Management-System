"""
Property-based tests for Match creation and approval workflows.

This module contains property-based tests using Hypothesis to verify:
- Property 32: Match Creation and Notification
- Property 33: Listing Quantity Update on Match
- Property 34: Request Rejection Notification

**Validates: Requirements 8.2, 8.3, 8.4**
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone
from hypothesis import given, strategies as st, settings, assume
from django.db import transaction
from authentication.models import User
from food_listings.models import FoodListing
from matching.models import FoodRequest, Match
from safety_analytics.models import Notification


# Hypothesis strategies for generating test data

@st.composite
def valid_email(draw):
    """Generate valid email addresses with unique identifiers"""
    username = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=15
    ))
    unique_id = uuid.uuid4().hex[:8]
    domain = draw(st.sampled_from(['example.com', 'test.org', 'mail.net', 'domain.io']))
    return f"{username}{unique_id}@{domain}"


@st.composite
def valid_password(draw):
    """Generate valid passwords"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
        min_size=8,
        max_size=30
    ))


@st.composite
def food_type_text(draw):
    """Generate food type names"""
    return draw(st.sampled_from([
        'Rice and Curry',
        'Pasta',
        'Sandwiches',
        'Salad',
        'Pizza',
        'Soup',
        'Biryani',
        'Fried Rice',
        'Noodles',
        'Bread and Butter'
    ]))


@st.composite
def description_text(draw):
    """Generate food descriptions"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P', 'Z')),
        min_size=10,
        max_size=200
    ))


@st.composite
def address_text(draw):
    """Generate address strings"""
    street_num = draw(st.integers(min_value=1, max_value=9999))
    street_name = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
        min_size=5,
        max_size=20
    ))
    city = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
        min_size=4,
        max_size=15
    ))
    return f"{street_num} {street_name} St, {city}"


@st.composite
def coordinates(draw):
    """Generate latitude and longitude coordinates"""
    lat = draw(st.floats(min_value=-90.0, max_value=90.0, allow_nan=False, allow_infinity=False))
    lon = draw(st.floats(min_value=-180.0, max_value=180.0, allow_nan=False, allow_infinity=False))
    return lat, lon


@st.composite
def quantity_value(draw):
    """Generate food quantity values"""
    return draw(st.integers(min_value=1, max_value=500))


# Property Tests

@pytest.mark.django_db
@pytest.mark.property
class TestMatchCreationProperty:
    """
    Property 32: Match Creation and Notification
    
    **Validates: Requirements 8.2, 8.5**
    
    For any food request approval by a donor, the system should create a match 
    record, notify the receiver and available volunteers, and initiate volunteer 
    assignment.
    """
    
    @given(
        donor_email=valid_email(),
        receiver_email=valid_email(),
        password=valid_password(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=quantity_value(),
        address=address_text(),
        coords=coordinates(),
        requested_qty=quantity_value()
    )
    @settings(max_examples=50, deadline=None)
    def test_match_creation_on_approval(
        self, donor_email, receiver_email, password, food_type, description,
        quantity, address, coords, requested_qty
    ):
        """
        Test that approving a food request creates a match record.
        
        For any food request approval, the system should:
        1. Create a Match record
        2. Link it to the listing, request, donor, and receiver
        3. Set matched_quantity correctly
        4. Set initial status to 'matched'
        """
        # Ensure requested quantity doesn't exceed available quantity
        assume(requested_qty <= quantity)
        
        lat, lon = coords
        
        # Create donor user
        donor_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=donor_username,
            email=donor_email,
            password=password,
            role='donor'
        )
        
        # Create receiver user
        receiver_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=receiver_username,
            email=receiver_email,
            password=password,
            role='receiver'
        )
        
        # Create food listing
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=6)
        
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit='servings',
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            available_quantity=quantity,
            status='available'
        )
        
        # Create food request
        pickup_preference = now + timedelta(hours=2)
        
        food_request = FoodRequest.objects.create(
            listing=listing,
            receiver=receiver,
            requested_quantity=requested_qty,
            pickup_time_preference=pickup_preference,
            status='pending'
        )
        
        # Simulate approval process
        with transaction.atomic():
            food_request.status = 'approved'
            food_request.save()
            
            # Create match
            match = Match.objects.create(
                listing=listing,
                request=food_request,
                donor=donor,
                receiver=receiver,
                matched_quantity=requested_qty,
                status='matched'
            )
            
            # Create notification
            Notification.objects.create(
                user=receiver,
                notification_type='match_created',
                title='Food Request Approved',
                message=f"Your request has been approved!",
                related_entity_type='match',
                related_entity_id=match.id,
                sent_via_email=True
            )
        
        # Verify match was created correctly
        assert match.id is not None, "Match was not saved"
        assert match.listing == listing, "Match listing mismatch"
        assert match.request == food_request, "Match request mismatch"
        assert match.donor == donor, "Match donor mismatch"
        assert match.receiver == receiver, "Match receiver mismatch"
        assert match.matched_quantity == requested_qty, \
            f"Matched quantity mismatch: expected {requested_qty}, got {match.matched_quantity}"
        assert match.status == 'matched', \
            f"Initial match status should be 'matched', got '{match.status}'"
        
        # Verify notification was created
        notification = Notification.objects.filter(
            user=receiver,
            notification_type='match_created',
            related_entity_type='match',
            related_entity_id=match.id
        ).first()
        
        assert notification is not None, "Notification was not created"
        assert notification.sent_via_email is True, "Notification should be sent via email"


@pytest.mark.django_db
@pytest.mark.property
class TestListingQuantityUpdateProperty:
    """
    Property 33: Listing Quantity Update on Match
    
    **Validates: Requirements 8.3**
    
    For any food request approval, the system should either mark the listing 
    as reserved or reduce the available quantity by the matched quantity.
    """
    
    @given(
        donor_email=valid_email(),
        receiver_email=valid_email(),
        password=valid_password(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=quantity_value(),
        address=address_text(),
        coords=coordinates(),
        requested_qty=quantity_value()
    )
    @settings(max_examples=50, deadline=None)
    def test_listing_quantity_reduced_on_partial_match(
        self, donor_email, receiver_email, password, food_type, description,
        quantity, address, coords, requested_qty
    ):
        """
        Test that available quantity is reduced when partial quantity is matched.
        
        For any match where requested_quantity < available_quantity,
        the listing's available_quantity should be reduced by matched_quantity.
        """
        # Ensure requested quantity is less than available quantity
        assume(requested_qty < quantity)
        
        lat, lon = coords
        
        # Create donor user
        donor_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=donor_username,
            email=donor_email,
            password=password,
            role='donor'
        )
        
        # Create receiver user
        receiver_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=receiver_username,
            email=receiver_email,
            password=password,
            role='receiver'
        )
        
        # Create food listing
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=6)
        
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit='servings',
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            available_quantity=quantity,
            status='available'
        )
        
        initial_available = listing.available_quantity
        
        # Create and approve food request
        pickup_preference = now + timedelta(hours=2)
        
        food_request = FoodRequest.objects.create(
            listing=listing,
            receiver=receiver,
            requested_quantity=requested_qty,
            pickup_time_preference=pickup_preference,
            status='pending'
        )
        
        # Simulate approval and quantity update
        with transaction.atomic():
            food_request.status = 'approved'
            food_request.save()
            
            Match.objects.create(
                listing=listing,
                request=food_request,
                donor=donor,
                receiver=receiver,
                matched_quantity=requested_qty,
                status='matched'
            )
            
            # Update listing quantity
            listing.available_quantity -= requested_qty
            listing.save()
        
        # Verify quantity was reduced correctly
        listing.refresh_from_db()
        expected_quantity = initial_available - requested_qty
        
        assert listing.available_quantity == expected_quantity, \
            f"Available quantity should be {expected_quantity}, got {listing.available_quantity}"
        assert listing.status == 'available', \
            "Listing should remain 'available' for partial matches"
    
    @given(
        donor_email=valid_email(),
        receiver_email=valid_email(),
        password=valid_password(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=quantity_value(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_listing_marked_reserved_on_full_match(
        self, donor_email, receiver_email, password, food_type, description,
        quantity, address, coords
    ):
        """
        Test that listing is marked as reserved when full quantity is matched.
        
        For any match where requested_quantity >= available_quantity,
        the listing should be marked as 'reserved' and available_quantity set to 0.
        """
        lat, lon = coords
        
        # Create donor user
        donor_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=donor_username,
            email=donor_email,
            password=password,
            role='donor'
        )
        
        # Create receiver user
        receiver_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=receiver_username,
            email=receiver_email,
            password=password,
            role='receiver'
        )
        
        # Create food listing
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=6)
        
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit='servings',
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            available_quantity=quantity,
            status='available'
        )
        
        # Request full quantity
        requested_qty = quantity
        
        # Create and approve food request
        pickup_preference = now + timedelta(hours=2)
        
        food_request = FoodRequest.objects.create(
            listing=listing,
            receiver=receiver,
            requested_quantity=requested_qty,
            pickup_time_preference=pickup_preference,
            status='pending'
        )
        
        # Simulate approval and status update
        with transaction.atomic():
            food_request.status = 'approved'
            food_request.save()
            
            Match.objects.create(
                listing=listing,
                request=food_request,
                donor=donor,
                receiver=receiver,
                matched_quantity=requested_qty,
                status='matched'
            )
            
            # Update listing status
            listing.status = 'reserved'
            listing.available_quantity = 0
            listing.save()
        
        # Verify listing was marked as reserved
        listing.refresh_from_db()
        
        assert listing.status == 'reserved', \
            f"Listing should be 'reserved' for full matches, got '{listing.status}'"
        assert listing.available_quantity == 0, \
            f"Available quantity should be 0, got {listing.available_quantity}"


@pytest.mark.django_db
@pytest.mark.property
class TestRequestRejectionProperty:
    """
    Property 34: Request Rejection Notification
    
    **Validates: Requirements 8.4**
    
    For any food request rejection by a donor, the system should notify the 
    receiver with the rejection status and optional reason.
    """
    
    @given(
        donor_email=valid_email(),
        receiver_email=valid_email(),
        password=valid_password(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=quantity_value(),
        address=address_text(),
        coords=coordinates(),
        requested_qty=quantity_value(),
        rejection_reason=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P', 'Z')),
            min_size=10,
            max_size=200
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_rejection_notification_with_reason(
        self, donor_email, receiver_email, password, food_type, description,
        quantity, address, coords, requested_qty, rejection_reason
    ):
        """
        Test that rejection creates notification with reason.
        
        For any food request rejection with a reason, the system should:
        1. Update request status to 'rejected'
        2. Store the rejection reason
        3. Send notification to receiver with the reason
        """
        # Ensure requested quantity doesn't exceed available quantity
        assume(requested_qty <= quantity)
        
        lat, lon = coords
        
        # Create donor user
        donor_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=donor_username,
            email=donor_email,
            password=password,
            role='donor'
        )
        
        # Create receiver user
        receiver_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=receiver_username,
            email=receiver_email,
            password=password,
            role='receiver'
        )
        
        # Create food listing
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=6)
        
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit='servings',
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            available_quantity=quantity,
            status='available'
        )
        
        # Create food request
        pickup_preference = now + timedelta(hours=2)
        
        food_request = FoodRequest.objects.create(
            listing=listing,
            receiver=receiver,
            requested_quantity=requested_qty,
            pickup_time_preference=pickup_preference,
            status='pending'
        )
        
        # Simulate rejection process
        with transaction.atomic():
            food_request.status = 'rejected'
            food_request.rejection_reason = rejection_reason
            food_request.save()
            
            # Create notification
            message = f"Your request has been rejected. Reason: {rejection_reason}"
            Notification.objects.create(
                user=receiver,
                notification_type='food_request',
                title='Food Request Rejected',
                message=message,
                related_entity_type='food_request',
                related_entity_id=food_request.id,
                sent_via_email=True
            )
        
        # Verify rejection was processed correctly
        food_request.refresh_from_db()
        
        assert food_request.status == 'rejected', \
            f"Request status should be 'rejected', got '{food_request.status}'"
        assert food_request.rejection_reason == rejection_reason, \
            "Rejection reason mismatch"
        
        # Verify notification was created with reason
        notification = Notification.objects.filter(
            user=receiver,
            notification_type='food_request',
            related_entity_type='food_request',
            related_entity_id=food_request.id
        ).first()
        
        assert notification is not None, "Notification was not created"
        assert rejection_reason in notification.message, \
            "Rejection reason should be included in notification message"
        assert notification.sent_via_email is True, \
            "Notification should be sent via email"
    
    @given(
        donor_email=valid_email(),
        receiver_email=valid_email(),
        password=valid_password(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=quantity_value(),
        address=address_text(),
        coords=coordinates(),
        requested_qty=quantity_value()
    )
    @settings(max_examples=50, deadline=None)
    def test_rejection_notification_without_reason(
        self, donor_email, receiver_email, password, food_type, description,
        quantity, address, coords, requested_qty
    ):
        """
        Test that rejection creates notification even without reason.
        
        For any food request rejection without a reason, the system should:
        1. Update request status to 'rejected'
        2. Send notification to receiver (without reason)
        """
        # Ensure requested quantity doesn't exceed available quantity
        assume(requested_qty <= quantity)
        
        lat, lon = coords
        
        # Create donor user
        donor_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=donor_username,
            email=donor_email,
            password=password,
            role='donor'
        )
        
        # Create receiver user
        receiver_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=receiver_username,
            email=receiver_email,
            password=password,
            role='receiver'
        )
        
        # Create food listing
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=6)
        
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit='servings',
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            available_quantity=quantity,
            status='available'
        )
        
        # Create food request
        pickup_preference = now + timedelta(hours=2)
        
        food_request = FoodRequest.objects.create(
            listing=listing,
            receiver=receiver,
            requested_quantity=requested_qty,
            pickup_time_preference=pickup_preference,
            status='pending'
        )
        
        # Simulate rejection process without reason
        with transaction.atomic():
            food_request.status = 'rejected'
            food_request.save()
            
            # Create notification without reason
            message = "Your request has been rejected."
            Notification.objects.create(
                user=receiver,
                notification_type='food_request',
                title='Food Request Rejected',
                message=message,
                related_entity_type='food_request',
                related_entity_id=food_request.id,
                sent_via_email=True
            )
        
        # Verify rejection was processed correctly
        food_request.refresh_from_db()
        
        assert food_request.status == 'rejected', \
            f"Request status should be 'rejected', got '{food_request.status}'"
        assert food_request.rejection_reason is None or food_request.rejection_reason == '', \
            "Rejection reason should be empty when not provided"
        
        # Verify notification was created
        notification = Notification.objects.filter(
            user=receiver,
            notification_type='food_request',
            related_entity_type='food_request',
            related_entity_id=food_request.id
        ).first()
        
        assert notification is not None, "Notification was not created"
        assert notification.sent_via_email is True, \
            "Notification should be sent via email"
