from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from typing import Any, List
from uuid import uuid4

from jose import jwt
from fastapi import HTTPException, Request, Response, status
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import PasswordValidationError
from app.core.crypto import decrypt_str, encrypt_str
import bcrypt

logger = get_logger()

def validate_password_strength(password: str) -> None:
    """
    Validate password meets security requirements.
    """
    if not password:
        raise PasswordValidationError("Password cannot be empty")
    
    password_bytes = password.encode('utf-8')
    
    # Check bcrypt limit
    if len(password_bytes) > 72:
        raise PasswordValidationError(f"Password too long (max 72 bytes, got {len(password_bytes)} bytes). "f"Please use a shorter password.")
    
    # Check minimum length (increased from 8 to 12)
    if len(password) < 12:
        raise PasswordValidationError(f"Password too short (minimum 12 characters, got {len(password)} characters)")
    
    # Check for enhanced complexity
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not (has_upper and has_lower and has_digit and has_special):
        raise PasswordValidationError("Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)")

def hash_password(password: str) -> str:
    """
    Hash password using bcrypt with proper validation.
    """
    validate_password_strength(password)
    
    password_bytes = password.encode('utf-8')
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash.
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            logger.warning("Password verification failed: password too long")
            return False
        
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.error("Password verification error: %s", e)
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": str(uuid4()),
    })
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def should_require_mfa_for_role(user: Any, policy: dict | None = None) -> bool:
    """Return whether MFA should be required for a user based on policy and user flags."""
    if getattr(user, "mfa_required", False):
        return True

    if not policy:
        return False

    required_roles = {role for role in (policy.get("required_roles") or []) if role}
    optional_roles = {role for role in (policy.get("optional_roles") or []) if role}
    role = getattr(user, "role", None)

    if role in required_roles:
        return True
    if role in optional_roles:
        return False
    return False


def generate_mfa_secret(length: int = 20) -> str:
    """Generate a Base32 secret suitable for TOTP apps."""
    random_bytes = secrets.token_bytes(length)
    return base64.b32encode(random_bytes).decode("ascii").rstrip("=")


def generate_totp_code(secret: str, current_time: int | None = None, digits: int = 6, interval: int = 30) -> str:
    """Generate a TOTP code from a Base32 secret."""
    if current_time is None:
        current_time = int(time.time())
    counter = current_time // interval
    key = base64.b32decode(secret.upper() + "=" * (-len(secret) % 8))
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary_code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    code = binary_code % (10 ** digits)
    return f"{code:0{digits}d}"


def verify_totp_code(secret: str, provided_code: str, current_time: int | None = None, window: int = 1, digits: int = 6, interval: int = 30) -> bool:
    """Verify a TOTP code within a small time window."""
    if not secret or not provided_code:
        return False
    provided_code = str(provided_code).strip()
    if len(provided_code) != digits or not provided_code.isdigit():
        return False
    if current_time is None:
        current_time = int(time.time())
    for offset in range(-window, window + 1):
        candidate = generate_totp_code(secret=secret, current_time=current_time + offset * interval, digits=digits, interval=interval)
        if hmac.compare_digest(candidate, provided_code):
            return True
    return False


def generate_backup_codes(count: int = 8) -> List[str]:
    return [f"{secrets.token_hex(2).upper()}{secrets.token_hex(2).upper()[:4]}" for _ in range(count)]


def store_secret(secret: str) -> str:
    return encrypt_str(secret)


def read_secret(encrypted_secret: str | None) -> str | None:
    if not encrypted_secret:
        return None
    try:
        return decrypt_str(encrypted_secret)
    except ValueError:
        return None


# --- Cookie auth + CSRF (double-submit) ---

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CSRF_EXEMPT_PREFIXES = (
    "/auth/login",
    "/auth/signup",
    "/auth/cornerstone-login",
    "/auth/oauth/",
    "/auth/forgot_password/",
    "/auth/candidate/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def is_csrf_exempt(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES)


def validate_csrf(request: Request) -> None:
    if request.method in CSRF_SAFE_METHODS:
        return
    if is_csrf_exempt(request.url.path):
        return
    # Bearer-token clients (Swagger, curl, mobile) are not cookie-session CSRF targets.
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return
    if not request.cookies.get("access_token"):
        return
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)
    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed.")


def set_auth_cookies(response: Response, access_token: str, *, max_age_minutes: int | None = None) -> None:
    max_age = (max_age_minutes or settings.access_token_expire_minutes) * 60
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=max_age,
        httponly=False,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
