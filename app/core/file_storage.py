from __future__ import annotations
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
import aiofiles


ALLOWED_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_IMAGE_BYTES = 2 * 1024 * 1024
MIN_IMAGE_BYTES = 10
# Security: Store sensitive files in private directory (not publicly accessible)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_ROOT = _PROJECT_ROOT / "private" / "uploads"
STATIC_UPLOADS_ROOT = _PROJECT_ROOT / "static" / "uploads"

def _mime_from_bytes(image_bytes: bytes) -> str | None:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None

def _safe_ext(filename: Optional[str], detected_mime: Optional[str]) -> str:
    name = (filename or "").lower()
    if name.endswith(".png") or detected_mime == "image/png":
        return ".png"
    return ".jpg"


async def save_image_to_disk(*, image: UploadFile | None, kind: str) -> str | None:
    """Validate and save an uploaded image to disk. Returns relative URL path or None."""
    if image is None:
        return None
    if image.content_type and image.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValueError("Unsupported image type")
    image_bytes = await image.read()
    if not image_bytes:
        return None
    if len(image_bytes) < MIN_IMAGE_BYTES:
        raise ValueError("File too small to be a valid image")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image size must be less than 2MB")
    detected_mime = _mime_from_bytes(image_bytes)
    if not detected_mime:
        raise ValueError("Invalid file format - magic number verification failed")
    if image.content_type and image.content_type != detected_mime:
        if not (image.content_type == "image/jpg" and detected_mime == "image/jpeg"):
            raise ValueError(f"Content-Type mismatch: declared {image.content_type}, detected {detected_mime}")

    ext = _safe_ext(image.filename, detected_mime)
    dest_dir = UPLOADS_ROOT / kind
    dest_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    async with aiofiles.open(dest_dir / filename, 'wb') as f:
        await f.write(image_bytes)

    # Security: Return path relative to private uploads (served via authenticated endpoint)
    return f"/private/uploads/{kind}/{filename}"


def resolve_upload_file_path(image_url: str) -> Path:
    """Resolve a stored image URL to an absolute on-disk path."""
    if not image_url:
        raise ValueError("Missing image URL")
    if image_url.startswith("/static/uploads/"):
        root = STATIC_UPLOADS_ROOT
        relative_path = image_url[len("/static/uploads/"):]
    elif image_url.startswith("/private/uploads/"):
        root = UPLOADS_ROOT
        relative_path = image_url[len("/private/uploads/"):]
    else:
        raise ValueError(f"Unsupported image URL: {image_url}")

    path = (root / relative_path).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("Invalid image path")
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Image file not found: {image_url}")
    return path


def resolve_image_path_for_export(image_url: str | None) -> Path | None:
    """Resolve a stored image URL for PDF/Word export. Returns None if not found locally."""
    if not image_url:
        return None
    try:
        return resolve_upload_file_path(image_url)
    except (ValueError, FileNotFoundError):
        return None


def media_type_for_path(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".png":
        return "image/png"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    return "application/octet-stream"


def delete_image_from_disk(image_url: str | None) -> None:
    """Delete an image file previously saved by save_image_to_disk. Silently ignores errors."""
    if not image_url:
        return
    # Handle both old static paths and new private paths
    if not (image_url.startswith("/static/uploads/") or image_url.startswith("/private/uploads/")):
        return
    try:
        if image_url.startswith("/static/uploads/"):
            relative_path = image_url[len("/static/uploads/"):]
            path = STATIC_UPLOADS_ROOT / relative_path
        else:
            relative_path = image_url[len("/private/uploads/"):]
            path = UPLOADS_ROOT / relative_path

        root = STATIC_UPLOADS_ROOT if image_url.startswith("/static/uploads/") else UPLOADS_ROOT
        if not path.resolve().is_relative_to(root.resolve()):
            return
        if path.exists():
            path.unlink()
    except Exception:
        pass


async def get_image_base64_from_disk(image_url: str | None) -> str | None:
    """Read an image file from disk and return its base64 encoded string."""
    if not image_url:
        return None
    if not (image_url.startswith("/static/uploads/") or image_url.startswith("/private/uploads/")):
        return None
    try:
        if image_url.startswith("/static/uploads/"):
            relative_path = image_url[len("/static/uploads/"):]
            root = STATIC_UPLOADS_ROOT
        else:
            relative_path = image_url[len("/private/uploads/"):]
            root = UPLOADS_ROOT
        path = root / relative_path
        if not path.resolve().is_relative_to(root.resolve()):
            return None
        if path.exists():
            import base64
            async with aiofiles.open(path, "rb") as f:
                file_data = await f.read()
                return base64.b64encode(file_data).decode("utf-8")
    except Exception:
        pass
    return None
