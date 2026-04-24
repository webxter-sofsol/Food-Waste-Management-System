    from rest_framework import generics, status, permissions
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework.pagination import PageNumberPagination
    from django.utils import timezone
    from django.db.models import Q, F
    from django.shortcuts import get_object_or_404
    from math import radians, cos, sin, asin, sqrt
    import logging

    from .models import FoodListing
    from .serializers import (
        FoodListingSerializer, 
        FoodListingComparisonSerializer,
        SearchPreferenceSerializer
    )
    from safety_analytics.models import SearchPreference
    from authentication.permissions import IsDonor, IsReceiver
    from matching.models import Match

    logger = logging.getLogger(__name__)


    class FoodListingPagination(PageNumberPagination):
        """Custom pagination for food listings"""
        page_size = 20
        page_size_query_param = 'page_size'
        max_page_size = 100


    class FoodListingCreateView(generics.CreateAPIView):
        """Create food listing - Donors only"""
        
        serializer_class = FoodListingSerializer
        permission_classes = [permissions.IsAuthenticated, IsDonor]
        
        def perform_create(self, serializer):
            """Save listing with donor — starts as pending admin approval"""
            from django.core.cache import cache
            listing = serializer.save(donor=self.request.user, status='pending')
            cache.delete('admin_metrics')
            logger.info(f"Food listing created (pending): {listing.id} by {self.request.user.email}")


    class DonorListingsView(generics.ListAPIView):
        """List all food listings for the authenticated donor"""
        
        serializer_class = FoodListingSerializer
        permission_classes = [permissions.IsAuthenticated, IsDonor]
        
        def get_queryset(self):
            """Return only the authenticated donor's listings"""
            return FoodListing.objects.filter(donor=self.request.user).order_by('-created_at')


    class FoodListingListView(generics.ListAPIView):
        """Browse and search food listings - Receivers only"""
        
        serializer_class = FoodListingSerializer
        permission_classes = [permissions.IsAuthenticated, IsReceiver]
        pagination_class = FoodListingPagination
        
        def get_queryset(self):
            """Get active listings with filtering and sorting"""
            # Auto-expire listings whose expiry_time has passed
            FoodListing.objects.filter(
                status='available',
                expiry_time__lte=timezone.now()
            ).update(status='expired')

            queryset = FoodListing.objects.filter(
                status='available',
                expiry_time__gt=timezone.now()
            )
            
            # Apply filters
            food_type = self.request.query_params.get('food_type')
            if food_type:
                queryset = queryset.filter(food_type__icontains=food_type)
            
            # Dietary filters
            if self.request.query_params.get('vegetarian') == 'true':
                queryset = queryset.filter(is_vegetarian=True)
            if self.request.query_params.get('vegan') == 'true':
                queryset = queryset.filter(is_vegan=True)
            if self.request.query_params.get('gluten_free') == 'true':
                queryset = queryset.filter(is_gluten_free=True)
            
            # Expiry time filter (hours from now)
            expiry_hours = self.request.query_params.get('expiry_hours')
            if expiry_hours:
                try:
                    hours = int(expiry_hours)
                    expiry_threshold = timezone.now() + timezone.timedelta(hours=hours)
                    queryset = queryset.filter(expiry_time__lte=expiry_threshold)
                except ValueError:
                    pass
            
            # Distance filter
            max_distance = self.request.query_params.get('max_distance')
            if max_distance and hasattr(self.request.user, 'profile'):
                try:
                    max_dist = float(max_distance)
                    user_profile = self.request.user.profile
                    if user_profile.latitude and user_profile.longitude:
                        # Filter by distance (this is a simplified approach)
                        # In production, you'd use PostGIS or similar for efficient geo queries
                        filtered_ids = []
                        for listing in queryset:
                            distance = self._calculate_distance(
                                user_profile.latitude, user_profile.longitude,
                                listing.pickup_latitude, listing.pickup_longitude
                            )
                            if distance <= max_dist:
                                filtered_ids.append(listing.id)
                        queryset = queryset.filter(id__in=filtered_ids)
                except (ValueError, AttributeError):
                    pass
            
            # Apply sorting
            sort_by = self.request.query_params.get('sort_by', 'created_at')
            sort_order = self.request.query_params.get('sort_order', 'desc')
            
            if sort_by == 'freshness_score':
                order_field = 'freshness_score'
            elif sort_by == 'quantity':
                order_field = 'available_quantity'
            elif sort_by == 'expiry_time':
                order_field = 'expiry_time'
            elif sort_by == 'distance':
                # For distance sorting, we'll use a simplified approach
                # In production, use database-level geo sorting
                order_field = 'created_at'  # Fallback
            else:
                order_field = 'created_at'
            
            if sort_order == 'desc':
                order_field = f'-{order_field}'
            
            return queryset.order_by(order_field)
        
        def _calculate_distance(self, lat1, lon1, lat2, lon2):
            """Calculate distance between two points using Haversine formula"""
            # Convert decimal degrees to radians
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            
            # Radius of earth in kilometers
            r = 6371
            return c * r


    class FoodListingDetailView(generics.RetrieveAPIView):
        """Get food listing details"""
        
        serializer_class = FoodListingSerializer
        permission_classes = [permissions.IsAuthenticated]
        
        def get_queryset(self):
            """Allow donors to see their own listings, receivers to see available ones"""
            if hasattr(self.request.user, 'role') and self.request.user.role == 'donor':
                return FoodListing.objects.filter(donor=self.request.user)
            else:
                return FoodListing.objects.filter(status='available')


    class FoodListingUpdateView(generics.UpdateAPIView):
        """Update food listing - Donors only, before match creation"""
        
        serializer_class = FoodListingSerializer
        permission_classes = [permissions.IsAuthenticated, IsDonor]
        
        def get_queryset(self):
            """Only allow updating own listings"""
            return FoodListing.objects.filter(donor=self.request.user)
        
        def update(self, request, *args, **kwargs):
            """Check if listing can be updated (no matches exist)"""
            listing = self.get_object()
            
            # Check if any matches exist for this listing
            if Match.objects.filter(listing=listing).exists():
                return Response(
                    {"error": "Cannot update listing after match has been created"},
                    status=status.HTTP_409_CONFLICT
                )
            
            return super().update(request, *args, **kwargs)


    class FoodListingDeleteView(generics.DestroyAPIView):
        """Cancel/delete food listing - Donors only"""
        
        permission_classes = [permissions.IsAuthenticated, IsDonor]
        
        def get_queryset(self):
            """Only allow deleting own listings"""
            return FoodListing.objects.filter(donor=self.request.user)
        
        def destroy(self, request, *args, **kwargs):
            """Cancel listing with reason and notify receivers"""
            listing = self.get_object()
            cancellation_reason = request.data.get('reason', 'No reason provided')
            
            # Update listing status to cancelled
            listing.status = 'cancelled'
            listing.save()
            
            # TODO: Notify all receivers with pending requests
            # This would be implemented with the notification system
            
            logger.info(f"Food listing cancelled: {listing.id} by {request.user.email}, reason: {cancellation_reason}")
            
            return Response(
                {"message": "Food listing cancelled successfully"},
                status=status.HTTP_200_OK
            )


    @api_view(['POST'])
    @permission_classes([permissions.IsAuthenticated, IsReceiver])
    def compare_food_listings(request):
        """Compare up to 4 food listings"""
        
        listing_ids = request.data.get('listing_ids', [])
        
        # Validate listing IDs
        if not listing_ids:
            return Response(
                {"error": "listing_ids is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(listing_ids) > 4:
            return Response(
                {"error": "Maximum 4 listings can be compared"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get listings
        listings = FoodListing.objects.filter(
            id__in=listing_ids,
            status='available'
        )
        
        if len(listings) != len(listing_ids):
            return Response(
                {"error": "Some listings not found or not available"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize listings
        serializer = FoodListingComparisonSerializer(
            listings, 
            many=True, 
            context={'request': request}
        )
        
        # Identify differences between listings
        comparison_data = {
            'listings': serializer.data,
            'differences': _identify_differences(serializer.data)
        }
        
        return Response(comparison_data, status=status.HTTP_200_OK)


    def _identify_differences(listings_data):
        """Identify fields that differ between listings"""
        if len(listings_data) < 2:
            return []
        
        differences = []
        fields_to_compare = [
            'food_type', 'quantity', 'unit', 'expiry_time', 'freshness_score',
            'is_vegetarian', 'is_vegan', 'is_gluten_free', 'distance'
        ]
        
        for field in fields_to_compare:
            values = [listing.get(field) for listing in listings_data]
            if len(set(str(v) for v in values)) > 1:  # Convert to string for comparison
                differences.append({
                    'field': field,
                    'values': dict(zip([listing['id'] for listing in listings_data], values))
                })
        
        return differences


    class SearchPreferenceView(generics.RetrieveUpdateAPIView):
        """Get and update search preferences"""
        
        serializer_class = SearchPreferenceSerializer
        permission_classes = [permissions.IsAuthenticated, IsReceiver]
        
        def get_object(self):
            """Get or create search preference for user"""
            preference, created = SearchPreference.objects.get_or_create(
                user=self.request.user
            )
            return preference
        
        def update(self, request, *args, **kwargs):
            """Update search preferences and manage recent searches"""
            preference = self.get_object()
            
            # Handle recent searches
            if 'recent_search' in request.data:
                recent_search = request.data['recent_search']
                recent_searches = preference.recent_searches or []
                
                # Remove if already exists
                if recent_search in recent_searches:
                    recent_searches.remove(recent_search)
                
                # Add to beginning
                recent_searches.insert(0, recent_search)
                
                # Keep only 5 most recent
                recent_searches = recent_searches[:5]
                
                request.data['recent_searches'] = recent_searches
            
            return super().update(request, *args, **kwargs)


    @api_view(['PUT'])
    @permission_classes([permissions.IsAuthenticated, IsReceiver])
    def clear_search_preferences(request):
        """Clear saved search preferences"""
        
        try:
            preference = SearchPreference.objects.get(user=request.user)
            preference.filters = {}
            preference.recent_searches = []
            preference.save()
            
            return Response(
                {"message": "Search preferences cleared successfully"},
                status=status.HTTP_200_OK
            )
        except SearchPreference.DoesNotExist:
            return Response(
                {"message": "No search preferences to clear"},
                status=status.HTTP_200_OK
            )
