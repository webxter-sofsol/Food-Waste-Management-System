"""
Views for admin dashboard module
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache

from authentication.models import User
from authentication.permissions import IsAdmin
from food_listings.models import FoodListing
from matching.models import Match
from tracking.models import DeliveryTracking
from volunteers.models import PickupCoordination
from .serializers import PendingUserSerializer, UserVerificationSerializer, AllUsersSerializer


class PendingVerificationsView(generics.ListAPIView):
    serializer_class = PendingUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    def get_queryset(self):
        return User.objects.filter(verification_status='pending').select_related('profile').order_by('-date_joined')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def verify_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    if user.verification_status == 'approved':
        return Response({'error': 'User is already verified'}, status=status.HTTP_400_BAD_REQUEST)
    user.verification_status = 'approved'
    user.is_active = True
    user.save()
    try:
        send_mail(
            subject='Account Verified - FoodShare',
            message=f'Dear {user.username},\n\nYour account has been verified.\n\nBest regards,\nFoodShare Team',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@foodshare.com'),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass
    serializer = PendingUserSerializer(user)
    return Response({'message': 'User verified successfully', 'user': serializer.data}, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def reject_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = UserVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    reason = serializer.validated_data.get('reason', 'No reason provided')
    user.verification_status = 'rejected'
    user.is_active = False
    user.save()
    try:
        send_mail(
            subject='Account Registration - FoodShare',
            message=f'Dear {user.username},\n\nYour registration was rejected.\nReason: {reason}\n\nBest regards,\nFoodShare Team',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@foodshare.com'),
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass
    return Response({'message': 'User rejected successfully', 'user_id': user_id, 'reason': reason}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_metrics(request):
    cache_key = 'admin_metrics'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached, status=status.HTTP_200_OK)
    user_counts = User.objects.filter(verification_status='approved', is_active=True).values('role').annotate(count=Count('id'))
    user_counts_dict = {item['role']: item['count'] for item in user_counts}
    total_food_listings = FoodListing.objects.count()
    active_food_listings = FoodListing.objects.filter(status='available').count()
    total_matches = Match.objects.count()
    completed_deliveries = Match.objects.filter(status='completed').count()
    avg_vol = PickupCoordination.objects.filter(assigned_at__isnull=False).annotate(rt=F('assigned_at') - F('created_at')).aggregate(avg=Avg('rt'))['avg']
    avg_del = Match.objects.filter(completed_at__isnull=False).annotate(ct=F('completed_at') - F('created_at')).aggregate(avg=Avg('ct'))['avg']
    pending_verifications = User.objects.filter(verification_status='pending').count()
    expiring_soon = FoodListing.objects.filter(status='available', expiry_time__lte=timezone.now() + timedelta(hours=2), expiry_time__gt=timezone.now()).count()
    metrics = {
        'user_counts': {'donor': user_counts_dict.get('donor', 0), 'receiver': user_counts_dict.get('receiver', 0), 'volunteer': user_counts_dict.get('volunteer', 0), 'admin': user_counts_dict.get('admin', 0), 'total': sum(user_counts_dict.values())},
        'food_listings': {'total': total_food_listings, 'active': active_food_listings},
        'matches': {'total': total_matches, 'completed_deliveries': completed_deliveries},
        'average_response_times': {'volunteer_assignment_seconds': avg_vol.total_seconds() if avg_vol else None, 'delivery_completion_seconds': avg_del.total_seconds() if avg_del else None},
        'pending_verifications': pending_verifications,
        'system_alerts': {'expiring_soon_listings': expiring_soon},
    }
    cache.set(cache_key, metrics, 30)
    return Response(metrics, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_reports(request):
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    role = request.query_params.get('role')
    location = request.query_params.get('location')
    report_type = request.query_params.get('type', 'users')

    if report_type == 'users':
        queryset = User.objects.all()
        if role:
            queryset = queryset.filter(role=role)
        if start_date:
            queryset = queryset.filter(date_joined__gte=start_date)
        if end_date:
            queryset = queryset.filter(date_joined__lte=end_date)
        data = list(queryset.values('id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined').order_by('-date_joined'))
    elif report_type == 'listings':
        queryset = FoodListing.objects.select_related('donor')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        if location:
            queryset = queryset.filter(pickup_address__icontains=location)
        data = list(queryset.values('id', 'food_type', 'quantity', 'unit', 'status', 'preparation_time', 'expiry_time', 'freshness_score', 'pickup_address', 'created_at', 'donor__email').order_by('-created_at'))
    elif report_type == 'matches':
        queryset = Match.objects.select_related('donor', 'receiver', 'listing')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        data = list(queryset.values('id', 'matched_quantity', 'status', 'created_at', 'completed_at', 'donor__email', 'receiver__email', 'listing__food_type').order_by('-created_at'))
    else:
        return Response({'error': 'Invalid report type. Must be one of: users, listings, matches'}, status=status.HTTP_400_BAD_REQUEST)

    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginated_data = paginator.paginate_queryset(data, request)
    return Response({'report_type': report_type, 'filters': {'start_date': start_date, 'end_date': end_date, 'role': role, 'location': location}, 'data': paginated_data, 'count': len(data), 'next': paginator.get_next_link(), 'previous': paginator.get_previous_link()})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def export_report(request):
    import csv
    from django.http import HttpResponse
    export_format = request.data.get('format', 'csv')
    report_type = request.data.get('type', 'users')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')
    role = request.data.get('role')
    location = request.data.get('location')
    if export_format not in ['csv', 'pdf']:
        return Response({'error': 'Invalid format'}, status=status.HTTP_400_BAD_REQUEST)
    if report_type == 'users':
        queryset = User.objects.all()
        if role: queryset = queryset.filter(role=role)
        if start_date: queryset = queryset.filter(date_joined__gte=start_date)
        if end_date: queryset = queryset.filter(date_joined__lte=end_date)
        data = queryset.values('id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined')
        fields = ['id', 'email', 'username', 'role', 'verification_status', 'is_active', 'date_joined']
    elif report_type == 'listings':
        queryset = FoodListing.objects.all()
        if start_date: queryset = queryset.filter(created_at__gte=start_date)
        if end_date: queryset = queryset.filter(created_at__lte=end_date)
        if location: queryset = queryset.filter(pickup_address__icontains=location)
        data = queryset.values('id', 'food_type', 'quantity', 'unit', 'status', 'preparation_time', 'expiry_time', 'freshness_score', 'pickup_address', 'created_at')
        fields = ['id', 'food_type', 'quantity', 'unit', 'status', 'preparation_time', 'expiry_time', 'freshness_score', 'pickup_address', 'created_at']
    elif report_type == 'matches':
        queryset = Match.objects.select_related('donor', 'receiver', 'listing')
        if start_date: queryset = queryset.filter(created_at__gte=start_date)
        if end_date: queryset = queryset.filter(created_at__lte=end_date)
        data = queryset.values('id', 'matched_quantity', 'status', 'created_at', 'completed_at', 'donor__email', 'receiver__email', 'listing__food_type')
        fields = ['id', 'matched_quantity', 'status', 'created_at', 'completed_at', 'donor__email', 'receiver__email', 'listing__food_type']
    else:
        return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)
    if export_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'
        writer = csv.DictWriter(response, fieldnames=fields)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        return response
    return Response({'message': 'PDF export not yet implemented'}, status=status.HTTP_501_NOT_IMPLEMENTED)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def approve_listing(request, listing_id):
    try:
        listing = FoodListing.objects.get(id=listing_id)
    except FoodListing.DoesNotExist:
        return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)
    if listing.status != 'pending':
        return Response({'error': 'Listing is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)
    listing.status = 'available'
    listing.save()
    cache.delete('admin_metrics')
    return Response({'message': 'Listing approved', 'id': listing_id}, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdmin])
def reject_listing(request, listing_id):
    try:
        listing = FoodListing.objects.get(id=listing_id)
    except FoodListing.DoesNotExist:
        return Response({'error': 'Listing not found'}, status=status.HTTP_404_NOT_FOUND)
    reason = request.data.get('reason', 'Rejected by admin')
    listing.status = 'cancelled'
    listing.save()
    cache.delete('admin_metrics')
    return Response({'message': 'Listing rejected', 'id': listing_id, 'reason': reason}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def pending_listings(request):
    listings = FoodListing.objects.filter(status='pending').select_related('donor', 'donor__profile').order_by('-created_at')
    data = [{'id': l.id, 'food_type': l.food_type, 'description': l.description, 'quantity': l.quantity, 'unit': l.unit, 'pickup_address': l.pickup_address, 'expiry_time': l.expiry_time.isoformat(), 'created_at': l.created_at.isoformat(), 'donor_email': l.donor.email, 'donor_name': getattr(l.donor, 'profile', None) and l.donor.profile.full_name or l.donor.email, 'is_vegetarian': l.is_vegetarian, 'is_vegan': l.is_vegan, 'is_gluten_free': l.is_gluten_free} for l in listings]
    return Response({'count': len(data), 'results': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_all_matches(request):
    matches = Match.objects.select_related('listing', 'donor', 'receiver', 'donor__profile', 'receiver__profile').prefetch_related('pickup_coordination').order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter:
        matches = matches.filter(status=status_filter)
    data = []
    for m in matches:
        coord = m.pickup_coordination.first()
        data.append({'id': m.id, 'listing_food_type': m.listing.food_type, 'listing_pickup_address': m.listing.pickup_address, 'donor_email': m.donor.email, 'donor_name': getattr(m.donor, 'profile', None) and m.donor.profile.full_name or m.donor.email, 'receiver_email': m.receiver.email, 'receiver_name': getattr(m.receiver, 'profile', None) and m.receiver.profile.full_name or m.receiver.email, 'matched_quantity': m.matched_quantity, 'status': m.status, 'created_at': m.created_at.isoformat(), 'completed_at': m.completed_at.isoformat() if m.completed_at else None, 'volunteer_assigned': coord is not None and coord.volunteer is not None, 'volunteer_email': coord.volunteer.email if coord and coord.volunteer else None, 'volunteer_name': coord.volunteer.profile.full_name if coord and coord.volunteer and hasattr(coord.volunteer, 'profile') else None, 'coordination_id': coord.id if coord else None, 'assignment_status': coord.assignment_status if coord else 'unassigned'})
    return Response({'count': len(data), 'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def assign_volunteer(request, match_id):
    try:
        match = Match.objects.get(id=match_id)
    except Match.DoesNotExist:
        return Response({'error': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)
    volunteer_id = request.data.get('volunteer_id')
    if not volunteer_id:
        return Response({'error': 'volunteer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        volunteer = User.objects.get(id=volunteer_id, role='volunteer', is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Volunteer not found'}, status=status.HTTP_404_NOT_FOUND)
    now = timezone.now()
    coord, created = PickupCoordination.objects.get_or_create(match=match, defaults={'donor_location': {'lat': match.listing.pickup_latitude, 'lon': match.listing.pickup_longitude}, 'receiver_location': {'lat': getattr(getattr(match.receiver, 'profile', None), 'latitude', None) or 0, 'lon': getattr(getattr(match.receiver, 'profile', None), 'longitude', None) or 0}, 'food_quantity': match.matched_quantity, 'required_pickup_time': match.listing.expiry_time, 'assignment_status': 'assigned', 'volunteer': volunteer, 'assigned_at': now})
    if not created:
        coord.volunteer = volunteer
        coord.assignment_status = 'assigned'
        coord.assigned_at = now
        coord.save()
    match.status = 'in_progress'
    match.save()
    try:
        from safety_analytics.models import Notification
        Notification.objects.create(user=volunteer, notification_type='volunteer_assignment', title='New Delivery Assignment', message=f'You have been assigned to deliver {match.listing.food_type} from {match.listing.pickup_address}.', related_entity_type='pickup_coordination', related_entity_id=coord.id)
    except Exception:
        pass
    cache.delete('admin_metrics')
    return Response({'message': f'Volunteer {volunteer.email} assigned successfully.', 'coordination_id': coord.id, 'match_id': match_id}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_volunteers(request):
    volunteers = User.objects.filter(role='volunteer', is_active=True, verification_status='approved').select_related('profile').order_by('email')
    data = [{'id': v.id, 'email': v.email, 'name': getattr(v, 'profile', None) and v.profile.full_name or v.email, 'phone': getattr(v, 'profile', None) and v.profile.phone or None} for v in volunteers]
    return Response({'count': len(data), 'results': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_all_users(request):
    """
    GET /api/admin/users/
    Returns all users with full profile details.
    Supports filtering by role, verification_status, search (email/name).
    """
    queryset = User.objects.select_related('profile').order_by('-date_joined')

    role = request.query_params.get('role')
    if role:
        queryset = queryset.filter(role=role)

    verification_status = request.query_params.get('verification_status')
    if verification_status:
        queryset = queryset.filter(verification_status=verification_status)

    is_active = request.query_params.get('is_active')
    if is_active is not None:
        queryset = queryset.filter(is_active=(is_active.lower() == 'true'))

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(email__icontains=search) |
            Q(username__icontains=search) |
            Q(profile__full_name__icontains=search)
        )

    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = int(request.query_params.get('page_size', 20))
    page = paginator.paginate_queryset(queryset, request)
    serializer = AllUsersSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_user_detail(request, user_id):
    """
    GET /api/admin/users/{id}/
    Returns full details for a single user.
    """
    try:
        user = User.objects.select_related('profile').get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = AllUsersSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_issue_certificate(request, match_id):
    """
    POST /api/admin/matches/{id}/issue-certificate/
    Admin manually issues (re-sends) a donation certificate to the donor
    and marks the match as completed if it isn't already.
    """
    from matching.views import admin_issue_certificate as _issue
    return _issue(request, match_id)
