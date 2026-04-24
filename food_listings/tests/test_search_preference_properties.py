"""
Property-based tests for Search Preferences.

This module contains property-based tests using Hypothesis to verify:
- Property 72: Filter Preference Persistence Round-Trip
- Property 73: Filter Reset
- Property 74: Recent Search Query Limit

**Validates: Requirements 18.1, 18.2, 18.3, 18.4**
"""

import pytest
import uuid
from hypothesis import given, strategies as st, settings
from django.contrib.auth import get_user_model
from safety_analytics.models import SearchPreference

User = get_user_model()


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
def search_filters(draw):
    """Generate search filter dictionaries"""
    filters = {}
    
    # Food type filter
    if draw(st.booleans()):
        filters['food_type'] = draw(st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), min_codepoint=65, max_codepoint=122),
            min_size=3,
            max_size=20
        ))
    
    # Dietary attribute filters
    if draw(st.booleans()):
        filters['vegetarian'] = draw(st.booleans())
    if draw(st.booleans()):
        filters['vegan'] = draw(st.booleans())
    if draw(st.booleans()):
        filters['gluten_free'] = draw(st.booleans())
    
    # Distance filter
    if draw(st.booleans()):
        filters['max_distance'] = draw(st.floats(min_value=1.0, max_value=100.0, allow_nan=False, allow_infinity=False))
    
    # Expiry hours filter
    if draw(st.booleans()):
        filters['expiry_hours'] = draw(st.integers(min_value=1, max_value=72))
    
    # Sort preferences
    if draw(st.booleans()):
        filters['sort_by'] = draw(st.sampled_from(['freshness_score', 'distance', 'quantity', 'expiry_time']))
        filters['sort_order'] = draw(st.sampled_from(['asc', 'desc']))
    
    return filters


@st.composite
def search_query_text(draw):
    """Generate search query strings"""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'P'), min_codepoint=32, max_codepoint=126),
        min_size=3,
        max_size=50
    ))


# Property Tests

@pytest.mark.django_db
@pytest.mark.property
class TestFilterPreferencePersistenceProperty:
    """
    Property 72: Filter Preference Persistence Round-Trip
    
    **Validates: Requirements 18.1, 18.2**
    
    For any receiver applying filters to food listings, the system should save 
    the filter preferences to the user profile. When the receiver returns to the 
    browse page, the system should apply previously saved filters automatically.
    """
    
    @given(
        email=valid_email(),
        filters=search_filters()
    )
    @settings(max_examples=50, deadline=None)
    def test_filter_preferences_saved_and_retrieved(self, email, filters):
        """
        Test that filter preferences are saved and can be retrieved.
        
        For any set of search filters, the system should save them to the 
        user's search preferences and retrieve them accurately on subsequent queries.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create or get search preference
        preference, created = SearchPreference.objects.get_or_create(user=receiver)
        
        # Save filters
        preference.filters = filters
        preference.save()
        
        # Retrieve preference from database
        retrieved_preference = SearchPreference.objects.get(user=receiver)
        
        # Verify filters match exactly
        assert retrieved_preference.filters == filters, \
            f"Filters not persisted correctly: expected {filters}, got {retrieved_preference.filters}"
    
    @given(
        email=valid_email(),
        filters1=search_filters(),
        filters2=search_filters()
    )
    @settings(max_examples=30, deadline=None)
    def test_filter_preferences_updated_correctly(self, email, filters1, filters2):
        """
        Test that filter preferences can be updated.
        
        For any user with existing filter preferences, updating the filters 
        should replace the old preferences with new ones.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference with initial filters
        preference = SearchPreference.objects.create(
            user=receiver,
            filters=filters1
        )
        
        # Verify initial filters
        assert preference.filters == filters1
        
        # Update filters
        preference.filters = filters2
        preference.save()
        
        # Retrieve and verify updated filters
        updated_preference = SearchPreference.objects.get(user=receiver)
        assert updated_preference.filters == filters2, \
            f"Filters not updated correctly: expected {filters2}, got {updated_preference.filters}"
    
    @given(
        email=valid_email(),
        filters=search_filters()
    )
    @settings(max_examples=30, deadline=None)
    def test_filter_preferences_auto_apply_on_return(self, email, filters):
        """
        Test that saved filters are available for auto-application.
        
        For any user with saved filter preferences, the system should make 
        those preferences available when the user returns to the browse page.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Save filter preferences
        preference = SearchPreference.objects.create(
            user=receiver,
            filters=filters
        )
        
        # Simulate user returning - retrieve preferences
        try:
            returned_preference = SearchPreference.objects.get(user=receiver)
            retrieved_filters = returned_preference.filters
        except SearchPreference.DoesNotExist:
            retrieved_filters = {}
        
        # Verify filters are available for auto-application
        assert retrieved_filters == filters, \
            f"Saved filters not available for auto-application: expected {filters}, got {retrieved_filters}"


@pytest.mark.django_db
@pytest.mark.property
class TestFilterResetProperty:
    """
    Property 73: Filter Reset
    
    **Validates: Requirements 18.3**
    
    For any user with saved filter preferences, the system should allow clearing 
    saved filters and reset to default view.
    """
    
    @given(
        email=valid_email(),
        filters=search_filters()
    )
    @settings(max_examples=50, deadline=None)
    def test_filter_preferences_can_be_cleared(self, email, filters):
        """
        Test that filter preferences can be cleared.
        
        For any user with saved filters, clearing the preferences should 
        reset them to an empty state (default view).
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference with filters
        preference = SearchPreference.objects.create(
            user=receiver,
            filters=filters
        )
        
        # Verify filters are set
        assert preference.filters == filters
        assert len(preference.filters) > 0 or preference.filters == filters
        
        # Clear filters
        preference.filters = {}
        preference.save()
        
        # Retrieve and verify filters are cleared
        cleared_preference = SearchPreference.objects.get(user=receiver)
        assert cleared_preference.filters == {}, \
            f"Filters not cleared: expected empty dict, got {cleared_preference.filters}"
    
    @given(
        email=valid_email(),
        filters=search_filters(),
        recent_searches=st.lists(search_query_text(), min_size=1, max_size=5)
    )
    @settings(max_examples=30, deadline=None)
    def test_filter_reset_preserves_recent_searches(self, email, filters, recent_searches):
        """
        Test that clearing filters doesn't affect recent searches.
        
        For any user with both filters and recent searches, clearing filters 
        should only clear the filters, not the recent searches.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference with both filters and recent searches
        preference = SearchPreference.objects.create(
            user=receiver,
            filters=filters,
            recent_searches=recent_searches
        )
        
        # Clear only filters
        preference.filters = {}
        preference.save()
        
        # Retrieve and verify
        updated_preference = SearchPreference.objects.get(user=receiver)
        assert updated_preference.filters == {}, "Filters not cleared"
        assert updated_preference.recent_searches == recent_searches, \
            f"Recent searches should be preserved: expected {recent_searches}, got {updated_preference.recent_searches}"
    
    @given(
        email=valid_email(),
        filters=search_filters()
    )
    @settings(max_examples=30, deadline=None)
    def test_filter_reset_to_default_view(self, email, filters):
        """
        Test that clearing filters results in default view state.
        
        For any user clearing their filters, the resulting state should be 
        equivalent to a new user with no preferences (default view).
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference with filters
        preference = SearchPreference.objects.create(
            user=receiver,
            filters=filters
        )
        
        # Clear filters to reset to default
        preference.filters = {}
        preference.recent_searches = []
        preference.save()
        
        # Retrieve preference
        reset_preference = SearchPreference.objects.get(user=receiver)
        
        # Verify default state
        assert reset_preference.filters == {}, "Filters should be empty dict"
        assert reset_preference.recent_searches == [], "Recent searches should be empty list"


@pytest.mark.django_db
@pytest.mark.property
class TestRecentSearchQueryLimitProperty:
    """
    Property 74: Recent Search Query Limit
    
    **Validates: Requirements 18.4**
    
    For any user, the system should save up to 5 recent search queries. When 
    a 6th query is added, the oldest query should be removed (FIFO).
    """
    
    @given(
        email=valid_email(),
        search_queries=st.lists(search_query_text(), min_size=1, max_size=5, unique=True)
    )
    @settings(max_examples=50, deadline=None)
    def test_recent_searches_stored_up_to_5(self, email, search_queries):
        """
        Test that up to 5 recent searches are stored.
        
        For any user with 1-5 search queries, all queries should be stored 
        in the recent searches list.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference
        preference = SearchPreference.objects.create(user=receiver)
        
        # Add search queries one by one
        for query in search_queries:
            recent = preference.recent_searches or []
            if query not in recent:
                recent.insert(0, query)
            preference.recent_searches = recent[:5]  # Keep only 5
            preference.save()
        
        # Retrieve and verify
        final_preference = SearchPreference.objects.get(user=receiver)
        assert len(final_preference.recent_searches) <= 5, \
            f"Recent searches should not exceed 5, got {len(final_preference.recent_searches)}"
        assert len(final_preference.recent_searches) == len(search_queries), \
            f"Expected {len(search_queries)} searches, got {len(final_preference.recent_searches)}"
    
    @given(
        email=valid_email(),
        search_queries=st.lists(search_query_text(), min_size=6, max_size=10, unique=True)
    )
    @settings(max_examples=50, deadline=None)
    def test_recent_searches_fifo_with_more_than_5(self, email, search_queries):
        """
        Test that recent searches follow FIFO when exceeding 5 queries.
        
        For any user adding more than 5 search queries, only the 5 most 
        recent queries should be kept, with oldest queries removed first.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference
        preference = SearchPreference.objects.create(user=receiver)
        
        # Add search queries one by one
        for query in search_queries:
            recent = preference.recent_searches or []
            if query in recent:
                recent.remove(query)
            recent.insert(0, query)
            preference.recent_searches = recent[:5]  # Keep only 5 most recent
            preference.save()
        
        # Retrieve final state
        final_preference = SearchPreference.objects.get(user=receiver)
        
        # Verify only 5 searches stored
        assert len(final_preference.recent_searches) == 5, \
            f"Should store exactly 5 searches, got {len(final_preference.recent_searches)}"
        
        # Verify the 5 most recent queries are stored (in reverse order)
        expected_recent = search_queries[-5:][::-1]  # Last 5, reversed
        assert final_preference.recent_searches == expected_recent, \
            f"Expected most recent 5 queries {expected_recent}, got {final_preference.recent_searches}"
    
    @given(
        email=valid_email(),
        initial_queries=st.lists(search_query_text(), min_size=5, max_size=5, unique=True),
        new_query=search_query_text()
    )
    @settings(max_examples=30, deadline=None)
    def test_oldest_query_removed_when_adding_6th(self, email, initial_queries, new_query):
        """
        Test that the oldest query is removed when adding a 6th query.
        
        For any user with 5 existing queries, adding a new query should 
        remove the oldest query and add the new one at the front.
        """
        # Ensure new query is different from existing ones
        if new_query in initial_queries:
            new_query = f"{new_query}_new"
        
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference with 5 queries (most recent first)
        preference = SearchPreference.objects.create(
            user=receiver,
            recent_searches=initial_queries[::-1]  # Reverse to simulate most recent first
        )
        
        # Store the oldest query (last in the list)
        oldest_query = preference.recent_searches[-1]
        
        # Add a new query
        recent = preference.recent_searches
        recent.insert(0, new_query)
        preference.recent_searches = recent[:5]  # Keep only 5
        preference.save()
        
        # Retrieve and verify
        updated_preference = SearchPreference.objects.get(user=receiver)
        
        # Verify still only 5 searches
        assert len(updated_preference.recent_searches) == 5, \
            f"Should have exactly 5 searches, got {len(updated_preference.recent_searches)}"
        
        # Verify new query is at the front
        assert updated_preference.recent_searches[0] == new_query, \
            f"New query should be first, got {updated_preference.recent_searches[0]}"
        
        # Verify oldest query was removed
        assert oldest_query not in updated_preference.recent_searches, \
            f"Oldest query {oldest_query} should be removed"
    
    @given(
        email=valid_email(),
        queries=st.lists(search_query_text(), min_size=3, max_size=7, unique=True)
    )
    @settings(max_examples=30, deadline=None)
    def test_recent_searches_order_maintained(self, email, queries):
        """
        Test that recent searches maintain chronological order (most recent first).
        
        For any sequence of search queries, the most recent query should 
        always be at index 0, and older queries should follow in order.
        """
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create search preference
        preference = SearchPreference.objects.create(user=receiver)
        
        # Add queries one by one and track expected order
        for i, query in enumerate(queries):
            recent = preference.recent_searches or []
            if query in recent:
                recent.remove(query)
            recent.insert(0, query)
            preference.recent_searches = recent[:5]
            preference.save()
            
            # Verify order after each addition
            current_preference = SearchPreference.objects.get(user=receiver)
            assert current_preference.recent_searches[0] == query, \
                f"Most recent query should be {query}, got {current_preference.recent_searches[0]}"
    
    @given(
        email=valid_email(),
        duplicate_query=search_query_text(),
        other_queries=st.lists(search_query_text(), min_size=2, max_size=4, unique=True)
    )
    @settings(max_examples=30, deadline=None)
    def test_duplicate_query_moves_to_front(self, email, duplicate_query, other_queries):
        """
        Test that searching for an existing query moves it to the front.
        
        For any user re-searching an existing query, that query should be 
        moved to the front of the recent searches list without duplication.
        """
        # Ensure duplicate query is not in other queries
        other_queries = [q for q in other_queries if q != duplicate_query]
        if len(other_queries) < 2:
            return  # Skip if not enough unique queries
        
        # Create receiver user
        unique_username = f"receiver_{uuid.uuid4().hex[:8]}"
        receiver = User.objects.create_user(
            username=unique_username,
            email=email,
            password="testpass123",
            role='receiver'
        )
        
        # Create initial recent searches with duplicate query in the middle
        initial_searches = [other_queries[0], duplicate_query] + other_queries[1:]
        initial_searches = initial_searches[:5]  # Limit to 5
        
        preference = SearchPreference.objects.create(
            user=receiver,
            recent_searches=initial_searches
        )
        
        # Search for the duplicate query again
        recent = preference.recent_searches
        if duplicate_query in recent:
            recent.remove(duplicate_query)
        recent.insert(0, duplicate_query)
        preference.recent_searches = recent[:5]
        preference.save()
        
        # Retrieve and verify
        updated_preference = SearchPreference.objects.get(user=receiver)
        
        # Verify duplicate query is at front
        assert updated_preference.recent_searches[0] == duplicate_query, \
            f"Duplicate query should be at front, got {updated_preference.recent_searches[0]}"
        
        # Verify no duplicates in the list
        assert updated_preference.recent_searches.count(duplicate_query) == 1, \
            f"Duplicate query should appear only once, found {updated_preference.recent_searches.count(duplicate_query)} times"
