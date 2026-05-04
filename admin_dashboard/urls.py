"""
URL configuration for admin dashboard module
"""
from django.urls import path
from . import views

urlpatterns = [
    # User verification endpoints
    path('pending-verifications/', views.PendingVerificationsView.as_view(), name='pending-verifications'),
    path('users/<int:user_id>/verify/', views.verify_user, name='verify-user'),
    path('users/<int:user_id>/reject/', views.reject_user, name='reject-user'),

    # Metrics endpoint
    path('metrics/', views.admin_metrics, name='admin-metrics'),

    # Reporting endpoints
    path('reports/', views.admin_reports, name='admin-reports'),
    path('reports/export/', views.export_report, name='export-report'),

    # Listing approval endpoints
    path('listings/pending/', views.pending_listings, name='pending-listings'),
    path('listings/<int:listing_id>/approve/', views.approve_listing, name='approve-listing'),
    path('listings/<int:listing_id>/reject/', views.reject_listing, name='reject-listing'),

    # Volunteer assignment endpoints
    path('matches/', views.list_all_matches, name='admin-matches'),
    path('matches/<int:match_id>/assign-volunteer/', views.assign_volunteer, name='assign-volunteer'),
    path('matches/<int:match_id>/issue-certificate/', views.admin_issue_certificate, name='admin-issue-certificate'),
    path('volunteers/', views.list_volunteers, name='list-volunteers'),

    # All users management
    path('users/', views.list_all_users, name='admin-list-users'),
    path('users/<int:user_id>/', views.get_user_detail, name='admin-user-detail'),
]
