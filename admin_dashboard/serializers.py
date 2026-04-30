"""
Serializers for admin dashboard module
"""
from rest_framework import serializers
from authentication.models import User, UserProfile


class PendingUserSerializer(serializers.ModelSerializer):
    """Serializer for pending user verifications"""

    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    organization_name = serializers.CharField(source='profile.organization_name', read_only=True, allow_null=True)
    receiver_type = serializers.CharField(source='profile.receiver_type', read_only=True, allow_null=True)
    verification_document = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'verification_status',
            'full_name', 'organization_name', 'phone',
            'receiver_type', 'verification_document', 'date_joined',
        ]
        read_only_fields = fields

    def get_phone(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.phone
        return None

    def get_verification_document(self, obj):
        if hasattr(obj, 'profile') and obj.profile.verification_document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.verification_document.url)
            return obj.profile.verification_document.url
        return None


class AllUsersSerializer(serializers.ModelSerializer):
    """Full user details serializer for admin — includes all profile data."""

    full_name = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    receiver_type = serializers.SerializerMethodField()
    dietary_preferences = serializers.SerializerMethodField()
    allergies = serializers.SerializerMethodField()
    food_types = serializers.SerializerMethodField()
    available_time_slots = serializers.SerializerMethodField()
    transportation_capacity = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    verification_document = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'verification_status',
            'is_active', 'date_joined', 'last_login',
            # profile fields
            'full_name', 'phone', 'address', 'organization_name',
            'receiver_type', 'verification_document',
            'dietary_preferences', 'allergies',
            'food_types',
            'available_time_slots', 'transportation_capacity',
            'average_rating',
        ]
        read_only_fields = fields

    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_full_name(self, obj):
        p = self._profile(obj)
        return p.full_name if p else ''

    def get_organization_name(self, obj):
        p = self._profile(obj)
        return p.organization_name if p else None

    def get_receiver_type(self, obj):
        p = self._profile(obj)
        return p.receiver_type if p else None

    def get_dietary_preferences(self, obj):
        p = self._profile(obj)
        return p.dietary_preferences if p else []

    def get_allergies(self, obj):
        p = self._profile(obj)
        return p.allergies if p else []

    def get_food_types(self, obj):
        p = self._profile(obj)
        return p.food_types if p else []

    def get_available_time_slots(self, obj):
        p = self._profile(obj)
        return p.available_time_slots if p else []

    def get_transportation_capacity(self, obj):
        p = self._profile(obj)
        return p.transportation_capacity if p else None

    def get_average_rating(self, obj):
        p = self._profile(obj)
        return p.average_rating if p else 0.0

    def get_phone(self, obj):
        p = self._profile(obj)
        return p.phone if p else None

    def get_address(self, obj):
        p = self._profile(obj)
        return p.address if p else None

    def get_verification_document(self, obj):
        p = self._profile(obj)
        if p and p.verification_document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(p.verification_document.url)
            return p.verification_document.url
        return None


class UserVerificationSerializer(serializers.Serializer):
    """Serializer for user verification actions"""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate_reason(self, value):
        if value:
            value = ''.join(c for c in value if ord(c) >= 32 or c in '\n\r\t')
        return value
