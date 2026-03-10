from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings


class FoodRequest(models.Model):
    """Food request model with constraints"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    listing = models.ForeignKey(
        'food_listings.FoodListing',
        on_delete=models.CASCADE,
        related_name='requests'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_requests'
    )
    requested_quantity = models.IntegerField(validators=[MinValueValidator(1)])
    pickup_time_preference = models.DateTimeField()
    special_instructions = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    rejection_reason = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'food_requests'
        indexes = [
            models.Index(fields=['listing']),
            models.Index(fields=['receiver']),
            models.Index(fields=['status']),
        ]
        # Unique constraint: one active request per listing per receiver
        constraints = [
            models.UniqueConstraint(
                fields=['listing', 'receiver'],
                condition=models.Q(status='pending') | models.Q(status='approved'),
                name='unique_active_request_per_listing_receiver'
            )
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Request by {self.receiver.email} for {self.listing.food_type}"


class Match(models.Model):
    """Match model linking approved food requests to donors and receivers"""
    
    STATUS_CHOICES = [
        ('matched', 'Matched'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    listing = models.ForeignKey(
        'food_listings.FoodListing',
        on_delete=models.CASCADE,
        related_name='matches'
    )
    request = models.ForeignKey(
        FoodRequest,
        on_delete=models.CASCADE,
        related_name='match'
    )
    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='donor_matches'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='receiver_matches'
    )
    matched_quantity = models.IntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='matched',
        db_index=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'matches'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['donor']),
            models.Index(fields=['receiver']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Match: {self.donor.email} -> {self.receiver.email} ({self.listing.food_type})"
