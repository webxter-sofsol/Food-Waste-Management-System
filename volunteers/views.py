"""
Views for volunteer coordination module
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from math import radians, cos, sin, asin, sqrt

from .models import PickupCoordination
from .serializers import (
    AvailableMatchSerializer,
    PickupCoordinationSerializer,
    VolunteerAssignmentSerializer
)
from matching.models import Match
from safety_analytics.models import Notification
from authentication.permissions import IsVolunteer


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsVolunteer])
def get_available_matches(request):
    """
    Get available matches for volunteer assignment
    Filter by location proximity to pickup area
    
    Requirements: 9.1, 9.2, 9.5
    """
    # Get volunteer location from profile
    try:
        volunteer_lat = request.user.profile.latitude
        volunteer_lon = request.user.profile.longitude
        
        if volunteer_lat is None or volunteer_lon is None:
            return Response(
                {'error': 'Please update your profile with location information'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        return Response(
            {'error': 'Unable to retrieve volunteer location'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get max distance from query params (default 50km)
    max_distance_km = float(request.query_params.get('max_distance', 50))
    
    # Get matches with pending pickup coordination
    matches = Match.objects.filter(
        status='matched'
    ).select_related(
        'listing', 'donor', 'receiver',
        'donor__profile', 'receiver__profile'
    ).prefetch_related('pickup_coordination')
    
    # Filter matches that have pending or unassigned coordination
    available_matches = []
    
    for match in matches:
        # Check if coordination exists
        coordination = match.pickup_coordination.first()
        
        if coordination:
            # Only show if pending or if escalation timer has passed (15 minutes)
            if coordination.assignment_status == 'pending':
                # Check if escalation is needed (15 minutes passed)
                time_since_creation = (timezone.now() - coordination.created_at).total_seconds() / 60
                
                # Calculate distance from volunteer to pickup location
                distance_km = haversine_distance(
                    volunteer_lat, volunteer_lon,
                    match.listing.pickup_latitude,
                    match.listing.pickup_longitude
                )
                
                # Only include if within max distance
                if distance_km <= max_distance_km:
                    available_matches.append({
                        'match': match,
                        'distance_km': round(distance_km, 2),
                        'escalated': time_since_creation >= 15
                    })
    
    # Sort by distance (closest first)
    available_matches.sort(key=lambda x: x['distance_km'])
    
    # Serialize the matches
    serialized_matches = []
    for item in available_matches:
        context = {
            'request': request,
            'distance_km': item['distance_km']
        }
        serializer = AvailableMatchSerializer(item['match'], context=context)
        data = serializer.data
        data['escalated'] = item['escalated']
        serialized_matches.append(data)
    
    return Response({
        'count': len(serialized_matches),
        'results': serialized_matches
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsVolunteer])
def accept_assignment(request, pk):
    """
    Accept a volunteer assignment
    Create PickupCoordination record on acceptance
    Ensure only one volunteer can accept (use database transaction)
    
    Requirements: 9.3, 9.4
    """
    coordination = get_object_or_404(PickupCoordination, pk=pk)
    
    # Check if already assigned
    if coordination.assignment_status != 'pending':
        return Response(
            {
                'error': 'conflict',
                'message': 'This assignment has already been accepted by another volunteer'
            },
            status=status.HTTP_409_CONFLICT
        )
    
    # Check if volunteer already assigned
    if coordination.volunteer is not None:
        return Response(
            {
                'error': 'conflict',
                'message': 'This assignment has already been accepted'
            },
            status=status.HTTP_409_CONFLICT
        )
    
    try:
        with transaction.atomic():
            # Lock the coordination record to prevent race conditions
            coordination = PickupCoordination.objects.select_for_update().get(pk=pk)
            
            # Double-check status after lock
            if coordination.assignment_status != 'pending':
                return Response(
                    {
                        'error': 'conflict',
                        'message': 'This assignment has already been accepted by another volunteer'
                    },
                    status=status.HTTP_409_CONFLICT
                )
            
            # Assign volunteer
            coordination.volunteer = request.user
            coordination.assignment_status = 'accepted'
            coordination.assigned_at = timezone.now()
            coordination.save()
            
            # Update match status
            match = coordination.match
            match.status = 'in_progress'
            match.save()
            
            # Notify donor (Requirement 9.3)
            try:
                Notification.objects.create(
                    user=match.donor,
                    notification_type='volunteer_assignment',
                    title='Volunteer Assigned',
                    message=f"{request.user.profile.full_name} has accepted the pickup assignment for {match.listing.food_type}",
                    related_entity_type='pickup_coordination',
                    related_entity_id=coordination.id,
                    sent_via_email=True
                )
            except Exception as e:
                print(f"Failed to send notification to donor: {e}")
            
            # Notify receiver (Requirement 9.3)
            try:
                Notification.objects.create(
                    user=match.receiver,
                    notification_type='volunteer_assignment',
                    title='Volunteer Assigned',
                    message=f"{request.user.profile.full_name} will deliver your food order ({match.listing.food_type})",
                    related_entity_type='pickup_coordination',
                    related_entity_id=coordination.id,
                    sent_via_email=True
                )
            except Exception as e:
                print(f"Failed to send notification to receiver: {e}")
            
            # Return updated coordination
            serializer = PickupCoordinationSerializer(coordination, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to accept assignment: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsVolunteer])
def list_volunteer_assignments(request):
    """
    List assignments for authenticated volunteer
    Filter by status (pending, accepted, completed)
    Include all coordination details
    
    Requirements: 9.2, 9.3
    """
    volunteer = request.user
    
    # Get all assignments for this volunteer
    assignments = PickupCoordination.objects.filter(
        volunteer=volunteer
    ).select_related(
        'match', 'match__listing', 'match__donor', 'match__receiver',
        'match__donor__profile', 'match__receiver__profile'
    ).order_by('-created_at')
    
    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        valid_statuses = ['pending', 'accepted', 'completed']
        if status_filter in valid_statuses:
            assignments = assignments.filter(assignment_status=status_filter)
        else:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Also include pending assignments that are unassigned (for volunteer to see available)
    if not status_filter or status_filter == 'pending':
        # Get volunteer location for filtering
        try:
            volunteer_lat = volunteer.profile.latitude
            volunteer_lon = volunteer.profile.longitude
            
            if volunteer_lat and volunteer_lon:
                # Get unassigned pending coordinations within range
                max_distance_km = float(request.query_params.get('max_distance', 50))
                
                pending_coordinations = PickupCoordination.objects.filter(
                    volunteer__isnull=True,
                    assignment_status='pending'
                ).select_related(
                    'match', 'match__listing', 'match__donor', 'match__receiver',
                    'match__donor__profile', 'match__receiver__profile'
                )
                
                # Filter by distance
                nearby_pending = []
                for coord in pending_coordinations:
                    distance_km = haversine_distance(
                        volunteer_lat, volunteer_lon,
                        coord.donor_location['lat'],
                        coord.donor_location['lon']
                    )
                    if distance_km <= max_distance_km:
                        nearby_pending.append(coord)
                
                # Combine with assigned assignments
                assignments = list(assignments) + nearby_pending
        except Exception as e:
            print(f"Error filtering by location: {e}")
    
    # Serialize
    serializer = VolunteerAssignmentSerializer(
        assignments,
        many=True,
        context={'request': request}
    )
    
    return Response({
        'count': len(serializer.data),
        'results': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsVolunteer])
def get_open_matches(request):
    """
    GET /api/volunteer/open-matches/
    List all approved matches that have no volunteer assigned yet.
    Volunteers can browse these and self-assign.
    """
    from matching.models import Match

    # Matches that are 'matched' status and have no coordination OR coordination is pending/unassigned
    open_matches = Match.objects.filter(
        status='matched'
    ).select_related(
        'listing', 'donor', 'receiver',
        'donor__profile', 'receiver__profile'
    ).prefetch_related('pickup_coordination').order_by('-created_at')

    data = []
    for m in open_matches:
        coord = m.pickup_coordination.first()
        # Only show if no volunteer assigned
        if coord and coord.volunteer:
            continue
        data.append({
            'id': m.id,
            'listing_food_type': m.listing.food_type,
            'listing_pickup_address': m.listing.pickup_address,
            'pickup_latitude': m.listing.pickup_latitude,
            'pickup_longitude': m.listing.pickup_longitude,
            'donor_name': getattr(m.donor, 'profile', None) and m.donor.profile.full_name or m.donor.email,
            'receiver_name': getattr(m.receiver, 'profile', None) and m.receiver.profile.full_name or m.receiver.email,
            'matched_quantity': m.matched_quantity,
            'expiry_time': m.listing.expiry_time.isoformat(),
            'created_at': m.created_at.isoformat(),
            'coordination_id': coord.id if coord else None,
        })

    return Response({'count': len(data), 'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsVolunteer])
def self_assign_match(request, match_id):
    """
    POST /api/volunteer/open-matches/{id}/self-assign/
    Volunteer self-assigns to an open match.
    """
    from matching.models import Match
    from django.db import transaction

    try:
        match = Match.objects.get(id=match_id, status='matched')
    except Match.DoesNotExist:
        return Response({'error': 'Match not found or no longer available.'}, status=404)

    with transaction.atomic():
        coord = match.pickup_coordination.select_for_update().first()

        if coord and coord.volunteer:
            return Response({'error': 'This match has already been assigned to another volunteer.'}, status=409)

        now = timezone.now()
        if coord:
            coord.volunteer = request.user
            coord.assignment_status = 'accepted'
            coord.assigned_at = now
            coord.save()
        else:
            coord = PickupCoordination.objects.create(
                match=match,
                volunteer=request.user,
                donor_location={
                    'lat': match.listing.pickup_latitude,
                    'lon': match.listing.pickup_longitude,
                },
                receiver_location={
                    'lat': getattr(getattr(match.receiver, 'profile', None), 'latitude', None) or 0,
                    'lon': getattr(getattr(match.receiver, 'profile', None), 'longitude', None) or 0,
                },
                food_quantity=match.matched_quantity,
                required_pickup_time=match.listing.expiry_time,
                assignment_status='accepted',
                assigned_at=now,
            )

        match.status = 'in_progress'
        match.save()

    # Notify donor and receiver
    try:
        from safety_analytics.models import Notification
        vol_name = getattr(request.user, 'profile', None) and request.user.profile.full_name or request.user.email
        for user, msg in [
            (match.donor, f'{vol_name} has accepted the delivery for {match.listing.food_type}.'),
            (match.receiver, f'{vol_name} will deliver your {match.listing.food_type} order.'),
        ]:
            Notification.objects.create(
                user=user,
                notification_type='volunteer_assignment',
                title='Volunteer Assigned',
                message=msg,
                related_entity_type='pickup_coordination',
                related_entity_id=coord.id,
            )
    except Exception:
        pass

    return Response({
        'message': 'You have been assigned to this delivery.',
        'coordination_id': coord.id,
        'match_id': match_id,
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsVolunteer])
def complete_delivery(request, match_id):
    """
    POST /api/volunteer/matches/{id}/complete/
    Volunteer marks a delivery as completed.
    - Sets Match.status = 'completed' and records completed_at
    - Sets FoodListing.status = 'completed'
    - Emails a PDF donation certificate to the donor
    """
    try:
        match = Match.objects.select_related(
            'listing', 'donor', 'receiver',
            'donor__profile', 'receiver__profile',
        ).get(id=match_id, status='in_progress')
    except Match.DoesNotExist:
        return Response(
            {'error': 'Match not found or not in progress.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Verify this volunteer is assigned
    coord = match.pickup_coordination.filter(volunteer=request.user).first()
    if not coord:
        return Response(
            {'error': 'You are not assigned to this delivery.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    with transaction.atomic():
        now = timezone.now()

        # Complete the match
        match.status = 'completed'
        match.completed_at = now
        match.save()

        # Complete the listing
        listing = match.listing
        listing.status = 'completed'
        listing.save()

        # Complete the coordination
        coord.assignment_status = 'completed'
        coord.save()

    # Send certificate email to donor (non-blocking — errors are logged, not raised)
    _send_donation_certificate(match)

    # Notify donor and receiver
    try:
        donor_name = getattr(match.donor, 'profile', None) and match.donor.profile.full_name or match.donor.email
        receiver_name = getattr(match.receiver, 'profile', None) and match.receiver.profile.full_name or match.receiver.email
        Notification.objects.create(
            user=match.donor,
            notification_type='delivery_completed',
            title='Delivery Completed',
            message=f'Your donation of {match.listing.food_type} has been successfully delivered to {receiver_name}. A certificate of donation has been sent to your email.',
            related_entity_type='match',
            related_entity_id=match.id,
        )
        Notification.objects.create(
            user=match.receiver,
            notification_type='delivery_completed',
            title='Food Received',
            message=f'Your food order ({match.listing.food_type}) has been delivered by {getattr(request.user, "profile", None) and request.user.profile.full_name or request.user.email}.',
            related_entity_type='match',
            related_entity_id=match.id,
        )
    except Exception as e:
        print(f'Notification error: {e}')

    return Response({'message': 'Delivery marked as completed. Certificate sent to donor.'}, status=status.HTTP_200_OK)


def _send_donation_certificate(match):
    """Generate and email a PDF donation certificate to the donor."""
    try:
        from authentication.certificate import generate_donation_certificate
        from django.core.mail import EmailMessage
        from django.conf import settings as django_settings

        donor = match.donor
        donor_name = getattr(donor, 'profile', None) and donor.profile.full_name or donor.username
        receiver_name = (
            getattr(match.receiver, 'profile', None) and match.receiver.profile.full_name
            or match.receiver.email
        )

        pdf_bytes = generate_donation_certificate(
            donor_name=donor_name,
            donor_email=donor.email,
            food_type=match.listing.food_type,
            quantity=match.matched_quantity,
            unit=match.listing.unit,
            pickup_address=match.listing.pickup_address,
            completed_at=match.completed_at,
            match_id=match.id,
            receiver_name=receiver_name,
        )

        email = EmailMessage(
            subject='Your FoodShare Donation Certificate 🌿',
            body=(
                f'Dear {donor_name},\n\n'
                f'Thank you for your generous donation of {match.matched_quantity} '
                f'{match.listing.unit} of {match.listing.food_type}!\n\n'
                f'Please find your Certificate of Donation attached to this email.\n\n'
                f'Your contribution helps reduce food waste and supports those in need.\n\n'
                f'With gratitude,\nThe FoodShare Team'
            ),
            from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@foodshare.com'),
            to=[donor.email],
        )
        email.attach(
            filename=f'FoodShare_Certificate_{match.id}.pdf',
            content=pdf_bytes,
            mimetype='application/pdf',
        )
        email.send(fail_silently=False)

    except Exception as e:
        print(f'Certificate email error for match {match.id}: {e}')
