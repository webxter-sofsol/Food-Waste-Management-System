from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings


class PickupCoordination(models.Model):
    """Pickup coordination model for volunteer assignments"""
    
    ASSIGNMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('accepted', 'Accepted'),
        ('completed', 'Completed'),
    ]
    
    match = models.ForeignKey(
        'matching.Match',
        on_delete=models.CASCADE,
        related_name='pickup_coordination'
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pickup_assignments'
    )
    
    # Location data stored as JSON with lat/lon
    donor_location = models.JSONField()  # {"lat": float, "lon": float}
    receiver_location = models.JSONField()  # {"lat": float, "lon": float}
    
    food_quantity = models.IntegerField(validators=[MinValueValidator(1)])
    required_pickup_time = models.DateTimeField()
    
    assignment_status = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_STATUS_CHOICES,
        default='pending'
    )
    escalation_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'pickup_coordinations'
        indexes = [
            models.Index(fields=['volunteer']),
            models.Index(fields=['assignment_status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        volunteer_email = self.volunteer.email if self.volunteer else "Unassigned"
        return f"Coordination: {volunteer_email} - {self.assignment_status}"
