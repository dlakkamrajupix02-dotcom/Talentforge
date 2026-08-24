from app.core.logging import get_logger
import json
from typing import Optional, Dict, Any
import redis.asyncio as redis_async
from app.core.config import settings


logger = get_logger()


class _BaseRedisClient:
    """
    Shared Redis lifecycle base — init, close, is_available.
    """
    _service_name: str = "Redis"

    def __init__(self) -> None:
        self.redis_client: redis_async.Redis | None = None

    def is_available(self) -> bool:
        return self.redis_client is not None

    async def init(self) -> None:
        """Initialize Redis client called during app startup."""
        # return # Minimal line to override Redis
        if self.is_available():
            return
        url = str(settings.redis_url or "").strip()
        if not url or not url.startswith(("redis://", "rediss://", "unix://")):
            logger.info(f"No valid Redis URL configured for {self._service_name}. Operating with in-memory fallback.")
            self.redis_client = None
            return

        try:
            # Use max_connections=50 to handle high concurrent load (1000 users target)
            self.redis_client = redis_async.from_url(url, decode_responses=True, socket_connect_timeout=3, socket_timeout=3, max_connections=50)
            await self.redis_client.ping()
            logger.info(f"{self._service_name} connection established successfully (Prefix: {settings.redis_key_prefix})")
        except Exception as e:
            logger.warning(f"Failed to connect to {self._service_name}: {e}. Operating with in-memory fallback.")
            self.redis_client = None

    def _get_key(self, key: str) -> str:
        """Apply prefix to key for production isolation."""
        return f"{settings.redis_key_prefix}:{key}"

    async def close(self) -> None:
        """Close Redis client (called during app shutdown)."""
        if self.redis_client is None:
            return
        try:
            await self.redis_client.aclose()
        except Exception as e:
            logger.warning(f"Error closing {self._service_name} client: {e}")
        finally:
            self.redis_client = None


class RedisService(_BaseRedisClient):
    """Auth token + session ID cache. Lifecycle inherited from _BaseRedisClient."""

    _service_name = "Redis"

    async def store_token(self, user_id: str, token_data: Dict[str, Any], expire_minutes: int = None) -> bool:
        """Store auth token with expiration"""
        if not self.is_available():
            logger.warning("Redis not available, skipping token storage")
            return False

        try:
            session_id = token_data.get("sid")
            if not session_id:
                key = self._get_key(f"auth_token:{user_id}")
            else:
                key = self._get_key(f"auth_token:sid:{session_id}")

            expire_seconds = expire_minutes * 60 if expire_minutes else settings.access_token_expire_minutes * 60
            await self.redis_client.setex(key,expire_seconds,json.dumps({"access_token": token_data["access_token"], "token_type": token_data["token_type"]}))
            return True
        except Exception as e:
            logger.error(f"Failed to store token for user {user_id}: {e}")
            return False

    async def get_token(self, user_id: str, session_id: str = None) -> Optional[Dict[str, Any]]:
        """Retrieve stored token for user, checking SID first if provided."""
        if not self.is_available():
            return None

        try:
            if session_id:
                key = self._get_key(f"auth_token:sid:{session_id}")
                token_data = await self.redis_client.get(key)
                if token_data:
                    return json.loads(token_data)

            # Fallback to user_id based key
            key = self._get_key(f"auth_token:{user_id}")
            token_data = await self.redis_client.get(key)
            if token_data:
                return json.loads(token_data)
            return None
        except Exception as e:
            logger.error(f"Failed to get token for user {user_id}: {e}")
            return None

    async def get_token_by_sid(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored token for a specific session."""
        if not self.is_available() or not session_id:
            return None
        try:
            key = self._get_key(f"auth_token:sid:{session_id}")
            token_data = await self.redis_client.get(key)
            if token_data:
                return json.loads(token_data)
            return None
        except Exception as e:
            logger.error(f"Failed to get token for sid {session_id}: {e}")
            return None

    async def invalidate_token(self, user_id: str, session_id: str = None) -> bool:
        """Remove stored token (logout)."""
        if not self.is_available():
            return False

        try:
            if session_id:
                await self.redis_client.delete(self._get_key(f"auth_token:sid:{session_id}"))
            
            key = self._get_key(f"auth_token:{user_id}")
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate token for user {user_id}: {e}")
            return False

    async def set_session_id(self, user_id: str, session_id: str, expire_seconds: int) -> None:
        """Cache a session_id link so logout can close the DB audit row."""
        if not self.is_available():
            return
        try:
            await self.redis_client.setex(self._get_key(f"active_session:{session_id}"), expire_seconds, user_id)
        except Exception:
            return

    async def validate_session(self, session_id: str) -> Optional[bool]:
        """Check if a specific session_id is active. Returns None if Redis is down."""
        if not self.is_available() or not session_id:
            return None
        try:
            exists = await self.redis_client.exists(self._get_key(f"active_session:{session_id}"))
            return bool(exists)
        except Exception:
            return None

    async def get_session_id(self, user_id: str) -> Optional[str]:
        """Get cached session_id for logout linkage."""
        if not self.is_available():
            return None
        try:
            return await self.redis_client.get(self._get_key(f"session_id:{user_id}"))
        except Exception:
            return None

    async def delete_session_id(self, user_id: str) -> None:
        if not self.is_available():
            return
        try:
            await self.redis_client.delete(self._get_key(f"session_id:{user_id}"))
        except Exception:
            return

    async def invalidate_session(self, session_id: str) -> None:
        """Explicitly invalidate a specific session."""
        if not self.is_available() or not session_id:
            return
        try:
            await self.redis_client.delete(self._get_key(f"active_session:{session_id}"))
            await self.redis_client.delete(self._get_key(f"auth_token:sid:{session_id}"))
            logger.info(f"Session {session_id} invalidated in Redis")
        except Exception as e:
            logger.error(f"Failed to invalidate session {session_id}: {e}")


    async def set_presence(self, user_id: str, expire_seconds: int = 60) -> None:
        """Mark a user as online."""
        if not self.is_available():
            return
        try:
            await self.redis_client.setex(self._get_key(f"presence:{user_id}"), expire_seconds, "online")
        except Exception:
            pass

    async def get_presence(self, user_id: str) -> str:
        """Get user presence status."""
        if not self.is_available():
            return "offline"
        try:
            status = await self.redis_client.get(self._get_key(f"presence:{user_id}"))
            return status if status else "offline"
        except Exception:
            return "offline"

    async def set_typing(self, sender_id: str, recipient_id: str, expire_seconds: int = 5) -> None:
        """Set typing indicator."""
        if not self.is_available():
            return
        try:
            key = self._get_key(f"typing:{sender_id}:{recipient_id}")
            await self.redis_client.setex(key, expire_seconds, "1")
        except Exception:
            pass

    async def is_typing(self, sender_id: str, recipient_id: str) -> bool:
        """Check if a specific user is typing to another user."""
        if not self.is_available():
            return False
        try:
            key = self._get_key(f"typing:{sender_id}:{recipient_id}")
            return bool(await self.redis_client.exists(key))
        except Exception:
            return False


redis_service = RedisService()
