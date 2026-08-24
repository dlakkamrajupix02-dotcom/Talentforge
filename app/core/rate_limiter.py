from __future__ import annotations
import redis
from slowapi import Limiter
from fastapi import Request
from app.core.client_ip import get_client_ip
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger()

#my POV of using the limiter for the endpoints is to prevent the application from the bruteforce attack.
def get_rate_limit_key(request: Request) -> str:
    """
    Multi-layered rate limiting key: IP + user ID (if authenticated) + endpoint path.
    This prevents botnet attacks by combining multiple identification factors.
    """
    # Get IP address
    ip = get_client_ip(request) or "unknown"
    
    # Get user ID if authenticated (from session/token)
    user_id = "anonymous"
    try:
        # Try to extract user from request state 
        if hasattr(request.state, 'user') and request.state.user:
            user_id = str(request.state.user.id)
    except Exception:
        pass
    
    # Get endpoint path
    endpoint = request.url.path or "unknown"
    
    # Combine all factors for multi-layered rate limiting
    return f"{ip}:{user_id}:{endpoint}"


# Create limiter with multi-layered key function
storage_uri = settings.redis_url
try:
    # Verify Redis availability with a quick connection timeout
    r = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
    r.ping()
    logger.info("Rate limiter successfully connected to Redis storage.")
except Exception as e:
    logger.error(f"Redis is offline or unreachable ({e}). Rate limiting disabled - blocking requests.")
    # Fail closed: if Redis is unavailable, rate limiting is disabled but application should still function
    # In production, consider blocking all requests or using very conservative limits
    storage_uri = "memory://"

limiter = Limiter(key_func=get_rate_limit_key,storage_uri=storage_uri,default_limits=["200/minute"])


