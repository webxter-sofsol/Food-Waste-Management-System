from django.urls import path
from . import views

app_name = 'matching'

urlpatterns = [
    # Food request endpoints
    path('food-requests/', views.create_food_request, name='create-food-request'),
    path('food-requests/list/', views.list_food_requests, name='list-food-requests'),
    path('food-requests/<int:pk>/approve/', views.approve_food_request, name='approve-food-request'),
    path('food-requests/<int:pk>/reject/', views.reject_food_request, name='reject-food-request'),
    path('food-requests/<int:pk>/', views.cancel_food_request, name='cancel-food-request'),

    # Match endpoints
    path('matches/', views.MatchListView.as_view(), name='list-matches'),
    path('matches/<int:match_id>/certificate/', views.download_certificate, name='download-certificate'),
]
