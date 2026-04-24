from django.contrib import admin
from .models import FoodListing


@admin.register(FoodListing)
class FoodListingAdmin(admin.ModelAdmin):
    """Admin interface for FoodListing model"""
    
    list_display = [
        'id', 'food_type', 'donor', 'quantity', 'unit', 
        'status', 'freshness_score', 'expiry_time', 'created_at'
    ]
    list_filter = [
        'status', 'food_type', 'unit', 'is_vegetarian', 
        'is_vegan', 'is_gluten_free', 'created_at'
    ]
    search_fields = ['food_type', 'description', 'donor__email']
    readonly_fields = ['freshness_score', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('donor', 'food_type', 'description', 'quantity', 'unit')
        }),
        ('Time Information', {
            'fields': ('preparation_time', 'expiry_time', 'freshness_score')
        }),
        ('Location', {
            'fields': ('pickup_address', 'pickup_latitude', 'pickup_longitude')
        }),
        ('Dietary Information', {
            'fields': ('is_vegetarian', 'is_vegan', 'is_gluten_free', 'allergen_info')
        }),
        ('Status & Availability', {
            'fields': ('status', 'available_quantity')
        }),
        ('Images', {
            'fields': ('images',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('donor')
