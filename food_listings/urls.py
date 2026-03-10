from django.urls import path
from . import views

urlpatterns = [
    # Food listing CRUD operations
    path('', views.FoodListingCreateView.as_view(), name='food-listing-create'),
    path('browse/', views.FoodListingListView.as_view(), name='food-listing-list'),
    path('<int:pk>/', views.FoodListingDetailView.as_view(), name='food-listing-detail'),
    path('<int:pk>/update/', views.FoodListingUpdateView.as_view(), name='food-listing-update'),
    path('<int:pk>/cancel/', views.FoodListingDeleteView.as_view(), name='food-listing-cancel'),
    
    # Comparison functionality
    path('compare/', views.compare_food_listings, name='food-listing-compare'),
    
    # Search preferences
    path('search-preferences/', views.SearchPreferenceView.as_view(), name='search-preferences'),
    path('search-preferences/clear/', views.clear_search_preferences, name='clear-search-preferences'),
]