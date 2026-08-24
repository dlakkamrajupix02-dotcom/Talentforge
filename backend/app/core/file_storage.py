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
UPLOADS_ROOT = Path("private/uploads")

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

def delete_image_from_disk(image_url: str | None) -> None:
    """Delete an image file previously saved by save_image_to_disk. Silently ignores errors."""
    if not image_url:
        return
    # Handle both old static paths and new private paths
    if not (image_url.startswith("/static/uploads/") or image_url.startswith("/private/uploads/")):
        return
    try:
        # Extract the path after /static/ or /private/
        if image_url.startswith("/static/uploads/"):
            relative_path = image_url[len("/static/uploads/"):]
        else:
            relative_path = image_url[len("/private/uploads/"):]
        
        path = UPLOADS_ROOT / relative_path
        # Guard against path traversal — ensure the resolved path is within uploads root
        if not path.resolve().is_relative_to(UPLOADS_ROOT.resolve()):
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
        else:
            relative_path = image_url[len("/private/uploads/"):]
        path = UPLOADS_ROOT / relative_path
        if not path.resolve().is_relative_to(UPLOADS_ROOT.resolve()):
            return None
        if path.exists():
            import base64
            async with aiofiles.open(path, "rb") as f:
                file_data = await f.read()
                return base64.b64encode(file_data).decode("utf-8")
    except Exception:
        pass
    return None
