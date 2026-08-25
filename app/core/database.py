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
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class DBCircuitBreaker:
    def __init__(self,enabled: bool = True,failure_threshold: int = 25, reset_timeout: int = 30,success_threshold: int = 2):
        self.enabled = enabled
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.success_threshold = success_threshold
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

        return False

    def _should_attempt(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.reset_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info(f"DB circuit HALF_OPEN — testing recovery with probe query")
                return True
            return False
        if self.state == CircuitState.HALF_OPEN:
            return True
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

connect_args: dict[str, Any] = {
    "command_timeout": 60,
    "server_settings": {
        "application_name": "talentforge_backend",
        "jit": "off",
    }
}

# Automatically enable SSL for cloud-hosted databases (Neon, AWS RDS, Supabase, etc.)
if "sslmode=require" in settings.database_url or "ssl=require" in settings.database_url or "neon.tech" in settings.database_url:
    connect_args["ssl"] = "require"

async_engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    echo=False,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)

RETRYABLE_DB_EXCEPTIONS = (OperationalError, InterfaceError, SATimeoutError, OSError)

db_circuit = DBCircuitBreaker(
    enabled=settings.db_circuit_enabled,
    failure_threshold=settings.db_circuit_failure_threshold,
    reset_timeout=settings.db_circuit_reset_seconds,
    success_threshold=settings.db_circuit_success_threshold
)


@asynccontextmanager
async def get_db_with_retry():
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
        raise
    except Exception as exc:
        if session:
            await session.rollback()
        logger.warning(f"Non-retryable DB error: {exc}")
        raise
    finally:
        if session:
            await session.close()


async def get_db():
    async with get_db_with_retry() as session:
        yield session


async def health_check_db() -> tuple[bool, str]:
    if db_circuit.is_open():
        return False, "Circuit breaker OPEN"
    try:
        async with get_db_with_retry() as session:
            result = await session.execute(select(1))
            scalar = result.scalar()
            if scalar == 1:
                return True, "healthy"
            return False, f"unexpected response: {scalar}"
    except Exception as exc:
        return False, f"connection failed: {str(exc)}"


def get_db_circuit_stats() -> dict[str, Any]:
    return db_circuit.get_stats()


async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    await async_engine.dispose()
