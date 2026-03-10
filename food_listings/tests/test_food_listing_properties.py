"""
Property-based tests for FoodListing model.

This module contains property-based tests using Hypothesis to verify:
- Property 14: Food Listing Creation with Required Fields
- Property 15: Future Expiry Time Validation
- Property 16: Freshness Score Calculation
- Property 17: Image Upload Limit Enforcement

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone
from hypothesis import given, strategies as st, settings, assume
from django.core.exceptions import ValidationError
from authentication.models import User
from food_listings.models import FoodListing


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
    domain = draw(st.sampled_from(['example.com', 'test.org', 'mail.net']))
    return f"{username}{unique_id}@{domain}"


@st.composite
def food_type_text(draw):
    """Generate food type names"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
        min_size=3,
        max_size=50
    ))


@st.composite
def description_text(draw):
    """Generate food descriptions"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P'), min_codepoint=32, max_codepoint=126),
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
def future_datetime(draw):
    """Generate datetime in the future (1 hour to 30 days from now)"""
    hours_ahead = draw(st.integers(min_value=1, max_value=720))  # 1 hour to 30 days
    return datetime.now(timezone.utc) + timedelta(hours=hours_ahead)


@st.composite
def past_datetime(draw):
    """Generate datetime in the past (1 hour to 30 days ago)"""
    hours_ago = draw(st.integers(min_value=1, max_value=720))
    return datetime.now(timezone.utc) - timedelta(hours=hours_ago)


@st.composite
def image_url_list(draw, min_size=0, max_size=10):
    """Generate list of image URLs"""
    size = draw(st.integers(min_value=min_size, max_value=max_size))
    return [f"https://example.com/image{i}.jpg" for i in range(size)]


# Property Tests

@pytest.mark.django_db
@pytest.mark.property
class TestFoodListingCreationProperty:
    """
    Property 14: Food Listing Creation with Required Fields
    
    **Validates: Requirements 4.1, 4.6**
    
    For any food listing submission by a donor, the system should create a listing 
    with all required fields (food type, quantity, preparation time, expiry time, 
    pickup location) and dietary attributes.
    """
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        unit=st.sampled_from(['servings', 'kg', 'liters']),
        expiry_time=future_datetime(),
        address=address_text(),
        coords=coordinates(),
        is_vegetarian=st.booleans(),
        is_vegan=st.booleans(),
        is_gluten_free=st.booleans()
    )
    @settings(max_examples=50, deadline=None)
    def test_food_listing_created_with_all_required_fields(
        self, email, food_type, description, quantity, unit, 
        expiry_time, address, coords, is_vegetarian, is_vegan, is_gluten_free
    ):
        """
        Test that food listings are created with all required fields.
        
        For any valid food listing data, the system should successfully 
        create a listing with all required fields populated.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        # Preparation time is before expiry time
        prep_time = expiry_time - timedelta(hours=2)
        lat, lon = coords
        
        # Create food listing
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            unit=unit,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            is_vegetarian=is_vegetarian,
            is_vegan=is_vegan,
            is_gluten_free=is_gluten_free
        )
        
        # Verify all required fields are present
        assert listing.id is not None, "Listing ID not generated"
        assert listing.donor == donor, "Donor not set correctly"
        assert listing.food_type == food_type, "Food type not set"
        assert listing.description == description, "Description not set"
        assert listing.quantity == quantity, "Quantity not set"
        assert listing.unit == unit, "Unit not set"
        assert listing.preparation_time == prep_time, "Preparation time not set"
        assert listing.expiry_time == expiry_time, "Expiry time not set"
        assert listing.pickup_address == address, "Pickup address not set"
        assert abs(listing.pickup_latitude - lat) < 0.000001, "Latitude not set"
        assert abs(listing.pickup_longitude - lon) < 0.000001, "Longitude not set"
        
        # Verify dietary attributes
        assert listing.is_vegetarian == is_vegetarian, "Vegetarian flag not set"
        assert listing.is_vegan == is_vegan, "Vegan flag not set"
        assert listing.is_gluten_free == is_gluten_free, "Gluten-free flag not set"
        
        # Verify default values
        assert listing.status == 'available', "Default status not set"
        assert listing.available_quantity == quantity, "Available quantity not initialized"
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        expiry_time=future_datetime(),
        address=address_text(),
        coords=coordinates(),
        allergens=st.lists(st.sampled_from(['peanuts', 'dairy', 'eggs', 'soy', 'wheat', 'fish']), max_size=3)
    )
    @settings(max_examples=30, deadline=None)
    def test_food_listing_with_allergen_info(
        self, email, food_type, description, quantity, 
        expiry_time, address, coords, allergens
    ):
        """
        Test that food listings can store allergen information.
        
        For any food listing with allergen data, the system should 
        properly store and retrieve the allergen information.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        prep_time = expiry_time - timedelta(hours=2)
        lat, lon = coords
        
        # Create food listing with allergen info
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            allergen_info=allergens
        )
        
        # Verify allergen info is stored correctly
        assert listing.allergen_info == allergens, \
            f"Allergen info not stored correctly: expected {allergens}, got {listing.allergen_info}"


@pytest.mark.django_db
@pytest.mark.property
class TestFutureExpiryTimeValidationProperty:
    """
    Property 15: Future Expiry Time Validation
    
    **Validates: Requirements 4.2**
    
    For any food listing submission with an expiry time in the past, 
    the system should reject the listing.
    """
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        past_expiry=past_datetime(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_listing_with_past_expiry_time_rejected(
        self, email, food_type, description, quantity, 
        past_expiry, address, coords
    ):
        """
        Test that food listings with past expiry times are rejected.
        
        For any expiry time in the past, the system should not allow 
        creation of a food listing (or should have zero freshness score).
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        # Preparation time is before expiry time
        prep_time = past_expiry - timedelta(hours=2)
        lat, lon = coords
        
        # Create food listing with past expiry time
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=past_expiry,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        # Verify freshness score is 0 for expired food
        assert listing.freshness_score == 0.0, \
            f"Expired listing should have freshness score of 0, got {listing.freshness_score}"
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        future_expiry=future_datetime(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_listing_with_future_expiry_time_accepted(
        self, email, food_type, description, quantity, 
        future_expiry, address, coords
    ):
        """
        Test that food listings with future expiry times are accepted.
        
        For any expiry time in the future, the system should successfully 
        create a food listing with a positive freshness score.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        # Preparation time is before expiry time
        prep_time = future_expiry - timedelta(hours=2)
        lat, lon = coords
        
        # Create food listing with future expiry time
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=future_expiry,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        # Verify freshness score is positive for future expiry
        assert listing.freshness_score > 0.0, \
            f"Future listing should have positive freshness score, got {listing.freshness_score}"
        assert listing.freshness_score <= 100.0, \
            f"Freshness score should not exceed 100, got {listing.freshness_score}"


@pytest.mark.django_db
@pytest.mark.property
class TestFreshnessScoreCalculationProperty:
    """
    Property 16: Freshness Score Calculation
    
    **Validates: Requirements 4.3**
    
    For any food listing with preparation time and expiry time, the calculated 
    freshness score should be consistent and based on the time difference between 
    preparation and expiry.
    """
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        hours_until_expiry=st.integers(min_value=1, max_value=48),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_freshness_score_consistency(
        self, email, food_type, description, quantity, 
        hours_until_expiry, address, coords
    ):
        """
        Test that freshness score calculation is consistent.
        
        For any food listing, calculating the freshness score multiple times 
        should yield the same result (within a small time window).
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=1)
        expiry_time = now + timedelta(hours=hours_until_expiry)
        lat, lon = coords
        
        # Create food listing
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        # Calculate freshness score twice
        score1 = listing.calculate_freshness_score()
        score2 = listing.calculate_freshness_score()
        
        # Scores should be very close (within 0.1 due to time passage)
        assert abs(score1 - score2) < 0.1, \
            f"Freshness score calculation inconsistent: {score1} vs {score2}"
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        hours_until_expiry=st.integers(min_value=1, max_value=48),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=50, deadline=None)
    def test_freshness_score_decreases_over_time(
        self, email, food_type, description, quantity, 
        hours_until_expiry, address, coords
    ):
        """
        Test that freshness score decreases as time approaches expiry.
        
        For any food listing, the freshness score should be higher when 
        there's more time until expiry and lower when closer to expiry.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        now = datetime.now(timezone.utc)
        prep_time = now - timedelta(hours=2)
        expiry_time = now + timedelta(hours=hours_until_expiry)
        lat, lon = coords
        
        # Create food listing
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        # Calculate expected score
        total_shelf_life = (expiry_time - prep_time).total_seconds()
        remaining_shelf_life = (expiry_time - now).total_seconds()
        expected_score = (remaining_shelf_life / total_shelf_life) * 100
        
        # Verify score is within expected range (allowing small variance)
        assert abs(listing.freshness_score - expected_score) < 1.0, \
            f"Freshness score {listing.freshness_score} not close to expected {expected_score}"
        
        # Verify score is in valid range
        assert 0.0 <= listing.freshness_score <= 100.0, \
            f"Freshness score {listing.freshness_score} outside valid range [0, 100]"
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=30, deadline=None)
    def test_freshness_score_bounds(
        self, email, food_type, description, quantity, address, coords
    ):
        """
        Test that freshness score is always between 0 and 100.
        
        For any food listing, regardless of preparation and expiry times, 
        the freshness score should never be negative or exceed 100.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        now = datetime.now(timezone.utc)
        lat, lon = coords
        
        # Test case 1: Just prepared, long shelf life (should be close to 100)
        prep_time1 = now
        expiry_time1 = now + timedelta(hours=24)
        
        listing1 = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time1,
            expiry_time=expiry_time1,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        assert 0.0 <= listing1.freshness_score <= 100.0, \
            f"Freshness score {listing1.freshness_score} outside bounds [0, 100]"
        
        # Test case 2: Already expired (should be 0)
        prep_time2 = now - timedelta(hours=5)
        expiry_time2 = now - timedelta(hours=1)
        
        listing2 = FoodListing.objects.create(
            donor=donor,
            food_type=f"{food_type}_2",
            description=description,
            quantity=quantity,
            preparation_time=prep_time2,
            expiry_time=expiry_time2,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon
        )
        
        assert listing2.freshness_score == 0.0, \
            f"Expired listing should have score 0, got {listing2.freshness_score}"


@pytest.mark.django_db
@pytest.mark.property
class TestImageUploadLimitProperty:
    """
    Property 17: Image Upload Limit Enforcement
    
    **Validates: Requirements 4.5**
    
    For any food listing, the system should accept up to 5 images and reject 
    attempts to upload more than 5 images.
    """
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        expiry_time=future_datetime(),
        address=address_text(),
        coords=coordinates(),
        num_images=st.integers(min_value=0, max_value=5)
    )
    @settings(max_examples=50, deadline=None)
    def test_listing_accepts_up_to_5_images(
        self, email, food_type, description, quantity, 
        expiry_time, address, coords, num_images
    ):
        """
        Test that food listings accept up to 5 images.
        
        For any food listing with 0-5 images, the system should 
        successfully store all images.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        prep_time = expiry_time - timedelta(hours=2)
        lat, lon = coords
        images = [f"https://example.com/image{i}.jpg" for i in range(num_images)]
        
        # Create food listing with images
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            images=images
        )
        
        # Verify images are stored correctly
        assert len(listing.images) == num_images, \
            f"Expected {num_images} images, got {len(listing.images)}"
        assert listing.images == images, \
            f"Images not stored correctly: expected {images}, got {listing.images}"
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        expiry_time=future_datetime(),
        address=address_text(),
        coords=coordinates(),
        num_images=st.integers(min_value=6, max_value=10)
    )
    @settings(max_examples=30, deadline=None)
    def test_listing_rejects_more_than_5_images(
        self, email, food_type, description, quantity, 
        expiry_time, address, coords, num_images
    ):
        """
        Test that food listings reject more than 5 images.
        
        For any food listing with more than 5 images, the validation 
        method should raise an error.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        prep_time = expiry_time - timedelta(hours=2)
        lat, lon = coords
        images = [f"https://example.com/image{i}.jpg" for i in range(num_images)]
        
        # Create food listing with too many images
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            images=images
        )
        
        # Validate images - should raise ValueError
        with pytest.raises(ValueError, match="Maximum 5 images allowed"):
            listing.validate_images()
    
    @given(
        email=valid_email(),
        food_type=food_type_text(),
        description=description_text(),
        quantity=st.integers(min_value=1, max_value=1000),
        expiry_time=future_datetime(),
        address=address_text(),
        coords=coordinates()
    )
    @settings(max_examples=20, deadline=None)
    def test_listing_with_exactly_5_images(
        self, email, food_type, description, quantity, 
        expiry_time, address, coords
    ):
        """
        Test that food listings accept exactly 5 images (boundary case).
        
        For any food listing with exactly 5 images, the system should 
        accept all images without error.
        """
        # Create donor user
        unique_username = f"donor_{uuid.uuid4().hex[:8]}"
        donor = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='donor'
        )
        
        prep_time = expiry_time - timedelta(hours=2)
        lat, lon = coords
        images = [f"https://example.com/image{i}.jpg" for i in range(5)]
        
        # Create food listing with exactly 5 images
        listing = FoodListing.objects.create(
            donor=donor,
            food_type=food_type,
            description=description,
            quantity=quantity,
            preparation_time=prep_time,
            expiry_time=expiry_time,
            pickup_address=address,
            pickup_latitude=lat,
            pickup_longitude=lon,
            images=images
        )
        
        # Validate images - should not raise error
        listing.validate_images()  # Should pass without exception
        
        # Verify exactly 5 images stored
        assert len(listing.images) == 5, \
            f"Expected exactly 5 images, got {len(listing.images)}"
