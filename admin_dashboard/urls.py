"""
URL configuration for admin dashboard module
"""
from django.urls import path
from . import views

urlpatterns = [
    # User verification endpoints
    path('pending-verifications', views.PendingVerificationsView.as_view(), name='pending-verifications'),
    path('users/<int:user_id>/verify', views.verify_user, name='verify-user'),
    path('users/<int:user_id>/reject', views.reject_user, name='reject-user'),
    
    # Metrics endpoint
    path('metrics', views.admin_metrics, name='admin-metrics'),
    
    # Reporting endpoints
    path('reports', views.admin_reports, name='admin-reports'),
    path('reports/export', views.export_report, name='export-report'),
]
