from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """GET /api/notifications/ — list notifications for the current user"""
    notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
    data = [
        {
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
            'related_entity_type': n.related_entity_type,
            'related_entity_id': n.related_entity_id,
        }
        for n in notifications
    ]
    unread = sum(1 for n in data if not n['is_read'])
    return Response({'count': len(data), 'unread': unread, 'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """POST /api/notifications/mark-read/ — mark all notifications as read"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_one_read(request, pk):
    """PATCH /api/notifications/{id}/read/ — mark one notification as read"""
    try:
        n = Notification.objects.get(pk=pk, user=request.user)
        n.is_read = True
        n.save()
        return Response({'id': pk, 'is_read': True})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
