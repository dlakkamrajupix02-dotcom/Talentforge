from __future__ import annotations
import sys
import re
from pathlib import Path
from typing import Optional
from loguru import logger

_configured = False

SENSITIVE_PATTERNS = [
    (re.compile(r"(?i)(bearer\s+)[a-zA-Z0-9\-_=\.\+/]+"), r"\1[REDACTED_JWT]"),
    (re.compile(r"(?i)(eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_\+\/=]+)"), r"[REDACTED_JWT]"),
    (re.compile(r"(?i)(client_secret\s*[=:]\s*['\"]?)[a-zA-Z0-9\-_\=\.\+/]+"), r"\1[REDACTED_SECRET]"),
    (re.compile(r"(?i)(api_key\s*[=:]\s*['\"]?)[a-zA-Z0-9\-_\=\.\+/]+"), r"\1[REDACTED_KEY]"),
    (re.compile(r"(?i)(password\s*[=:]\s*['\"]?)[a-zA-Z0-9\-_\=\.\+/]+"), r"\1[REDACTED_PASSWORD]"),
]

def redact_message(message: str) -> str:
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


def setup_logging(level: str = "INFO") -> None:
    global _configured
    if _configured:
        return

    logger.remove()

    log_dir = Path(__file__).resolve().parents[2] / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    # Loguru formatter functions with redaction
    def console_formatter(record):
        record["extra"]["redacted_message"] = redact_message(record["message"])
        return "<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{extra[redacted_message]}</level>\n"
    
    def file_formatter(record):
        record["extra"]["redacted_message"] = redact_message(record["message"])
        return "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {extra[redacted_message]}\n"

    logger.add(sys.stderr,format=console_formatter,level=level.upper(),colorize=True,enqueue=True)
    try:
        logger.add(str(log_dir / "app.log"),format=file_formatter,level=level.upper(),rotation="10 MB",retention="10 days",compression="zip",encoding="utf-8",enqueue=True)
    except (PermissionError, OSError) as e:
        logger.warning(f"Cannot write to {log_dir / 'app.log'}: {e}. File logging disabled on IIS.")
    
    # Suppress default Python traceback printing (prevents long stack traces in logs)
    def concise_excepthook(exc_type, exc_value, exc_traceback):
        logger.error(f"Unhandled {exc_type.__name__}: {redact_message(str(exc_value))}")
    
    sys.excepthook = concise_excepthook
    _configured = True


def get_logger(name: Optional[str] = None):
    """Simple logger getter - just bind name if provided, otherwise return base logger."""
    if name:
        return logger.bind(module=name)
    return logger


def log_exception_one_line(message: str, exc: Exception, **context: object) -> None:
    """
    Single-line error logging by default.

    - If LOG_TRACEBACKS=true, include traceback (useful for local debugging).
    - Otherwise, avoid multi-line stack traces in logs.
    """
    from app.core.config import settings

    def compact(value: object) -> str:
        return " ".join(str(value).split())

    ctx = " ".join(f"{k}={compact(v)}" for k, v in context.items() if v is not None)
    suffix = f" | {ctx}" if ctx else ""
    if settings.log_tracebacks:
        logger.opt(exception=exc).error(f"{message}: {compact(exc)}{suffix}")
    else:
        logger.error(f"{message}: {compact(exc)}{suffix}")
