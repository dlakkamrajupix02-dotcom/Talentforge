from typing import Optional
import httpx
from app.core.logging import get_logger

logger = get_logger()

_client: Optional[httpx.AsyncClient] = None


def init_http_client() -> httpx.AsyncClient:
    """Initialize a single shared AsyncClient for the whole app."""
    global _client  # Made global to use throughout the app
    if _client is not None:
        return _client

    timeout = httpx.Timeout(connect=5.0, # time to TCP connection
                            read=35.0,  # Waiting for response data need to update according to AI max response time
                            write=15.0, # time to send request body
                            pool=5.0)   # waiting time for freeing up of a connection
    limits = httpx.Limits(max_connections=200, max_keepalive_connections=50, keepalive_expiry=30.0)

    _client = httpx.AsyncClient(timeout=timeout, limits=limits, follow_redirects=True)
    logger.info("Shared HTTP client initialized")
    return _client


async def close_http_client() -> None:
    global _client
    if _client is None:
        return
    try:
        await _client.aclose()
        logger.info("Shared HTTP client closed")
    finally:
        _client = None


def get_http_client() -> httpx.AsyncClient:
    """
    FastAPI dependency that returns the shared client.
    """
    if _client is None:
        return init_http_client()
    return _client

