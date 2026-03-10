"""
Rate limiting for authentication endpoints
"""
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


def check_rate_limit(identifier, action='login', max_attempts=5, window_minutes=15):
    """
    Check if the identifier (IP address) has exceeded rate limit
    
    Args:
        identifier: Unique identifier (usually IP address)
        action: Action being rate limited (e.g., 'login')
        max_attempts: Maximum number of attempts allowed
        window_minutes: Time window in minutes
    
    Returns:
        dict: {
            'allowed': bool,
            'attempts': int,
            'retry_after': int (seconds until next attempt allowed)
        }
    """
    cache_key = f'rate_limit:{action}:{identifier}'
    
    # Get current attempts from cache
    attempts_data = cache.get(cache_key)
    
    if attempts_data is None:
        # First attempt
        attempts_data = {
            'count': 1,
            'first_attempt': timezone.now().isoformat()
        }
        cache.set(cache_key, attempts_data, window_minutes * 60)
        return {
            'allowed': True,
            'attempts': 1,
            'retry_after': 0
        }
    
    # Parse first attempt time
    first_attempt = timezone.datetime.fromisoformat(attempts_data['first_attempt'])
    current_time = timezone.now()
    time_elapsed = (current_time - first_attempt).total_seconds()
    
    # Check if window has expired
    if time_elapsed > window_minutes * 60:
        # Reset counter
        attempts_data = {
            'count': 1,
            'first_attempt': current_time.isoformat()
        }
        cache.set(cache_key, attempts_data, window_minutes * 60)
        return {
            'allowed': True,
            'attempts': 1,
            'retry_after': 0
        }
    
    # Increment attempt count
    current_count = attempts_data['count']
    
    if current_count >= max_attempts:
        # Rate limit exceeded
        retry_after = int((window_minutes * 60) - time_elapsed)
        return {
            'allowed': False,
            'attempts': current_count,
            'retry_after': retry_after
        }
    
    # Increment and allow
    attempts_data['count'] = current_count + 1
    remaining_time = int((window_minutes * 60) - time_elapsed)
    cache.set(cache_key, attempts_data, remaining_time)
    
    return {
        'allowed': True,
        'attempts': attempts_data['count'],
        'retry_after': 0
    }


def reset_rate_limit(identifier, action='login'):
    """
    Reset rate limit for an identifier
    
    Args:
        identifier: Unique identifier (usually IP address)
        action: Action being rate limited
    """
    cache_key = f'rate_limit:{action}:{identifier}'
    cache.delete(cache_key)
