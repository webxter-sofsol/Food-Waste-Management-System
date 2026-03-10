from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from datetime import datetime, timezone


class FoodListing(models.Model):
    """Food listing model with freshness score calculation"""
    
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    UNIT_CHOICES = [
        ('servings', 'Servings'),
        ('kg', 'Kilograms'),
        ('liters', 'Liters'),
    ]
    
    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_listings'
    )
    food_type = models.CharField(max_length=255)
    description = models.TextField()
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='servings')
    
    # Time fields
    preparation_time = models.DateTimeField()
    expiry_time = models.DateTimeField(db_index=True)
    freshness_score = models.FloatField(default=0.0)
    
    # Location
    pickup_address = models.CharField(max_length=500)
    pickup_latitude = models.FloatField()
    pickup_longitude = models.FloatField()
    
    # Dietary attributes
    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    is_gluten_free = models.BooleanField(default=False)
    allergen_info = models.JSONField(default=list, blank=True)
    
    # Status and availability
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='available',
        db_index=True
    )
    available_quantity = models.IntegerField(validators=[MinValueValidator(0)])
    
    # Images (array of image URLs)
    images = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'food_listings'
        indexes = [
            models.Index(fields=['expiry_time']),
            models.Index(fields=['status']),
            models.Index(fields=['donor']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.food_type} - {self.quantity} {self.unit} by {self.donor.email}"
    
    def calculate_freshness_score(self):
        """
        Calculate freshness score based on preparation time and expiry time.
        Score ranges from 0 to 100, where:
        - 100 = freshly prepared with long shelf life
        - 0 = expired or about to expire
        """
        now = datetime.now(timezone.utc)
        
        # Make times timezone-aware if they aren't
        prep_time = self.preparation_time
        exp_time = self.expiry_time
        
        if prep_time.tzinfo is None:
            prep_time = prep_time.replace(tzinfo=timezone.utc)
        if exp_time.tzinfo is None:
            exp_time = exp_time.replace(tzinfo=timezone.utc)
        
        # If already expired, score is 0
        if now >= exp_time:
            return 0.0
        
        # Total shelf life in seconds
        total_shelf_life = (exp_time - prep_time).total_seconds()
        
        # Remaining shelf life in seconds
        remaining_shelf_life = (exp_time - now).total_seconds()
        
        # Avoid division by zero
        if total_shelf_life <= 0:
            return 0.0
        
        # Calculate score as percentage of remaining shelf life
        score = (remaining_shelf_life / total_shelf_life) * 100
        
        # Ensure score is between 0 and 100
        return max(0.0, min(100.0, score))
    
    def save(self, *args, **kwargs):
        """Override save to calculate freshness score and set available_quantity"""
        # Calculate freshness score before saving
        self.freshness_score = self.calculate_freshness_score()
        
        # Set available_quantity to quantity on first save if not set
        if self.pk is None and not self.available_quantity:
            self.available_quantity = self.quantity
        
        super().save(*args, **kwargs)
    
    def validate_images(self):
        """Validate that no more than 5 images are uploaded"""
        if len(self.images) > 5:
            raise ValueError("Maximum 5 images allowed per food listing")
