from app.core.logging import get_logger
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel as PydanticBaseModel
from app.services.redis_service import _BaseRedisClient


logger = get_logger()

class CacheService(_BaseRedisClient):
    """Enhanced Redis caching service. Lifecycle (init/close/is_available) inherited from _BaseRedisClient."""

    _service_name = "Cache Redis"

    def _to_jsonable(self, value: Any) -> Any:
        """Convert common Python types to JSON-serializable equivalents."""
        if isinstance(value, PydanticBaseModel):
            # mode="json" converts datetimes/UUIDs to strings.
            return value.model_dump(mode="json")

        if isinstance(value, datetime):
            return value.isoformat()

        if isinstance(value, uuid.UUID):
            return str(value)

        if isinstance(value, dict):
            return {str(k): self._to_jsonable(v) for k, v in value.items()}

        if isinstance(value, (list, tuple)):
            return [self._to_jsonable(v) for v in value]

        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        return str(value)

    def _make_key(self, prefix: str, identifier: str) -> str:
        """Generate consistent cache keys with global prefixing."""
        raw_key = f"{prefix}:{identifier}"
        return self._get_key(raw_key)

    async def cache_user(self, user_id: str, user_data: Dict[str, Any], ttl_minutes: int = 30) -> bool:
        """Cache user session data"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("user", user_id)
            ttl_seconds = ttl_minutes * 60

            payload = json.dumps(self._to_jsonable(user_data))
            await self.redis_client.setex(key, ttl_seconds, payload)

            logger.debug(f"Cached user data for {user_id}, TTL: {ttl_minutes}min")
            return True

        except Exception as e:
            logger.error(f"Failed to cache user {user_id}: {e}")
            return False

    async def get_cached_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached user data"""
        if not self.is_available():
            return None

        try:
            key = self._make_key("user", user_id)
            cached_data = await self.redis_client.get(key)

            if cached_data:
                return json.loads(cached_data)
            return None

        except Exception as e:
            logger.error(f"Failed to get cached user {user_id}: {e}")
            return None

    async def invalidate_user_cache(self, user_id: str) -> bool:
        """Remove cached user data"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("user", user_id)
            result = await self.redis_client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to invalidate user cache {user_id}: {e}")
            return False

    async def invalidate_permissions(self, user_id: str) -> bool:
        """Remove cached permissions data"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("permissions", user_id)
            result = await self.redis_client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to invalidate permissions cache {user_id}: {e}")
            return False

    # JD Caching
    async def cache_jd(self, jd_id: str, jd_data: Dict[str, Any], ttl_minutes: int = 60) -> bool:
        """Cache job description data"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("jd", jd_id)
            ttl_seconds = ttl_minutes * 60

            payload = json.dumps(self._to_jsonable(jd_data))
            await self.redis_client.setex(key, ttl_seconds, payload)

            logger.debug(f"Cached JD {jd_id}, TTL: {ttl_minutes}min")
            return True

        except Exception as e:
            logger.error(f"Failed to cache JD {jd_id}: {e}")
            return False

    async def get_cached_jd(self, jd_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached JD data"""
        if not self.is_available():
            return None

        try:
            key = self._make_key("jd", jd_id)
            cached_data = await self.redis_client.get(key)

            if cached_data:
                return json.loads(cached_data)
            return None

        except Exception as e:
            logger.error(f"Failed to get cached JD {jd_id}: {e}")
            return None

    async def invalidate_jd_cache(self, jd_id: str) -> bool:
        """Remove cached JD data"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("jd", jd_id)
            result = await self.redis_client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Failed to invalidate JD cache {jd_id}: {e}")
            return False

    # Query Result Caching
    async def cache_query_result(self, query_key: str, result: Any, ttl_minutes: int = 10) -> bool:
        """Cache database query results"""
        if not self.is_available():
            return False

        try:
            key = self._make_key("query", query_key)
            ttl_seconds = ttl_minutes * 60

            payload = json.dumps(self._to_jsonable(result))
            await self.redis_client.setex(key, ttl_seconds, payload)

            logger.debug(f"Cached query result for {query_key}, TTL: {ttl_minutes}min")
            return True

        except Exception as e:
            logger.error(f"Failed to cache query result {query_key}: {e}")
            return False

    async def get_cached_query_result(self, query_key: str) -> Optional[Any]:
        """Retrieve cached query result"""
        if not self.is_available():
            return None

        try:
            key = self._make_key("query", query_key)
            cached_data = await self.redis_client.get(key)

            if cached_data:
                return json.loads(cached_data)
            return None

        except Exception as e:
            logger.error(f"Failed to get cached query result {query_key}: {e}")
            return None

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        if not self.is_available():
            return {"error": "Cache not available"}

        try:
            info = await self.redis_client.info()

            return {
                "total_keys": info.get("dbkeys", 0),
                "memory_used": info.get("used_memory_human", "N/A"),
                "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 1) + info.get("keyspace_misses", 1), 1),
                "uptime": info.get("uptime_in_seconds", 0)
            }

        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"error": str(e)}

    async def clear_cache_by_pattern(self, pattern: str) -> int:
        """Clear cache keys matching pattern with prefixing."""
        if not self.is_available():
            return 0

        prefixed_pattern = self._get_key(pattern)
        try:
            deleted = 0
            cursor: int | str = 0
            while True:
                cursor, keys = await self.redis_client.scan(cursor=cursor, match=prefixed_pattern, count=500)
                if keys:
                    deleted += await self.redis_client.delete(*keys)
                if not cursor or str(cursor) == "0":
                    break
            return int(deleted)
        except Exception as e:
            logger.error(f"Failed to clear cache pattern {prefixed_pattern}: {e}")
            return 0

cache_service = CacheService()
