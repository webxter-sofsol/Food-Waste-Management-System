"""
Utility functions for authentication module
"""
from django.utils import timezone


def log_audit_event(user=None, action_type='', entity_type=None, entity_id=None,
                    ip_address='', user_agent='', details=None):
    """
    Log an audit event for authentication and administrative actions
    
    Args:
        user: User object (can be None for failed login attempts)
        action_type: Type of action (login, logout, register, create, update, delete, admin_action)
        entity_type: Type of entity affected (optional)
        entity_id: ID of entity affected (optional)
        ip_address: Client IP address
        user_agent: Client user agent string
        details: Additional details as JSON (optional)
    """
    # Import here to avoid circular imports
    from safety_analytics.models import AuditLog
    
    if details is None:
        details = {}
    
    AuditLog.objects.create(
        user=user,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        timestamp=timezone.now()
    )
