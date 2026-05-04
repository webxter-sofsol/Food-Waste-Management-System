from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from .models import FoodRequest, Match
from .serializers import FoodRequestSerializer, MatchSerializer
from food_listings.models import FoodListing
from safety_analytics.models import Notification
from authentication.permissions import IsReceiver, IsDonor


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for list views"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsReceiver])
def create_food_request(request):
    """
    Create a new food request (Receiver only)
    
    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
    """
    serializer = FoodRequestSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        food_request = serializer.save()
        
        # Send notification to donor within 30 seconds (Requirement 7.3)
        try:
            donor = food_request.listing.donor
            Notification.objects.create(
                user=donor,
                notification_type='food_request',
                title='New Food Request',
                message=f"{food_request.receiver.profile.full_name} has requested {food_request.requested_quantity} {food_request.listing.unit} of {food_request.listing.food_type}",
                related_entity_type='food_request',
                related_entity_id=food_request.id,
                sent_via_email=True
            )
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to send notification: {e}")
        
        return Response(
            FoodRequestSerializer(food_request, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_food_requests(request):
    """
    List food requests based on user role
    - Donors: see requests for their listings
    - Receivers: see their own requests
    """
    user = request.user
    
    if user.role == 'donor':
        # Get requests for donor's listings
        food_requests = FoodRequest.objects.filter(
            listing__donor=user
        ).select_related('listing', 'receiver', 'receiver__profile')
    elif user.role == 'receiver':
        # Get receiver's own requests
        food_requests = FoodRequest.objects.filter(
            receiver=user
        ).select_related('listing', 'listing__donor', 'listing__donor__profile')
    else:
        return Response(
            {'error': 'Only donors and receivers can view food requests'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        food_requests = food_requests.filter(status=status_filter)
    
    serializer = FoodRequestSerializer(
        food_requests, 
        many=True, 
        context={'request': request}
    )
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDonor])
def approve_food_request(request, pk):
    """
    Approve a food request and create a match (Donor only)
    
    Requirements: 8.1, 8.2, 8.3, 8.5
    """
    food_request = get_object_or_404(FoodRequest, pk=pk)
    
    # Verify that the donor owns the listing
    if food_request.listing.donor != request.user:
        return Response(
            {'error': 'You can only approve requests for your own listings'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Verify request is pending
    if food_request.status != 'pending':
        return Response(
            {'error': f'Cannot approve request with status: {food_request.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify listing is still available
    if food_request.listing.status != 'available':
        return Response(
            {'error': 'Listing is no longer available'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify sufficient quantity
    if food_request.requested_quantity > food_request.listing.available_quantity:
        return Response(
            {'error': 'Insufficient quantity available'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            # Mark request as approved (terminal state — match is immediately completed)
            food_request.status = 'approved'
            food_request.save()

            # Create Match record and immediately mark as completed
            # (volunteer module not yet active — donor approval = delivery confirmed)
            match = Match.objects.create(
                listing=food_request.listing,
                request=food_request,
                donor=food_request.listing.donor,
                receiver=food_request.receiver,
                matched_quantity=food_request.requested_quantity,
                status='completed',
                completed_at=timezone.now(),
            )

            # Update FoodListing status or reduce available_quantity (Requirement 8.3)
            listing = food_request.listing
            if food_request.requested_quantity >= listing.available_quantity:
                listing.status = 'completed'
                listing.available_quantity = 0
            else:
                listing.available_quantity -= food_request.requested_quantity
            listing.save()

            # Notify receiver that request was approved
            try:
                Notification.objects.create(
                    user=food_request.receiver,
                    notification_type='match_created',
                    title='Food Request Approved',
                    message=f"Your request for {food_request.requested_quantity} {listing.unit} of {listing.food_type} has been approved!",                    related_entity_type='match',
                    related_entity_id=match.id,
                    sent_via_email=True
                )
            except Exception as e:
                print(f"Failed to send notification to receiver: {e}")

            # Send donation certificate to donor immediately (volunteer module not yet active)
            _send_donation_certificate_for_match(match)

            return Response(
                MatchSerializer(match, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        return Response(
            {'error': f'Failed to approve request: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDonor])
def reject_food_request(request, pk):
    """
    Reject a food request (Donor only)
    
    Requirements: 8.4
    """
    food_request = get_object_or_404(FoodRequest, pk=pk)
    
    # Verify that the donor owns the listing
    if food_request.listing.donor != request.user:
        return Response(
            {'error': 'You can only reject requests for your own listings'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Verify request is pending
    if food_request.status != 'pending':
        return Response(
            {'error': f'Cannot reject request with status: {food_request.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get optional rejection reason
    rejection_reason = request.data.get('rejection_reason', '')
    
    try:
        with transaction.atomic():
            # Update request status
            food_request.status = 'rejected'
            food_request.rejection_reason = rejection_reason
            food_request.save()
            
            # Send notification to receiver with optional reason
            try:
                message = f"Your request for {food_request.requested_quantity} {food_request.listing.unit} of {food_request.listing.food_type} has been rejected."
                if rejection_reason:
                    message += f" Reason: {rejection_reason}"
                
                Notification.objects.create(
                    user=food_request.receiver,
                    notification_type='food_request',
                    title='Food Request Rejected',
                    message=message,
                    related_entity_type='food_request',
                    related_entity_id=food_request.id,
                    sent_via_email=True
                )
            except Exception as e:
                print(f"Failed to send notification: {e}")
            
            return Response(
                FoodRequestSerializer(food_request, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
    
    except Exception as e:
        return Response(
            {'error': f'Failed to reject request: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_food_request(request, pk):
    """
    Cancel a food request
    - Receivers can cancel pending requests
    - For matched requests, requires mutual agreement
    
    Requirements: 19.4, 19.5, 19.6
    """
    food_request = get_object_or_404(FoodRequest, pk=pk)
    
    # Verify user is either the receiver or donor
    is_receiver = food_request.receiver == request.user
    is_donor = food_request.listing.donor == request.user
    
    if not (is_receiver or is_donor):
        return Response(
            {'error': 'You do not have permission to cancel this request'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Allow cancellation only for pending requests (Requirement 19.4)
    if food_request.status == 'pending':
        if not is_receiver:
            return Response(
                {'error': 'Only the receiver can cancel pending requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            with transaction.atomic():
                food_request.status = 'cancelled'
                food_request.save()
                
                # Notify donor
                try:
                    Notification.objects.create(
                        user=food_request.listing.donor,
                        notification_type='cancellation',
                        title='Food Request Cancelled',
                        message=f"{food_request.receiver.profile.full_name} has cancelled their request for {food_request.listing.food_type}",
                        related_entity_type='food_request',
                        related_entity_id=food_request.id,
                        sent_via_email=True
                    )
                except Exception as e:
                    print(f"Failed to send notification: {e}")
                
                return Response(
                    {'message': 'Food request cancelled successfully'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to cancel request: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # For matched requests, require mutual agreement (Requirement 19.5)
    elif food_request.status == 'approved':
        # Check if there's a match
        try:
            match = Match.objects.get(request=food_request)
        except Match.DoesNotExist:
            return Response(
                {'error': 'No match found for this request'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check for mutual agreement flag
        mutual_agreement = request.data.get('mutual_agreement', False)
        
        if not mutual_agreement:
            return Response(
                {'error': 'Cancellation of matched requests requires mutual agreement from both donor and receiver'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Cancel the request and match
                food_request.status = 'cancelled'
                food_request.save()
                
                match.status = 'cancelled'
                match.save()
                
                # Restore listing availability
                listing = food_request.listing
                listing.available_quantity += food_request.requested_quantity
                if listing.status == 'reserved':
                    listing.status = 'available'
                listing.save()
                
                # Notify the other party
                other_user = food_request.listing.donor if is_receiver else food_request.receiver
                try:
                    Notification.objects.create(
                        user=other_user,
                        notification_type='cancellation',
                        title='Match Cancelled',
                        message=f"The match for {food_request.listing.food_type} has been cancelled",
                        related_entity_type='match',
                        related_entity_id=match.id,
                        sent_via_email=True
                    )
                except Exception as e:
                    print(f"Failed to send notification: {e}")
                
                # Notify assigned volunteer if exists (Requirement 19.6)
                # TODO: Check for volunteer assignment and notify
                # This will be implemented when volunteer coordination is added
                
                return Response(
                    {'message': 'Match cancelled successfully'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to cancel match: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    else:
        return Response(
            {'error': f'Cannot cancel request with status: {food_request.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )


class MatchListView(APIView):
    """
    List matches filtered by user role
    
    Requirements: 8.1, 8.2
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get(self, request):
        """Get matches based on user role"""
        user = request.user
        
        # Filter matches by user role
        if user.role == 'donor':
            matches = Match.objects.filter(donor=user)
        elif user.role == 'receiver':
            matches = Match.objects.filter(receiver=user)
        elif user.role == 'volunteer':
            # TODO: Filter by assigned volunteer when volunteer coordination is implemented
            matches = Match.objects.none()
        else:
            return Response(
                {'error': 'Invalid user role for viewing matches'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            matches = matches.filter(status=status_filter)
        
        # Select related to optimize queries
        matches = matches.select_related(
            'listing', 'request', 'donor', 'receiver',
            'donor__profile', 'receiver__profile'
        ).order_by('-created_at')
        
        # Implement pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(matches, request)
        
        if page is not None:
            serializer = MatchSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = MatchSerializer(matches, many=True, context={'request': request})
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDonor])
def download_certificate(request, match_id):
    """
    GET /api/matches/{id}/certificate/
    Donor downloads their PDF donation certificate for a completed match.
    """
    from django.http import HttpResponse
    from authentication.certificate import generate_donation_certificate

    try:
        match = Match.objects.select_related(
            'listing', 'donor', 'receiver',
            'donor__profile', 'receiver__profile',
        ).get(id=match_id, donor=request.user, status='completed')
    except Match.DoesNotExist:
        return Response(
            {'error': 'Completed match not found or access denied.'},
            status=status.HTTP_404_NOT_FOUND,
        )

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

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="FoodShare_Receipt_{match.id}.pdf"'
    return response


# ── Certificate helpers ────────────────────────────────────────────────────────

def _send_donation_certificate_for_match(match):
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
            subject='Your FoodShare Donation Receipt 🌿',
            body=(
                f'Dear {donor_name},\n\n'
                f'Thank you for your generous donation of {match.matched_quantity} '
                f'{match.listing.unit} of {match.listing.food_type}!\n\n'
                f'Please find your Donation Receipt attached to this email.\n\n'
                f'Your contribution helps reduce food waste and supports those in need.\n\n'
                f'With gratitude,\nThe FoodShare Team'
            ),
            from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@foodshare.com'),
            to=[donor.email],
        )
        email.attach(
            filename=f'FoodShare_Receipt_{match.id}.pdf',
            content=pdf_bytes,
            mimetype='application/pdf',
        )
        email.send(fail_silently=True)
    except Exception as e:
        print(f'Certificate email error for match {match.id}: {e}')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDonor])
def list_donor_certificates(request):
    """
    GET /api/matches/certificates/
    Returns all completed matches for the donor — each one has a downloadable certificate.
    """
    matches = (
        Match.objects
        .filter(donor=request.user, status='completed')
        .select_related('listing', 'receiver', 'receiver__profile')
        .order_by('-completed_at')
    )

    data = []
    for m in matches:
        receiver_name = (
            getattr(m.receiver, 'profile', None) and m.receiver.profile.full_name
            or m.receiver.email
        )
        data.append({
            'match_id': m.id,
            'food_type': m.listing.food_type,
            'quantity': m.matched_quantity,
            'unit': m.listing.unit,
            'receiver_name': receiver_name,
            'completed_at': m.completed_at,
            'certificate_url': f'/api/matches/{m.id}/certificate/',
        })

    return Response({'count': len(data), 'results': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_issue_certificate(request, match_id):
    """
    POST /api/admin/matches/{id}/issue-certificate/
    Admin manually issues (re-sends) a donation certificate to the donor.
    Also marks the match as completed if it isn't already.
    """
    from authentication.permissions import IsAdmin
    from django.http import HttpResponse
    from authentication.certificate import generate_donation_certificate

    # Only admins may call this
    if not (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
        return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        match = Match.objects.select_related(
            'listing', 'donor', 'receiver',
            'donor__profile', 'receiver__profile',
        ).get(id=match_id)
    except Match.DoesNotExist:
        return Response({'error': 'Match not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Mark as completed if not already
    if match.status != 'completed':
        match.status = 'completed'
        match.completed_at = match.completed_at or timezone.now()
        match.save()

        # Also mark listing completed if fully matched
        listing = match.listing
        if listing.available_quantity == 0 and listing.status not in ('completed', 'cancelled'):
            listing.status = 'completed'
            listing.save()

    # Send certificate email
    _send_donation_certificate_for_match(match)

    donor_name = (
        getattr(match.donor, 'profile', None) and match.donor.profile.full_name
        or match.donor.username
    )
    return Response({
        'message': f'Receipt issued and emailed to {match.donor.email}.',
        'match_id': match.id,
        'donor_name': donor_name,
        'donor_email': match.donor.email,
    }, status=status.HTTP_200_OK)
