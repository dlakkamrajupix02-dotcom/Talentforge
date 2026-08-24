from __future__ import annotations
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.logging import get_logger, log_exception_one_line

logger = get_logger(__name__)

class ApplicationError(Exception):
    """For application errors with an HTTP status and client-safe message."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)

class AppValidationError(ApplicationError):
    """422 validation-style errors (name avoids clashing with pydantic.ValidationError)."""

    def __init__(self, detail: str = "Validation failed") -> None:
        super().__init__(422, detail)

class NotFoundError(ApplicationError):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(404, detail)

class ConflictError(ApplicationError):
    def __init__(self, detail: str = "Resource already exists") -> None:
        super().__init__(409, detail)

class UnauthorizedError(ApplicationError):
    def __init__(self, detail: str = "Not authenticated") -> None:
        super().__init__(401, detail)

class ForbiddenError(ApplicationError):
    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(403, detail)

class BadRequestError(ApplicationError):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(400, detail)

class PasswordValidationError(Exception):
    """Raised when password validation fails."""
    pass

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic / FastAPI request-validation errors (422).
    """
    errors = [
        {
            "field": ".".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
        }
        for err in exc.errors()
    ]
    summary = "; ".join(f"{e['field']}: {e['message']}" for e in errors)
    logger.warning(f"Validation error on {request.method} {request.url.path}: {summary}")
    return JSONResponse(status_code=422, content={"detail": errors})

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle FastAPI / Starlette HTTPException.
    4xx → WARNING (client mistake, no traceback).
    5xx → ERROR  (unexpected, add context).
    """
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    elif exc.status_code in (401, 403, 404) or any(x in request.url.path for x in ("favicon.ico", "com.chrome.devtools.json")):
        logger.info(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    else:
        logger.warning(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code,content={"detail": exc.detail})

async def application_error_handler(request: Request, exc: ApplicationError) -> JSONResponse:
    """
    Handle service-layer ApplicationError — maps to JSON without exposing internals.
    """
    logger.warning(f"Application error {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler — client always gets clean JSON, never a raw traceback.
    """
    log_exception_one_line("Unhandled exception",exc,method=request.method,path=request.url.path)
    return JSONResponse(status_code=500,content={"detail": "An unexpected internal error occurred. Please try again later."})
