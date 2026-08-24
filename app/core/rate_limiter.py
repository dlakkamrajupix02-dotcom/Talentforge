from __future__ import annotations
import redis
from slowapi import Limiter
from fastapi import Request
from app.core.client_ip import get_client_ip
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger()

def get_rate_limit_key(request: Request) -> str:
    """
    Multi-layered rate limiting key: IP + user ID (if authenticated) + endpoint path.
    """
    ip = get_client_ip(request) or "unknown"
    user_id = "anonymous"
    try:
        if hasattr(request.state, 'user') and request.state.user:
            user_id = str(request.state.user.id)
    except Exception:
        pass
    endpoint = request.url.path or "unknown"
    return f"{ip}:{user_id}:{endpoint}"

storage_uri = "memory://"
redis_url_str = str(settings.redis_url or "").strip()

if redis_url_str and redis_url_str.startswith(("redis://", "rediss://", "unix://")):
    try:
        r = redis.Redis.from_url(redis_url_str, socket_connect_timeout=1, socket_timeout=1)
        r.ping()
        storage_uri = redis_url_str
        logger.info("Rate limiter successfully connected to Redis storage.")
    except Exception as e:
        logger.warning(f"Redis is offline or unreachable ({e}). Using in-memory rate limiter.")
        storage_uri = "memory://"
else:
    logger.info("No external Redis URL configured. Using in-memory rate limiting.")
    storage_uri = "memory://"

limiter = Limiter(key_func=get_rate_limit_key, storage_uri=storage_uri, default_limits=["200/minute"])
