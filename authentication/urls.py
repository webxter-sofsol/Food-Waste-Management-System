"""
URL configuration for authentication module
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'authentication'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh-token/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify-session/', views.verify_session, name='verify_session'),

    # Profile management
    path('profile/', views.user_profile, name='user_profile'),
]
