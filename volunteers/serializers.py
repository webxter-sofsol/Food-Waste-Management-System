"""
Serializers for volunteer coordination module
"""
from rest_framework import serializers
from django.utils import timezone
from .models import PickupCoordination
from matching.models import Match


class AvailableMatchSerializer(serializers.ModelSerializer):
    """Serializer for available matches that volunteers can accept"""
    
    donor_name = serializers.CharField(source='donor.profile.full_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.profile.full_name', read_only=True)
    food_type = serializers.CharField(source='listing.food_type', read_only=True)
    food_quantity = serializers.IntegerField(source='matched_quantity', read_only=True)
    
    # Location details
    donor_location = serializers.SerializerMethodField()
    receiver_location = serializers.SerializerMethodField()
    pickup_address = serializers.CharField(source='listing.pickup_address', read_only=True)
    
    # Pickup coordination details
    coordination_id = serializers.SerializerMethodField()
    required_pickup_time = serializers.SerializerMethodField()
    assignment_status = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    
    class Meta:
        model = Match
        fields = [
            'id', 'donor_name', 'receiver_name', 'food_type', 'food_quantity',
            'donor_location', 'receiver_location', 'pickup_address',
            'coordination_id', 'required_pickup_time', 'assignment_status',
            'distance_km', 'created_at'
        ]
    
    def get_donor_location(self, obj):
        """Get donor location from listing"""
        return {
            'lat': obj.listing.pickup_latitude,
            'lon': obj.listing.pickup_longitude
        }
    
    def get_receiver_location(self, obj):
        """Get receiver location from profile"""
        try:
            return {
                'lat': obj.receiver.profile.latitude,
                'lon': obj.receiver.profile.longitude
            }
        except:
            return None
    
    def get_coordination_id(self, obj):
        """Get pickup coordination ID if exists"""
        try:
            coordination = obj.pickup_coordination.first()
            return coordination.id if coordination else None
        except:
            return None
    
    def get_required_pickup_time(self, obj):
        """Get required pickup time from coordination"""
        try:
            coordination = obj.pickup_coordination.first()
            return coordination.required_pickup_time if coordination else None
        except:
            return None
    
    def get_assignment_status(self, obj):
        """Get assignment status from coordination"""
        try:
            coordination = obj.pickup_coordination.first()
            return coordination.assignment_status if coordination else 'pending'
        except:
            return 'pending'
    
    def get_distance_km(self, obj):
        """Get distance from volunteer to pickup location"""
        # This will be calculated in the view based on volunteer location
        return self.context.get('distance_km')


class PickupCoordinationSerializer(serializers.ModelSerializer):
    """Serializer for pickup coordination records"""
    
    match_id = serializers.IntegerField(source='match.id', read_only=True)
    volunteer_name = serializers.CharField(source='volunteer.profile.full_name', read_only=True)
    donor_name = serializers.CharField(source='match.donor.profile.full_name', read_only=True)
    receiver_name = serializers.CharField(source='match.receiver.profile.full_name', read_only=True)
    food_type = serializers.CharField(source='match.listing.food_type', read_only=True)
    pickup_address = serializers.CharField(source='match.listing.pickup_address', read_only=True)
    
    class Meta:
        model = PickupCoordination
        fields = [
            'id', 'match_id', 'volunteer', 'volunteer_name',
            'donor_name', 'receiver_name', 'food_type',
            'donor_location', 'receiver_location', 'pickup_address',
            'food_quantity', 'required_pickup_time',
            'assignment_status', 'escalation_count',
            'created_at', 'assigned_at'
        ]
        read_only_fields = [
            'id', 'match_id', 'volunteer_name', 'donor_name', 
            'receiver_name', 'food_type', 'pickup_address',
            'escalation_count', 'created_at', 'assigned_at'
        ]


class VolunteerAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for volunteer assignment listing"""
    
    match_id = serializers.IntegerField(source='match.id', read_only=True)
    donor_name = serializers.CharField(source='match.donor.profile.full_name', read_only=True)
    donor_phone = serializers.SerializerMethodField()
    receiver_name = serializers.CharField(source='match.receiver.profile.full_name', read_only=True)
    receiver_phone = serializers.SerializerMethodField()
    receiver_address = serializers.SerializerMethodField()
    food_type = serializers.CharField(source='match.listing.food_type', read_only=True)
    pickup_address = serializers.CharField(source='match.listing.pickup_address', read_only=True)
    
    class Meta:
        model = PickupCoordination
        fields = [
            'id', 'match_id', 'donor_name', 'donor_phone',
            'receiver_name', 'receiver_phone', 'receiver_address',
            'food_type', 'food_quantity', 'pickup_address',
            'donor_location', 'receiver_location',
            'required_pickup_time', 'assignment_status',
            'created_at', 'assigned_at'
        ]
    
    def get_donor_phone(self, obj):
        """Get donor phone (decrypted)"""
        try:
            return obj.match.donor.profile.phone
        except:
            return None
    
    def get_receiver_phone(self, obj):
        """Get receiver phone (decrypted)"""
        try:
            return obj.match.receiver.profile.phone
        except:
            return None
    
    def get_receiver_address(self, obj):
        """Get receiver address (decrypted)"""
        try:
            return obj.match.receiver.profile.address
        except:
            return None
