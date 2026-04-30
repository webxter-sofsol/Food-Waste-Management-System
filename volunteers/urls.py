"""
URL configuration for volunteer coordination module
"""
from django.urls import path
from . import views

urlpatterns = [
    path('available-matches/', views.get_available_matches, name='volunteer-available-matches'),
    path('assignments/<int:pk>/accept/', views.accept_assignment, name='volunteer-accept-assignment'),
    path('assignments/', views.list_volunteer_assignments, name='volunteer-assignments'),
    path('open-matches/', views.get_open_matches, name='volunteer-open-matches'),
    path('open-matches/<int:match_id>/self-assign/', views.self_assign_match, name='volunteer-self-assign'),
    path('matches/<int:match_id>/complete/', views.complete_delivery, name='volunteer-complete-delivery'),
]
