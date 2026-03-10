"""
Serializers for authentication module
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import authenticate
from .models import User, UserProfile
import re


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration with validation"""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'role']
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
            'role': {'required': True}
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Email is required")
        
        # Email format validation (basic regex)
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")
        
        # Check uniqueness
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")
        
        return value.lower()
    
    def validate_password(self, value):
        """Validate password strength"""
        if not value:
            raise serializers.ValidationError("Password is required")
        
        # Use Django's password validators
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        # Additional custom validation for password strength
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character")
        
        return value
    
    def validate_role(self, value):
        """Validate role is one of the allowed choices"""
        valid_roles = ['donor', 'receiver', 'volunteer', 'admin']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Role must be one of: {', '.join(valid_roles)}")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation matches"""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        return attrs
    
    def create(self, validated_data):
        """Create user with encrypted password"""
        # Remove password_confirm as it's not needed for user creation
        validated_data.pop('password_confirm', None)
        
        # Extract password
        password = validated_data.pop('password')
        
        # Set verification status to pending
        validated_data['verification_status'] = 'pending'
        
        # Create user
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate credentials and authenticate user"""
        email = attrs.get('email', '').lower()
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError("Email and password are required")
        
        # Try to get the user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")
        
        # Authenticate
        user = authenticate(username=email, password=password)
        
        if user is None:
            raise serializers.ValidationError("Invalid credentials")
        
        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile with role-specific fields"""
    
    email = serializers.EmailField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    verification_status = serializers.CharField(source='user.verification_status', read_only=True)
    
    # Decrypted fields (using properties)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'role', 'verification_status',
            'full_name', 'phone', 'address', 'latitude', 'longitude',
            'dietary_preferences', 'allergies',
            'organization_name', 'food_types', 'operating_hours',
            'available_time_slots', 'transportation_capacity',
            'average_rating', 'total_ratings',
            'updated_at', 'created_at'
        ]
        read_only_fields = ['id', 'average_rating', 'total_ratings', 'updated_at', 'created_at']
    
    def validate(self, attrs):
        """Validate role-specific fields"""
        user = self.instance.user if self.instance else self.context.get('request').user
        role = user.role
        
        # Validate receiver-specific fields
        if role == 'receiver':
            if 'dietary_preferences' in attrs and not isinstance(attrs['dietary_preferences'], list):
                raise serializers.ValidationError({"dietary_preferences": "Must be a list"})
            if 'allergies' in attrs and not isinstance(attrs['allergies'], list):
                raise serializers.ValidationError({"allergies": "Must be a list"})
        
        # Validate donor-specific fields
        if role == 'donor':
            if 'food_types' in attrs and not isinstance(attrs['food_types'], list):
                raise serializers.ValidationError({"food_types": "Must be a list"})
            if 'operating_hours' in attrs and not isinstance(attrs['operating_hours'], dict):
                raise serializers.ValidationError({"operating_hours": "Must be a dictionary"})
        
        # Validate volunteer-specific fields
        if role == 'volunteer':
            if 'available_time_slots' in attrs and not isinstance(attrs['available_time_slots'], list):
                raise serializers.ValidationError({"available_time_slots": "Must be a list"})
            if 'transportation_capacity' in attrs:
                capacity = attrs['transportation_capacity']
                if capacity is not None and capacity < 1:
                    raise serializers.ValidationError({"transportation_capacity": "Must be at least 1"})
        
        return attrs
    
    def update(self, instance, validated_data):
        """Update profile with encrypted sensitive fields"""
        # Handle encrypted fields using properties
        if 'phone' in validated_data:
            instance.phone = validated_data.pop('phone')
        if 'address' in validated_data:
            instance.address = validated_data.pop('address')
        if 'latitude' in validated_data:
            instance.latitude = validated_data.pop('latitude')
        if 'longitude' in validated_data:
            instance.longitude = validated_data.pop('longitude')
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
