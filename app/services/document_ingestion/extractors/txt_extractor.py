from __future__ import annotations

import logging

logger = logging.getLogger("app.document_ingestion.txt")


def extract_txt(content: bytes, filename: str) -> tuple[str, list[str]]:
    """Read plain text with encoding detection via chardet."""
    warnings: list[str] = []
    if not content:
        raise ValueError(f"Text file is empty: {filename}")

    text, encoding = _decode_with_detection(content)
    if encoding and encoding.lower() not in {"utf-8", "utf-8-sig", "ascii"}:
        warnings.append(f"Detected encoding '{encoding}' (non-UTF-8)")

    if not text.strip():
        raise ValueError(f"Text file contains no readable content: {filename}")

    logger.info("TXT extraction complete: file=%s encoding=%s chars=%s", filename, encoding, len(text))
    return text, warnings


def _decode_with_detection(content: bytes) -> tuple[str, str | None]:
    # 1. Check for Byte Order Marks (BOM)
    if content.startswith(b"\xef\xbb\xbf"):
        try:
            return content.decode("utf-8-sig"), "utf-8-sig"
        except UnicodeDecodeError:
            pass
    elif content.startswith(b"\xff\xfe"):
        try:
            return content.decode("utf-16-le"), "utf-16-le"
        except UnicodeDecodeError:
            pass
    elif content.startswith(b"\xfe\xff"):
        try:
            return content.decode("utf-16-be"), "utf-16-be"
        except UnicodeDecodeError:
            pass

    # 2. Try clean UTF-8
    try:
        return content.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        pass

    # 3. Use chardet for fallback detection
    try:
        import chardet
        detected = chardet.detect(content)
        encoding = detected.get("encoding") or "utf-8"
        confidence = detected.get("confidence") or 0
        text = content.decode(encoding, errors="replace")
        if confidence < 0.7:
            return text, f"{encoding} (low confidence {confidence:.2f})"
        return text, encoding
    except ImportError:
        try:
            return content.decode("latin-1"), "latin-1"
        except Exception:
            return content.decode("utf-8", errors="replace"), "utf-8 (fallback)"
