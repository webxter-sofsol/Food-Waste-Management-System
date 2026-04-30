from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from cryptography.fernet import Fernet
from django.conf import settings
import os


# Encryption key management
def get_encryption_key():
    """Get or create encryption key for sensitive data"""
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        # Generate a key if not exists (for development)
        key = Fernet.generate_key().decode()
    return key.encode() if isinstance(key, str) else key


class User(AbstractUser):
    """Custom User model extending AbstractUser with role and verification status"""
    
    ROLE_CHOICES = [
        ('donor', 'Donor'),
        ('receiver', 'Receiver'),
        ('volunteer', 'Volunteer'),
        ('admin', 'Admin'),
    ]
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending'
    )
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Use email as username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role', 'verification_status']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.role})"


class UserProfile(models.Model):
    """User profile with role-specific fields and encrypted sensitive data"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255)
    
    # Encrypted sensitive fields (stored as binary)
    phone_encrypted = models.BinaryField(null=True, blank=True)
    address_encrypted = models.BinaryField(null=True, blank=True)
    latitude_encrypted = models.BinaryField(null=True, blank=True)
    longitude_encrypted = models.BinaryField(null=True, blank=True)
    
    # Receiver-specific fields
    RECEIVER_TYPE_CHOICES = [
        ('individual', 'Individual'),
        ('ngo', 'NGO'),
        ('shelter', 'Shelter'),
        ('orphanage', 'Orphanage'),
    ]
    receiver_type = models.CharField(
        max_length=20,
        choices=RECEIVER_TYPE_CHOICES,
        null=True,
        blank=True,
    )
    verification_document = models.FileField(
        upload_to='verification_docs/',
        null=True,
        blank=True,
        help_text='Required for NGO, Shelter, and Orphanage receiver types'
    )
    dietary_preferences = models.JSONField(null=True, blank=True, default=list)
    allergies = models.JSONField(null=True, blank=True, default=list)
    
    # Donor-specific fields
    organization_name = models.CharField(max_length=255, null=True, blank=True)
    food_types = models.JSONField(null=True, blank=True, default=list)
    operating_hours = models.JSONField(null=True, blank=True, default=dict)
    
    # Volunteer-specific fields
    available_time_slots = models.JSONField(null=True, blank=True, default=list)
    transportation_capacity = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    
    # Ratings
    average_rating = models.FloatField(default=0.0)
    total_ratings = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"Profile: {self.full_name} ({self.user.email})"
    
    # Encryption/Decryption methods for sensitive data
    def _get_cipher(self):
        """Get Fernet cipher for encryption/decryption"""
        return Fernet(get_encryption_key())
    
    def _encrypt_value(self, value):
        """Encrypt a string value"""
        if value is None:
            return None
        cipher = self._get_cipher()
        return cipher.encrypt(str(value).encode())
    
    def _decrypt_value(self, encrypted_value):
        """Decrypt an encrypted value"""
        if encrypted_value is None:
            return None
        cipher = self._get_cipher()
        return cipher.decrypt(bytes(encrypted_value)).decode()
    
    # Phone property
    @property
    def phone(self):
        """Get decrypted phone number"""
        return self._decrypt_value(self.phone_encrypted)
    
    @phone.setter
    def phone(self, value):
        """Set encrypted phone number"""
        self.phone_encrypted = self._encrypt_value(value)
    
    # Address property
    @property
    def address(self):
        """Get decrypted address"""
        return self._decrypt_value(self.address_encrypted)
    
    @address.setter
    def address(self, value):
        """Set encrypted address"""
        self.address_encrypted = self._encrypt_value(value)
    
    # Latitude property
    @property
    def latitude(self):
        """Get decrypted latitude"""
        value = self._decrypt_value(self.latitude_encrypted)
        return float(value) if value else None
    
    @latitude.setter
    def latitude(self, value):
        """Set encrypted latitude"""
        self.latitude_encrypted = self._encrypt_value(value)
    
    # Longitude property
    @property
    def longitude(self):
        """Get decrypted longitude"""
        value = self._decrypt_value(self.longitude_encrypted)
        return float(value) if value else None
    
    @longitude.setter
    def longitude(self, value):
        """Set encrypted longitude"""
        self.longitude_encrypted = self._encrypt_value(value)
