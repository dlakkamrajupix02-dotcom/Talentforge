from __future__ import annotations
import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


def _derive_fernet_key() -> bytes:
    """
    Returns a urlsafe-base64 32-byte key for Fernet.

    Production should set CSOD_ENCRYPTION_KEY explicitly (REQUIRE_CSOD_ENCRYPTION_KEY=true).
    Development may derive from SECRET_KEY when CSOD_ENCRYPTION_KEY is unset.
    """
    if settings.csod_encryption_key:
        return settings.csod_encryption_key.encode("utf-8")

    if settings.require_csod_encryption_key or settings.is_production:
        raise RuntimeError("CSOD_ENCRYPTION_KEY must be set when APP_ENV=production or REQUIRE_CSOD_ENCRYPTION_KEY=true.")

    digest = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


_FERNET = Fernet(_derive_fernet_key())


def encrypt_str(value: str) -> str:
    return _FERNET.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_str(token: str) -> str:
    try:
        return _FERNET.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt stored CSOD credential.") from exc
