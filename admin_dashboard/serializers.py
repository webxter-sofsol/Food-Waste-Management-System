"""
Serializers for admin dashboard module
"""
from rest_framework import serializers
from authentication.models import User, UserProfile


class PendingUserSerializer(serializers.ModelSerializer):
    """Serializer for pending user verifications"""
    
    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    organization_name = serializers.CharField(source='profile.organization_name', read_only=True, allow_null=True)
    phone = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'verification_status',
            'full_name', 'organization_name', 'phone', 'date_joined'
        ]
        read_only_fields = fields
    
    def get_phone(self, obj):
        """Get decrypted phone number if profile exists"""
        if hasattr(obj, 'profile'):
            return obj.profile.phone
        return None


class UserVerificationSerializer(serializers.Serializer):
    """Serializer for user verification actions"""
    
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate_reason(self, value):
        """Validate reason field - remove null characters"""
        if value:
            # Remove null characters and other control characters
            value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')
        return value
