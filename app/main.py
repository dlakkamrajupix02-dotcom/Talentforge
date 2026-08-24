import sys
from pathlib import Path

# Ensure project root is in sys.path for cloud CLI runners
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_circuit_stats, init_db, close_db, health_check_db, get_db
from app.core.config import settings
from app.core.exceptions import ApplicationError,application_error_handler,http_exception_handler,unhandled_exception_handler,validation_exception_handler
from app.core.http_client import init_http_client, close_http_client
from app.core.rate_limiter import limiter
from app.routers.auth_routes import router as auth_router
from app.routers.Jd_routes import router as jd_router
from app.routers.template_routes import router as template_router
from app.routers.email_verification_routes import router as email_verification_router
from app.routers.session_routes import router as session_router
from app.routers.organization_routes import router as organizations_router
from app.routers.jd_assignment_routes import router as jd_assignment_router
from app.routers.jd_workflow_routes import router as jd_workflow_router
from app.routers.skill_taxonomy_routes import router as skill_taxonomy_router
from app.routers.extra_routes import router as extra_router
from app.routers.org_image_routes import router as org_image_router
from app.routers.csod_routes import router as csod_router
from app.routers.analytics_routes import router as analytics_router
from app.routers.foundation_pipeline import router as foundation_pipeline_router
from app.routers.bulk_pipeline import router as bulk_pipeline_router
from app.routers.candidate_user_routes import router as candidate_user_router
from app.routers.signoff_jd_routes import router as signoff_jd_router
from app.routers.notification_routes import router as notification_router
from app.routers.tc_routes import router as tc_router
from app.routers.application_routes import router as application_router
from app.routers.saba_routes import router as saba_router
from app.routers.super_admin_router import router as super_admin_router
from app.routers.super_admin_agent_router import router as super_admin_agent_router
from app.routers.feedback_routes import router as feedback_router
from app.routers.file_routes import router as file_router
from app.services.auth_service import validate_csrf
from app.services.dependencies import decode_token_payload, _validate_staff_session
from uuid import UUID
from app.services.redis_service import redis_service
from app.services.cache_service import cache_service
from app.core.logging import get_logger, setup_logging
import uuid
import json


logger = get_logger()


class RequestSizeLimitMiddleware:
    """Limit request body size to prevent DoS attacks."""
    def __init__(self, app, max_size: int = 10 * 1024 * 1024):  # 10MB default
        self.app = app
        self.max_size = max_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = 0
        for key, value in scope.get("headers", []):
            if key.lower() == b"content-length":
                try:
                    content_length = int(value)
                except ValueError:
                    pass
                break

        if content_length > self.max_size:
            response_body = f'{{"detail": "Request too large. Maximum size is {self.max_size // (1024*1024)}MB"}}'.encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(response_body)).encode("ascii")),
                ]
            })
            await send({
                "type": "http.response.body",
                "body": response_body,
            })
            return

        await self.app(scope, receive, send)


class RequestIDMiddleware:
    """Add unique request ID to each request for tracing."""
    def __init__(self, app):
        self.app = app
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = str(uuid.uuid4())
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("utf-8")))
                message["headers"] = headers
            await send(message)
        await self.app(scope, receive, send_wrapper)


_PATH_OVERRIDE_HEADERS = frozenset({
    b"x-original-url",
    b"x-rewrite-url",
    b"x-original-host",
})


class DisableTraceMethodMiddleware:
    """Reject HTTP TRACE and CONNECT methods (reflection / tunneling risks)."""
    _BLOCKED_METHODS = frozenset({b"TRACE", b"CONNECT"})
    
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            method = scope.get("method", "GET").upper().encode()
            if method in self._BLOCKED_METHODS:
                await send({"type": "http.response.start", "status": 405, "headers": []})
                await send({"type": "http.response.body", "body": b"Method Not Allowed"})
                return
        await self.app(scope, receive, send)


class RejectPathOverrideHeadersMiddleware:
    """Reject IIS/ARR path-override headers used to bypass route access controls."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            # Strip path override headers injected by IIS ARR to prevent downstream confusion,
            # but do not reject the request, as IIS ARR inherently uses them.
            headers = scope.get("headers", [])
            scope["headers"] = [
                (name, value) for name, value in headers
                if name.lower() not in _PATH_OVERRIDE_HEADERS
            ]
        await self.app(scope, receive, send)


class CSRFMiddleware:
    """Validate CSRF token on mutating requests that use cookie auth."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            try:
                validate_csrf(request)
            except HTTPException as exc:
                body = json.dumps({"detail": exc.detail}).encode("utf-8")
                await send({
                    "type": "http.response.start",
                    "status": exc.status_code,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(body)).encode("ascii")),
                    ],
                })
                await send({"type": "http.response.body", "body": body})
                return
        await self.app(scope, receive, send)


class SecurityHeadersMiddleware:
    """Inject baseline HTTP security headers on HTTP and WebSocket handshake responses."""
    _STRIP_RESPONSE_HEADERS = frozenset({b"x-powered-by"})

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] in ("http.response.start", "websocket.http.response.start"):
                headers = [
                    (key, val)
                    for key, val in message.get("headers", [])
                    if key.lower() not in self._STRIP_RESPONSE_HEADERS
                ]
                existing_headers = {h[0].lower() for h in headers}

                security_headers = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"permissions-policy", b"microphone=(), camera=()"),
                    (b"content-security-policy", b"default-src 'self'; "
                        b"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                        b"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                        b"img-src 'self' data: https://fastapi.tiangolo.com; "
                        b"connect-src 'self' *; "
                        b"frame-ancestors 'self'"),
                    (b"strict-transport-security", b"max-age=63072000; includeSubDomains; preload"),
                ]
                for key, val in security_headers:
                    if key not in existing_headers:
                        headers.append((key, val))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(level=settings.log_level)
    logger.info("Starting up — initializing database …")
    from pathlib import Path
    Path("static/uploads/organizations").mkdir(parents=True, exist_ok=True)
    Path("static/uploads/job_descriptions").mkdir(parents=True, exist_ok=True)
    try:
        await init_db()
        logger.info("Database initialized successfully")
        logger.info("Application ready for 1000 concurrent users")
    except Exception as exc:
        logger.error("Startup DB init failed: %s", exc)
        logger.warning("Application started but database may be unavailable")
    try:
        init_http_client()
    except Exception as exc:
        logger.error("HTTP client init failed: %s", exc)
    try:
        await redis_service.init()
    except Exception as exc:
        logger.error("Redis init failed: %s", exc)
    try:
        await cache_service.init()
    except Exception as exc:
        logger.error("Cache Redis init failed: %s", exc)
    yield
    logger.info("Shutting down — closing database connections…")
    try:
        await close_db()
        logger.info("Shutdown complete")
    except Exception as exc:
        logger.error("Error during shutdown: %s", exc)
    try:
        await close_http_client()
    except Exception as exc:
        logger.error("Error closing HTTP client: %s", exc)
    try:
        await redis_service.close()
    except Exception as exc:
        logger.error("Error closing Redis client: %s", exc)
    try:
        await cache_service.close()
    except Exception as exc:
        logger.error("Error closing cache client: %s", exc)

app = FastAPI(title="Talent Forge API's",version="1.0.0",description="Production-ready API",lifespan=lifespan,
    limit_concurrency=settings.max_concurrent_requests,
    timeout=settings.request_timeout_seconds,
    docs_url="/docs" if settings.enable_api_docs else None,
    redoc_url="/redoc" if settings.enable_api_docs else None,
    openapi_url="/openapi.json" if settings.enable_api_docs else None)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.cors_origins_list:
    _cors_origins = settings.cors_origins_list
    _cors_credentials = True
else:
    logger.warning("CORS_ORIGINS is empty — browser cross-origin requests will be denied (enforced in all environments)")
    _cors_origins = []
    _cors_credentials = False





app.add_middleware(CORSMiddleware,allow_origins=_cors_origins,allow_credentials=_cors_credentials,allow_methods=["*"],allow_headers=["*"])

# Add request size limit middleware
app.add_middleware(RequestSizeLimitMiddleware)

# Add request ID middleware for tracing
app.add_middleware(RequestIDMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(DisableTraceMethodMiddleware)
app.add_middleware(RejectPathOverrideHeadersMiddleware)

if settings.enforce_https_redirect:
    app.add_middleware(HTTPSRedirectMiddleware)

if settings.trusted_hosts_list:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)

# Exception handlers 
app.add_exception_handler(RequestValidationError, validation_exception_handler) # When this first error occured then the second handler will handle the exception.
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(ApplicationError, application_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


app.include_router(auth_router)
app.include_router(email_verification_router)
app.include_router(jd_router)
app.include_router(template_router)
app.include_router(session_router)
app.include_router(organizations_router)
app.include_router(jd_assignment_router)
app.include_router(jd_workflow_router)
app.include_router(extra_router)
app.include_router(skill_taxonomy_router)
app.include_router(org_image_router)
app.include_router(analytics_router)

app.include_router(csod_router)
app.include_router(foundation_pipeline_router)
app.include_router(bulk_pipeline_router)
app.include_router(candidate_user_router)
app.include_router(application_router)
app.include_router(signoff_jd_router, prefix="/api")
app.include_router(notification_router)
app.include_router(tc_router)
app.include_router(saba_router)
app.include_router(super_admin_router)
app.include_router(super_admin_agent_router)
app.include_router(feedback_router)
app.include_router(file_router)
# app.include_router(chat_router, prefix="/chat")

from fastapi.responses import FileResponse
import os

# Custom static file endpoint — requires valid JWT + active session
@app.get("/static/{filepath:path}", include_in_schema=False)
async def get_static_file(filepath: str, request: Request, db: AsyncSession = Depends(get_db)):
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required to view files")

    payload = decode_token_payload(token)
    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if session_id:
        await _validate_staff_session(
            db,
            token_credentials=token,
            user_id=str(user_id),
            session_id=str(session_id),
        )

    try:
        user_uuid = UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    from app.repository import user_repository as user_repo
    from app.repository import candidate_user_repository as candidate_repo
    user = await user_repo.get_user_by_id(db, user_uuid)
    if user is None and not session_id:
        candidate = await candidate_repo.get_candidate_user_by_id(db, user_uuid)
        if candidate is None:
            raise HTTPException(status_code=401, detail="User not found")
    elif user is None:
        raise HTTPException(status_code=401, detail="User not found")

    base_dir = os.path.abspath("static")
    target_path = os.path.abspath(os.path.join(base_dir, filepath))
    if not target_path.startswith(base_dir) or not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail="File not found")

    normalized_rel = os.path.relpath(target_path, base_dir).replace("\\", "/")
    if normalized_rel.startswith("../") or ".." in normalized_rel:
        raise HTTPException(status_code=403, detail="Forbidden path")

    return FileResponse(target_path)

@app.get("/")
async def root():
    return {"message": "Talent Forge backend running successfully..."}


@app.get("/health")
async def health_check():
    """
    Comprehensive health check for load balancers and monitoring.
    Returns 503 if database is not available (for readiness probes).
    """
    try:
        # Check database connectivity
        db_ok = await health_check_db()
        
        # Check Redis connectivity
        redis_ok = redis_service.is_available()
        cache_ok = cache_service.is_available()
        
        # Get database circuit stats
        db_circuit = get_db_circuit_stats()
        
        from datetime import datetime, timezone
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "checks": {
                "database": db_ok,
                "redis": redis_ok,
                "cache": cache_ok,
                "db_circuit": db_circuit
            }
        }
        
        # Return 503 if database is not available (readiness check)
        if not db_ok:
            return JSONResponse(status_code=503,content={**health_data,"status": "unhealthy"})
        return health_data
        
    except Exception:
        from datetime import datetime, timezone
        return JSONResponse(status_code=503,
            content={
                "status": "error",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "1.0.0",
                "error": "health_check_failed"
            }
        )
