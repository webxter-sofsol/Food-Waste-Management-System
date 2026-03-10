"""
Custom permission classes for role-based access control (RBAC)
"""
from rest_framework import permissions


class IsDonor(permissions.BasePermission):
    """
    Permission class to check if user has donor role
    """
    message = "You must be a donor to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'donor' and
            request.user.verification_status == 'approved'
        )


class IsReceiver(permissions.BasePermission):
    """
    Permission class to check if user has receiver role
    """
    message = "You must be a receiver to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'receiver' and
            request.user.verification_status == 'approved'
        )


class IsVolunteer(permissions.BasePermission):
    """
    Permission class to check if user has volunteer role
    """
    message = "You must be a volunteer to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'volunteer' and
            request.user.verification_status == 'approved'
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission class to check if user has admin role
    """
    message = "You must be an admin to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsVerified(permissions.BasePermission):
    """
    Permission class to check if user is verified (approved)
    """
    message = "Your account must be verified to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.verification_status == 'approved'
        )


class IsDonorOrReceiver(permissions.BasePermission):
    """
    Permission class to check if user is either donor or receiver
    """
    message = "You must be a donor or receiver to access this resource"
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['donor', 'receiver'] and
            request.user.verification_status == 'approved'
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class to check if user is the owner of the object or an admin
    """
    message = "You must be the owner or an admin to access this resource"
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any object
        if request.user.role == 'admin':
            return True
        
        # Check if object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if object is the user itself
        if hasattr(obj, 'id') and hasattr(request.user, 'id'):
            return obj.id == request.user.id
        
        return False
