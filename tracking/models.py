from django.db import models
from django.conf import settings


class DeliveryTracking(models.Model):
    """Real-time delivery tracking model"""
    
    STATUS_CHOICES = [
        ('en_route_to_donor', 'En Route to Donor'),
        ('at_donor', 'At Donor'),
        ('en_route_to_receiver', 'En Route to Receiver'),
        ('delivered', 'Delivered'),
    ]
    
    coordination = models.OneToOneField(
        'volunteers.PickupCoordination',
        on_delete=models.CASCADE,
        related_name='delivery_tracking'
    )
    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='delivery_trackings'
    )
    
    # Current location
    current_latitude = models.FloatField()
    current_longitude = models.FloatField()
    
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='en_route_to_donor'
    )
    
    # Estimated arrival time
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'delivery_trackings'
        indexes = [
            models.Index(fields=['volunteer']),
            models.Index(fields=['status']),
        ]
        ordering = ['-started_at']
    
    def __str__(self):
        return f"Tracking: {self.volunteer.email} - {self.status}"
