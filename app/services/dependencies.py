from __future__ import annotations
from uuid import UUID
from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, ExpiredSignatureError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.messages import ORG_ACCESS_SUSPENDED_MESSAGE
from app.repository import candidate_user_repository as candidate_repo
from app.repository import user_repository as user_repo
from app.services.redis_service import redis_service

logger = get_logger()

oauth2_scheme = HTTPBearer()
oauth2_scheme_optional = HTTPBearer(auto_error=False)

STAFF_ROLES = frozenset({"Admin", "HR", "Manager", "User"})
CSOD_STAFF_ROLES = frozenset({"Admin", "HR", "Manager"})
ORG_JD_ADMIN_ROLES = frozenset({"Super_Admin", "Admin", "HR", "Manager"})


def _401(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail=detail,headers={"WWW-Authenticate": "Bearer"})


def decode_token_payload(token: str) -> dict:
    """Decode and validate JWT; raises HTTPException on failure."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except ExpiredSignatureError:
        logger.debug("Token rejected: signature has expired")
        raise _401("Token has expired. Please log in again.")
    except JWTError as exc:
        logger.debug("Token rejected: JWT decode error — %s", exc)
        raise _401("Invalid token. Please log in again.")


async def _validate_staff_session(db: AsyncSession,*,token_credentials: str,user_id: str,session_id: str | None) -> None:
    """Validate staff session in Redis with DB fallback. Fail closed on errors."""
    try:
        if session_id:
            is_active = await redis_service.validate_session(session_id)
            if is_active is False:
                logger.debug("Token rejected: session %s invalidated in Redis", session_id)
                raise _401("Session has been invalidated. Please log in again.")
            if is_active is None:
                from app.repository import session_repository as session_repo
                db_active = await session_repo.is_session_valid_db(db, UUID(session_id))
                if not db_active:
                    logger.debug("Token rejected: session %s not active in DB fallback", session_id)
                    raise _401("Session has been invalidated or expired.")
                logger.info("Redis unavailable — validated session %s via DB fallback", session_id)
            stored = await redis_service.get_token(user_id, session_id)
            if stored and stored.get("access_token") != token_credentials:
                logger.debug("Token rejected: mismatch for session %s", session_id)
                raise _401("Session has been invalidated. Please log in again.")
        else:
            cached_token = await redis_service.get_token(user_id)
            if cached_token and cached_token.get("access_token") != token_credentials:
                logger.debug("Token rejected: does not match stored token for user %s", user_id)
                raise _401("Session has been invalidated. Please log in again.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Session validation failed (fail-closed): %s", exc)
        raise _401("Could not validate session. Please log in again.")


def _extract_access_token(request: Request, bearer: HTTPAuthorizationCredentials | None) -> str:
    if bearer and bearer.credentials:
        return bearer.credentials
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    raise _401("Not authenticated")


async def get_current_user(
    request: Request,
    bearer: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolve staff User or CandidateUser from JWT.
    Use only on endpoints that legitimately serve both audiences (e.g. /auth/me).
    """
    token_credentials = _extract_access_token(request, bearer)
    payload = decode_token_payload(token_credentials)
    user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")
    if user_id is None:
        raise _401("Invalid token payload.")

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise _401("Invalid token payload.")

    if session_id:
        await _validate_staff_session(db,token_credentials=token_credentials,user_id=user_id,session_id=session_id,)

    try:
        user = await user_repo.get_user_by_id(db, user_uuid)
    except Exception as exc:
        logger.error("Database error during user lookup for %s: %s", user_id, exc)
        raise _401("Could not validate credentials.")

    if user is None:
        if not session_id:
            try:
                candidate = await candidate_repo.get_candidate_user_by_id(db, user_uuid)
            except Exception as exc:
                logger.error("Database error during candidate lookup for %s: %s", user_id, exc)
                raise _401("Could not validate credentials.")
            if candidate is None:
                raise _401("User not found or has been deleted.")
            if candidate.status == "inactive":
                raise _401("Candidate account is inactive. Please contact your administrator.")
            if request is not None:
                request.state.user = candidate
            candidate._current_sid = session_id
            return candidate
        raise _401("User not found or has been deleted.")

    if user.status == "inactive":
        raise _401("User account is inactive. Please contact your administrator.")

    if not session_id:
        cached_token = await redis_service.get_token(user_id)
        if cached_token and cached_token.get("access_token") != token_credentials:
            raise _401("Session has been invalidated. Please log in again.")

    if request is not None:
        request.state.user = user
    user._current_sid = session_id
    return user


async def get_current_regular_user(
    request: Request,
    bearer: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff-only dependency. Rejects candidate tokens (no sid) and deleted users.
    """
    token_credentials = _extract_access_token(request, bearer)
    payload = decode_token_payload(token_credentials)
    user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")
    if user_id is None:
        raise _401("Invalid token payload.")

    if not session_id:
        logger.warning("Candidate token attempted staff endpoint — user_id: %s", user_id)
        raise _401("This endpoint is not accessible with candidate credentials.")

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise _401("Invalid token payload.")

    await _validate_staff_session(db,token_credentials=token_credentials,user_id=user_id,session_id=session_id)

    try:
        user = await user_repo.get_user_by_id(db, user_uuid)
    except Exception as exc:
        logger.error("Database error during user lookup: %s", exc)
        raise _401("Could not validate credentials.")

    if user is None:
        raise _401("User not found or has been deleted.")

    if user.status == "inactive":
        raise _401("User account is inactive. Please contact your administrator.")

    if request is not None:
        request.state.user = user
    user._current_sid = session_id
    return user


async def get_current_candidate(
    request: Request,
    bearer: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
):
    """Candidate-only dependency. Rejects staff tokens that include a session id."""
    token_credentials = _extract_access_token(request, bearer)
    payload = decode_token_payload(token_credentials)
    user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")
    if user_id is None:
        raise _401("Invalid token payload.")
    if session_id:
        logger.warning("Staff token attempted candidate endpoint — user_id: %s", user_id)
        raise _401("This endpoint is not accessible with staff credentials.")

    try:
        candidate = await candidate_repo.get_candidate_user_by_id(db, UUID(user_id))
    except Exception:
        raise _401("Could not validate credentials.")
    if candidate is None:
        raise _401("Candidate not found.")

    from app.repository import organization_repository as org_repo
    from datetime import datetime, timezone
    if candidate.org_id:
        org = await org_repo.get_organization_by_id(db, candidate.org_id)
        if org and (not org.is_active or (org.access_valid_until and org.access_valid_until < datetime.now(timezone.utc))):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ORG_ACCESS_SUSPENDED_MESSAGE)

    if request is not None:
        request.state.user = candidate
    return candidate


async def get_current_user_optional(
    request: Request,
    bearer: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
):
    """Optional authentication: returns User/CandidateUser if valid token provided, else None.
    Raises HTTPException (401) if token is present but invalid/expired.
    """
    token_credentials = None
    if bearer and bearer.credentials:
        token_credentials = bearer.credentials
    elif request.cookies.get("access_token"):
        token_credentials = request.cookies.get("access_token")
    if token_credentials is None:
        return None

    payload = decode_token_payload(token_credentials)
    user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")
    
    if user_id is None:
        raise _401("Invalid token payload: missing sub claim.")
    
    # If session_id is present, it's a staff token
    if session_id:
        user = await user_repo.get_user_by_id(db, UUID(user_id))
        if not user or user.deleted_at is not None:
            raise _401("User not found or deleted.")
        await _validate_staff_session(db, token_credentials=token_credentials, user_id=user_id, session_id=session_id)
        user._current_sid = session_id
        if request is not None:
            request.state.user = user
        return user
    
    # Otherwise try candidate
    candidate = await candidate_repo.get_candidate_user_by_id(db, UUID(user_id))
    if not candidate:
        raise _401("Candidate not found.")
    if request is not None:
        request.state.user = candidate
    return candidate


def _token_from_cookie_header(cookie_header: str | None) -> str | None:
    if not cookie_header:
        return None
    for part in cookie_header.split(";"):
        name, _, value = part.strip().partition("=")
        if name in ("access_token", "token", "accessToken") and value:
            return value.strip()
    return None


def extract_websocket_token(websocket: WebSocket) -> str | None:
    """Read JWT from Authorization header or cookie (browser WS standard fallbacks)."""
    auth_header = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()

    cookie_token = _token_from_cookie_header(websocket.headers.get("cookie"))
    if cookie_token:
        return cookie_token
    protocol_header = websocket.headers.get("sec-websocket-protocol")
    if protocol_header:
        for entry in protocol_header.split(","):
            entry = entry.strip()
            lower = entry.lower()
            for prefix in ("bearer.", "bearer-", "access_token.", "token."):
                if lower.startswith(prefix):
                    value = entry[len(prefix) :].strip()
                    if value:
                        return value
    return None


async def validate_websocket_token(token: str, expected_user_id: str) -> bool:
    """
    Validate staff or candidate JWT for WebSocket.
    Staff tokens include sid and require session validation.
    Candidate tokens do not include sid and are validated against candidate_users.
    """
    try:
        expected_uuid = UUID(expected_user_id)
    except ValueError:
        return False
    try:
        payload = decode_token_payload(token)
    except HTTPException:
        return False

    sub = payload.get("sub")
    session_id = payload.get("sid")
    if not sub:
        return False
    try:
        sub_uuid = UUID(sub)
        if sub_uuid != expected_uuid:
            return False
    except ValueError:
        return False
    from app.core.database import AsyncSessionLocal
    from app.repository import session_repository as session_repo
    if not session_id:
        async with AsyncSessionLocal() as db:
            candidate = await candidate_repo.get_candidate_user_by_id(db, sub_uuid)
            return candidate is not None
    if not redis_service.is_available():
        async with AsyncSessionLocal() as db:
            return await session_repo.is_session_valid_db(db, UUID(session_id))
    is_active = await redis_service.validate_session(session_id)
    if is_active is False:
        return False
    if is_active is None:
        async with AsyncSessionLocal() as db:
            if not await session_repo.is_session_valid_db(db, UUID(session_id)):
                return False
    else:
        stored = await redis_service.get_token(sub, session_id)
        if stored and stored.get("access_token") != token:
            return False
    return True


async def resolve_websocket_token(websocket: WebSocket,*,query_token: str | None = None,timeout_seconds: float = 5.0) -> str | None:
    """
    Resolve JWT for a WebSocket connection.
    Order: query param -> headers/cookies -> first auth message after optional auth_required prompt.
    """
    import asyncio
    import json
    token = extract_websocket_token(websocket)
    if token:
        return token
    await websocket.send_json({"type": "auth_required"})
    deadline = asyncio.get_running_loop().time() + timeout_seconds
    while asyncio.get_running_loop().time() < deadline:
        remaining = deadline - asyncio.get_running_loop().time()
        if remaining <= 0:
            break
        try:
            message = await asyncio.wait_for(websocket.receive(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        if message.get("type") == "websocket.disconnect":
            return None
        text = message.get("text")
        if not text:
            continue
        stripped = text.strip()
        if not stripped:
            continue

        if stripped.lower() == "ping":
            await websocket.send_text("pong")
            continue
        if stripped.lower().startswith("bearer "):
            return stripped[7:].strip()
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict):
            continue
        if data.get("type") == "ping":
            await websocket.send_json({"type": "pong"})
            continue
        if data.get("type") in ("auth", "authenticate", "authorization"):
            for key in ("token", "access_token", "accessToken"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
    return None


async def authenticate_websocket_connection(websocket: WebSocket,expected_user_id: str,query_token: str | None = None) -> bool:
    """
    Authenticate a WebSocket for notifications.
    JWT is strictly required (cookie, header, or post-connect auth message).
    """
    if not settings.websocket_require_token_effective:
        return True
    token = extract_websocket_token(websocket)
    if token:
        return await validate_websocket_token(token, expected_user_id)
    token = await resolve_websocket_token(websocket, query_token=query_token)
    if not token:
        return False
    return await validate_websocket_token(token, expected_user_id)


async def authenticate_websocket_user(websocket: WebSocket,expected_user_id: str,query_token: str | None = None) -> bool:
    """Backward-compatible alias."""
    return await authenticate_websocket_connection(websocket, expected_user_id, query_token)


def _normalize_role(role: str | None) -> str:
    return (role or "").strip().lower().replace("-", "_").replace(" ", "_")


def is_super_admin_role(role: str | None) -> bool:
    normalized = _normalize_role(role)
    return normalized in {"super_admin", "superadmin"}


def is_admin_or_super_admin(user) -> bool:
    if user is None:
        return False
    role = getattr(user, "role", None)
    if not role:
        return False
    return role == "Admin" or is_super_admin_role(role)


def require_admin(user, detail: str = "Admin access required") -> None:
    if not is_admin_or_super_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def require_csod_staff(user, detail: str = "Insufficient permissions for CSOD operations.") -> None:
    if user.role not in CSOD_STAFF_ROLES and not is_super_admin_role(user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_current_super_admin(current_user=Depends(get_current_regular_user)):
    if not is_super_admin_role(current_user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin access required")
    return current_user

