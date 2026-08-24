from typing import Optional, Tuple
import ipaddress
from fastapi import Request
from app.core.config import settings

from cachetools import TTLCache


def normalize_country_value(country: Optional[str]) -> Optional[str]:
    """Normalize country values and suppress placeholder values from the API."""
    if country is None:
        return None
    cleaned = str(country).strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in {"string", "unknown", "none", "null", "n/a", "na"}:
        return None
    return cleaned

_MAX_COUNTRY_CACHE = 10_000
_country_cache = TTLCache(maxsize=_MAX_COUNTRY_CACHE, ttl=86400)


def _extract_client_ip(request: Request) -> Optional[str]:
    """Extract client IP, honoring forwarding headers only from trusted proxies."""
    direct_ip = request.client.host if request.client else None
    trusted_proxies = settings.trusted_proxy_ips_list

    if not trusted_proxies or not direct_ip:
        return direct_ip

    if direct_ip not in trusted_proxies:
        return direct_ip

    headers_to_check = [
        "X-Forwarded-For",
        "X-Real-IP",
        "CF-Connecting-IP",
        "True-Client-IP",
    ]

    for header in headers_to_check:
        ip = request.headers.get(header)
        if not ip:
            continue
        ip = ip.split(",")[0].strip()
        if ":" in ip and not ip.startswith("["):
            ip = ip.split(":")[0]
        ip = ip.strip()
        if ip and not ip.startswith("127.") and not ip.startswith("0."):
            return ip
    return direct_ip


def _is_private_ip(ip: str) -> bool:
    """Check if IP is private/local."""
    try:
        addr = ipaddress.ip_address(ip)
        return addr.is_private or addr.is_loopback
    except Exception:
        return True


def _extract_country_from_headers(request: Request) -> Optional[str]:
    """Read country from common proxy headers when geo APIs fail."""
    for header in ("CF-IPCountry", "X-Country-Code", "X-Country"):
        value = request.headers.get(header)
        if not value:
            continue
        country = normalize_country_value(value.split(",")[0].strip())
        if country:
            return country
    return None


async def _country_from_api(ip: Optional[str]) -> Optional[str]:
    """Get country from IP using multiple fallback providers when possible."""
    if not ip:
        return None
    if ip in _country_cache:
        return _country_cache[ip]

    from app.core.http_client import get_http_client
    from app.core.logging import get_logger

    logger = get_logger()
    client = get_http_client()

    services = [
        ("ipinfo.io", f"https://ipinfo.io/{ip}/json", lambda data: data.get("country")),
        ("ip-api.com", f"https://ip-api.com/json/{ip}", lambda data: data.get("country") or data.get("countryCode")),
        ("ip-api.is", f"https://ipapi.is/{ip}", lambda data: data.get("country")),
    ]

    for name, url, parser in services:
        try:
            logger.info(f"Looking up country for IP {ip} from {name}")
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                country = normalize_country_value(parser(data))
                if country:
                    _country_cache[ip] = country
                    logger.info(f"Successfully got country '{country}' for IP {ip} from {name}")
                    return country
                logger.warning(f"No country data returned by {name} for IP {ip}")
            else:
                logger.warning(f"HTTP {resp.status_code} from {name} for IP {ip}")
        except Exception as e:
            logger.warning(f"Error from {name} for IP {ip}: {str(e)}")

    return None


async def get_client_ip_and_country(request: Request) -> Tuple[Optional[str], Optional[str]]:
    """Get client IP and country, best-effort across providers and headers."""
    if settings.country_override:
        return _extract_client_ip(request), normalize_country_value(settings.country_override)

    ip = _extract_client_ip(request)
    if not ip:
        return None, None

    header_country = _extract_country_from_headers(request)
    if header_country:
        return ip, header_country

    if _is_private_ip(ip):
        country = await _country_from_api(None)
        if country:
            return ip, normalize_country_value(country)
        return ip, None

    country = await _country_from_api(ip)
    if country:
        return ip, normalize_country_value(country)

    return ip, None


def get_client_ip(request: Request) -> str:
    """Get client IP only."""
    return _extract_client_ip(request) or ""
