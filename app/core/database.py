from __future__ import annotations
import logging
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import Any
from sqlalchemy import select
from sqlalchemy.exc import DataError, DisconnectionError, IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.exc import TimeoutError as SATimeoutError
from sqlalchemy.exc import InterfaceError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from tenacity import before_sleep_log,retry,retry_if_exception_type,stop_after_attempt,wait_exponential
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from app.core.config import settings
from app.core.exceptions import ApplicationError
from app.core.logging import get_logger, log_exception_one_line
from app.models.models import Base

logger = get_logger()

# Exceptions that are expected user-input mistakes — should never be logged
# as DB errors or trigger the circuit breaker.
_EXPECTED_REQUEST_ERRORS: tuple[type[BaseException], ...] = (RequestValidationError, HTTPException, ApplicationError)

_USER_CAUSED_OP_KEYWORDS = (
    "deadlock",
    "lock timeout",
    "statement timeout",
    "permission denied",
    "canceling statement due to",
    "division by zero",
    "value too long",
    "invalid input syntax",
)


class CircuitState(str, Enum):
    CLOSED = "closed"  # Normal-> Requests allowed
    OPEN = "open"      # Failure-> Requests blocked, waiting for reset_timeout
    HALF_OPEN = "half_open" # Probing-> Allow limited requests to test if DB has recovered


class DBCircuitBreaker:
    def __init__(self,enabled: bool = True,failure_threshold: int = 25, reset_timeout: int = 30,success_threshold: int = 2):
        self.enabled = enabled
        self.failure_threshold = failure_threshold  # 25 infra failures → open circuit.
        self.reset_timeout = reset_timeout          # 30s after opening, allow a probe request to test recovery.
        self.success_threshold = success_threshold  # 2 consecutive successes in HALF_OPEN → close circuit again.
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.success_count = 0
        self.last_failure_time = 0.0

    def _is_infrastructure_error(self, exc: BaseException) -> bool:
        if isinstance(exc, (IntegrityError, DataError, ProgrammingError)):
            logger.debug(f"DB circuit: ignoring user/schema error {type(exc).__name__}")
            return False

        if isinstance(exc, OperationalError):
            msg = str(exc).lower()
            if any(kw in msg for kw in _USER_CAUSED_OP_KEYWORDS):
                logger.debug(f"DB circuit: ignoring operational error: {msg[:120]}")
                return False
            return True

        if isinstance(exc, (DisconnectionError, SATimeoutError, OSError)):
            return True

        try:
            import asyncpg

            if isinstance(exc, (asyncpg.PostgresConnectionError,asyncpg.TooManyConnectionsError,asyncpg.CannotConnectNowError)):
                return True
        except ImportError:
            pass

        logger.debug(f"DB circuit: {type(exc).__name__} not treated as infra failure")
        return False

    def _should_attempt(self) -> bool:
        if not self.enabled:
            return True
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            elapsed = time.time() - self.last_failure_time
            if elapsed >= self.reset_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info(f"DB circuit HALF_OPEN after {elapsed:.1f}s — probe allowed")
                return True
            return False
        return True

    def record_success(self) -> None:
        if not self.enabled:
            return
        self.consecutive_failures = 0
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
                logger.info("DB circuit CLOSED — database recovered")

    def record_failure(self, exc: BaseException) -> None:
        if not self.enabled:
            return
        if not self._is_infrastructure_error(exc):
            return
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
            logger.warning(f"DB circuit OPEN again after failed probe; retry in {self.reset_timeout}s")
        elif self.consecutive_failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"DB circuit OPEN after {self.consecutive_failures} consecutive infra failures")
        else:
            logger.warning(f"DB infra error {self.consecutive_failures}/{self.failure_threshold}: {type(exc).__name__}")

    def is_open(self) -> bool:
        if not self.enabled:
            return False
        return not self._should_attempt()

    def get_stats(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "state": self.state.value,
            "consecutive_failures": self.consecutive_failures,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time,
            "failure_threshold": self.failure_threshold,
            "reset_timeout": self.reset_timeout,
        }

raw_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
DATABASE_URL = raw_url.split("?")[0]

async_engine = create_async_engine(DATABASE_URL,pool_size=20,max_overflow=30,pool_timeout=30,pool_recycle=3600,
    pool_pre_ping=True,echo=False,future=True,
    connect_args={
        "command_timeout": 60,
        "server_settings": {
            "application_name": "talentforge_backend",
            "jit": "off",
        }})

AsyncSessionLocal = async_sessionmaker(bind=async_engine,class_=AsyncSession,expire_on_commit=False,autoflush=False)

RETRYABLE_DB_EXCEPTIONS = (OperationalError, InterfaceError, SATimeoutError, OSError)

db_circuit = DBCircuitBreaker(enabled=settings.db_circuit_enabled,failure_threshold=settings.db_circuit_failure_threshold,
    reset_timeout=settings.db_circuit_reset_seconds,success_threshold=settings.db_circuit_success_threshold)


@asynccontextmanager
async def get_db_with_retry():
    """
    Acquire a session from AsyncSessionLocal .
    Refuses new work when the circuit is open.
    """
    if db_circuit.is_open():
        raise RuntimeError("Database temporarily unavailable (circuit open). Retry shortly.")

    session: AsyncSession | None = None
    try:
        session = AsyncSessionLocal()
        yield session
        db_circuit.record_success()
    except RETRYABLE_DB_EXCEPTIONS as exc:
        if session:
            await session.rollback()
        logger.warning(f"Transient DB error, session rolled back: {exc}")
        db_circuit.record_failure(exc)
        raise
    except _EXPECTED_REQUEST_ERRORS:
        # Validation / HTTP errors are expected user-input mistakes, not DB failures.
        # Roll back silently and re-raise so the exception handlers in main.py can
        # format a clean response — no traceback, no circuit-breaker hit.
        if session:
            await session.rollback()
        raise
    except Exception as exc:
        if session:
            await session.rollback()
        log_exception_one_line("Database operation failed", exc)
        db_circuit.record_failure(exc)
        raise
    finally:
        if session:
            await session.close()


async def get_db():
    """FastAPI dependency — one session per request from ``AsyncSessionLocal``."""
    async with get_db_with_retry() as session:
        yield session

@retry(stop=stop_after_attempt(settings.db_max_retries),wait=wait_exponential(multiplier=settings.db_retry_delay,
        max=settings.db_retry_max_delay,),retry=retry_if_exception_type(RETRYABLE_DB_EXCEPTIONS),
    before_sleep=before_sleep_log(logger, logging.WARNING),reraise=True)
async def init_db():
    """DDL via engine.begin(); ensures via ``AsyncSessionLocal`` (same as ``get_db``)."""
    if not settings.enable_db_create_all:
        logger.info("Skipping Base.metadata.create_all (ENABLE_DB_CREATE_ALL=false)")
        return
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    except RETRYABLE_DB_EXCEPTIONS:
        logger.warning("Transient DB error during init — retrying…")
        raise
    except Exception as e:
        log_exception_one_line("Database initialization failed (non-retryable)", e)
        raise  

async def close_db():
    try:
        await async_engine.dispose()
        logger.info("Database connection pool closed")
    except Exception as e:
        logger.error(f"Error closing database connection pool: {e}")

async def health_check_db() -> bool:
    """Probe DB using ``AsyncSessionLocal`` — same factory as ``get_db``, same pool."""
    if db_circuit.is_open():
        logger.warning("DB health check skipped — DB circuit is open")
        return False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(select(1))
        return True
    except Exception as e:
        logger.warning(f"DB health check failed: {e}")
        return False

def get_db_circuit_stats() -> dict[str, Any]:
    return db_circuit.get_stats()
