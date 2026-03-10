from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from math import radians, cos, sin, asin, sqrt
from .models import FoodListing
from safety_analytics.models import SearchPreference

User = get_user_model()


class FoodListingSerializer(serializers.ModelSerializer):
    """Serializer for food listing creation and updates"""
    
    donor_name = serializers.CharField(source='donor.profile.full_name', read_only=True)
    donor_organization = serializers.CharField(source='donor.profile.organization_name', read_only=True)
    distance = serializers.SerializerMethodField()
    expiry_countdown = serializers.SerializerMethodField()
    
    class Meta:
        model = FoodListing
        fields = [
            'id', 'food_type', 'description', 'quantity', 'unit',
            'preparation_time', 'expiry_time', 'freshness_score',
            'pickup_address', 'pickup_latitude', 'pickup_longitude',
            'is_vegetarian', 'is_vegan', 'is_gluten_free', 'allergen_info',
            'status', 'available_quantity', 'images', 'created_at', 'updated_at',
            'donor_name', 'donor_organization', 'distance', 'expiry_countdown'
        ]
        read_only_fields = ['id', 'freshness_score', 'status', 'available_quantity', 
                           'created_at', 'updated_at', 'donor_name', 'donor_organization',
                           'distance', 'expiry_countdown']
    
    def validate_expiry_time(self, value):
        """Validate that expiry time is in the future"""
        if value <= timezone.now():
            raise serializers.ValidationError("Expiry time must be in the future")
        return value
    
    def validate_images(self, value):
        """Validate that no more than 5 images are provided"""
        if len(value) > 5:
            raise serializers.ValidationError("Maximum 5 images allowed per food listing")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        if 'preparation_time' in data and 'expiry_time' in data:
            if data['preparation_time'] >= data['expiry_time']:
                raise serializers.ValidationError(
                    "Preparation time must be before expiry time"
                )
        return data
    
    def get_distance(self, obj):
        """Calculate distance from receiver location to pickup location"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        try:
            user_profile = request.user.profile
            if user_profile.latitude and user_profile.longitude:
                return self._calculate_distance(
                    user_profile.latitude, user_profile.longitude,
                    obj.pickup_latitude, obj.pickup_longitude
                )
        except:
            pass
        return None
    
    def get_expiry_countdown(self, obj):
        """Get time remaining until expiry in seconds"""
        now = timezone.now()
        if obj.expiry_time <= now:
            return 0
        return int((obj.expiry_time - now).total_seconds())
    
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
        return round(c * r, 2)
    
    def create(self, validated_data):
        """Create food listing with donor from request"""
        request = self.context.get('request')
        validated_data['donor'] = request.user
        return super().create(validated_data)


class FoodListingComparisonSerializer(serializers.ModelSerializer):
    """Serializer for food listing comparison view"""
    
    donor_name = serializers.CharField(source='donor.profile.full_name', read_only=True)
    donor_organization = serializers.CharField(source='donor.profile.organization_name', read_only=True)
    distance = serializers.SerializerMethodField()
    expiry_countdown = serializers.SerializerMethodField()
    
    class Meta:
        model = FoodListing
        fields = [
            'id', 'food_type', 'description', 'quantity', 'unit',
            'expiry_time', 'freshness_score', 'pickup_address',
            'pickup_latitude', 'pickup_longitude',
            'is_vegetarian', 'is_vegan', 'is_gluten_free', 'allergen_info',
            'available_quantity', 'images', 'donor_name', 'donor_organization',
            'distance', 'expiry_countdown'
        ]
    
    def get_distance(self, obj):
        """Calculate distance from receiver location to pickup location"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        try:
            user_profile = request.user.profile
            if user_profile.latitude and user_profile.longitude:
                return self._calculate_distance(
                    user_profile.latitude, user_profile.longitude,
                    obj.pickup_latitude, obj.pickup_longitude
                )
        except:
            pass
        return None
    
    def get_expiry_countdown(self, obj):
        """Get time remaining until expiry in seconds"""
        now = timezone.now()
        if obj.expiry_time <= now:
            return 0
        return int((obj.expiry_time - now).total_seconds())
    
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
        return round(c * r, 2)


class SearchPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for search preferences"""
    
    class Meta:
        model = SearchPreference
        fields = ['filters', 'recent_searches', 'updated_at']
        read_only_fields = ['updated_at']
    
    def validate_recent_searches(self, value):
        """Ensure recent searches doesn't exceed 5 items"""
        if len(value) > 5:
            # Keep only the 5 most recent
            return value[-5:]
        return value