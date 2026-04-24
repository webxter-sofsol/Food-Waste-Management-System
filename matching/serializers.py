from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import FoodRequest, Match
from food_listings.models import FoodListing

User = get_user_model()


class FoodRequestSerializer(serializers.ModelSerializer):
    """Serializer for food request creation and management"""
    
    receiver_name = serializers.CharField(source='receiver.profile.full_name', read_only=True)
    listing_food_type = serializers.CharField(source='listing.food_type', read_only=True)
    listing_available_quantity = serializers.IntegerField(source='listing.available_quantity', read_only=True)
    donor_id = serializers.IntegerField(source='listing.donor.id', read_only=True)
    donor_name = serializers.CharField(source='listing.donor.profile.full_name', read_only=True)
    
    class Meta:
        model = FoodRequest
        fields = [
            'id', 'listing', 'receiver', 'requested_quantity', 
            'pickup_time_preference', 'special_instructions', 'status',
            'rejection_reason', 'created_at', 'updated_at',
            'receiver_name', 'listing_food_type', 'listing_available_quantity',
            'donor_id', 'donor_name'
        ]
        read_only_fields = [
            'id', 'receiver', 'status', 'rejection_reason', 
            'created_at', 'updated_at', 'receiver_name', 
            'listing_food_type', 'listing_available_quantity',
            'donor_id', 'donor_name'
        ]
    
    def validate_listing(self, value):
        """Validate that listing exists and is available"""
        if value.status != 'available':
            raise serializers.ValidationError(
                "This food listing is no longer available"
            )
        
        # Check if listing has expired
        if value.expiry_time <= timezone.now():
            raise serializers.ValidationError(
                "This food listing has expired"
            )
        
        return value
    
    def validate_requested_quantity(self, value):
        """Validate that requested quantity is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Requested quantity must be greater than 0"
            )
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        # Validate requested_quantity <= available_quantity
        listing = data.get('listing')
        requested_quantity = data.get('requested_quantity')
        
        if listing and requested_quantity:
            if requested_quantity > listing.available_quantity:
                raise serializers.ValidationError({
                    'requested_quantity': f"Requested quantity ({requested_quantity}) exceeds available quantity ({listing.available_quantity})"
                })
        
        # Check for duplicate requests (unique constraint on listing_id, receiver_id)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            receiver = request.user
            listing = data.get('listing')
            
            # Check if there's already an active request
            if listing:
                existing_request = FoodRequest.objects.filter(
                    listing=listing,
                    receiver=receiver,
                    status__in=['pending', 'approved']
                ).exists()
                
                if existing_request:
                    raise serializers.ValidationError(
                        "You already have an active request for this food listing"
                    )
        
        return data
    
    def create(self, validated_data):
        """Create food request with receiver from request"""
        request = self.context.get('request')
        validated_data['receiver'] = request.user
        return super().create(validated_data)


class MatchSerializer(serializers.ModelSerializer):
    """Serializer for match records"""
    
    donor_name = serializers.CharField(source='donor.profile.full_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.profile.full_name', read_only=True)
    listing_food_type = serializers.CharField(source='listing.food_type', read_only=True)
    listing_pickup_address = serializers.CharField(source='listing.pickup_address', read_only=True)
    listing_pickup_latitude = serializers.FloatField(source='listing.pickup_latitude', read_only=True)
    listing_pickup_longitude = serializers.FloatField(source='listing.pickup_longitude', read_only=True)
    receiver_address = serializers.SerializerMethodField()
    receiver_latitude = serializers.SerializerMethodField()
    receiver_longitude = serializers.SerializerMethodField()
    
    class Meta:
        model = Match
        fields = [
            'id', 'listing', 'request', 'donor', 'receiver', 
            'matched_quantity', 'status', 'created_at', 'completed_at',
            'donor_name', 'receiver_name', 'listing_food_type',
            'listing_pickup_address', 'listing_pickup_latitude', 
            'listing_pickup_longitude', 'receiver_address',
            'receiver_latitude', 'receiver_longitude'
        ]
        read_only_fields = [
            'id', 'created_at', 'completed_at', 'donor_name', 
            'receiver_name', 'listing_food_type', 'listing_pickup_address',
            'listing_pickup_latitude', 'listing_pickup_longitude',
            'receiver_address', 'receiver_latitude', 'receiver_longitude'
        ]
    
    def get_receiver_address(self, obj):
        """Get receiver address (decrypted)"""
        try:
            return obj.receiver.profile.address
        except:
            return None
    
    def get_receiver_latitude(self, obj):
        """Get receiver latitude (decrypted)"""
        try:
            return obj.receiver.profile.latitude
        except:
            return None
    
    def get_receiver_longitude(self, obj):
        """Get receiver longitude (decrypted)"""
        try:
            return obj.receiver.profile.longitude
        except:
            return None
