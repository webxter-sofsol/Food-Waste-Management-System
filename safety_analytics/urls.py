from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_notifications, name='notifications-list'),
    path('mark-read/', views.mark_all_read, name='notifications-mark-all-read'),
    path('<int:pk>/read/', views.mark_one_read, name='notification-mark-read'),
]
