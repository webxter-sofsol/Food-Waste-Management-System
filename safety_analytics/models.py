from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


class Notification(models.Model):
    """Notification model for user notifications"""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('food_request', 'Food Request'),
        ('match_created', 'Match Created'),
        ('volunteer_assignment', 'Volunteer Assignment'),
        ('safety_alert', 'Safety Alert'),
        ('delivery_update', 'Delivery Update'),
        ('verification', 'Verification'),
        ('cancellation', 'Cancellation'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Related entity (optional)
    related_entity_type = models.CharField(max_length=50, null=True, blank=True)
    related_entity_id = models.IntegerField(null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    sent_via_email = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} for {self.user.email}"


class NotificationPreference(models.Model):
    """User notification preferences"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    notification_type = models.CharField(max_length=30)
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'notification_preferences'
        unique_together = ['user', 'notification_type']
    
    def __str__(self):
        return f"{self.user.email} - {self.notification_type}"


class Rating(models.Model):
    """Rating model for user ratings"""
    
    RATING_TYPE_CHOICES = [
        ('food_quality', 'Food Quality'),
        ('volunteer_service', 'Volunteer Service'),
        ('cooperation', 'Cooperation'),
    ]
    
    match = models.ForeignKey(
        'matching.Match',
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_given'
    )
    rated_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ratings_received'
    )
    rating_type = models.CharField(max_length=30, choices=RATING_TYPE_CHOICES)
    rating_value = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ratings'
        indexes = [
            models.Index(fields=['rated_user']),
            models.Index(fields=['match']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.rater.email} rated {self.rated_user.email}: {self.rating_value}/5"


class SuccessStory(models.Model):
    """Success story model for completed donations"""
    
    match = models.OneToOneField(
        'matching.Match',
        on_delete=models.CASCADE,
        related_name='success_story'
    )
    donor_name = models.CharField(max_length=255)
    receiver_name = models.CharField(max_length=255)
    food_quantity = models.IntegerField()
    food_type = models.CharField(max_length=255)
    completion_date = models.DateTimeField()
    
    testimonial = models.TextField(null=True, blank=True)
    photos = models.JSONField(default=list, blank=True)  # Array of image URLs
    is_public = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'success_stories'
        verbose_name_plural = 'Success Stories'
        ordering = ['-completion_date']
    
    def __str__(self):
        return f"Success: {self.donor_name} -> {self.receiver_name} ({self.food_type})"


class SearchPreference(models.Model):
    """User search preferences for food listings"""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='search_preference'
    )
    filters = models.JSONField(default=dict, blank=True)  # Saved filter preferences
    recent_searches = models.JSONField(default=list, blank=True)  # Max 5 recent queries
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'search_preferences'
    
    def __str__(self):
        return f"Search preferences for {self.user.email}"


class AuditLog(models.Model):
    """Audit log for security and administrative actions"""
    
    ACTION_TYPE_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('register', 'Register'),
        ('login_rate_limited', 'Login Rate Limited'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('admin_action', 'Admin Action'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action_type = models.CharField(max_length=20, choices=ACTION_TYPE_CHOICES)
    entity_type = models.CharField(max_length=50, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    details = models.JSONField(null=True, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['action_type']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        user_email = self.user.email if self.user else "Anonymous"
        return f"{self.action_type} by {user_email} at {self.timestamp}"
