from __future__ import annotations

import re
from pathlib import PurePath

SUPPORTED_EXTENSIONS = frozenset({
    ".doc", ".docx", ".htm", ".html", ".pdf", ".rtf", ".text", ".txt", ".word",
})

EXTENSION_ALIASES = {
    ".word": "docx",
    ".text": "txt",
    ".htm": "html",
    ".html": "html",
    ".docx": "docx",
    ".doc": "doc",
    ".pdf": "pdf",
    ".rtf": "rtf",
    ".txt": "txt",
}


class FormatDetectionError(ValueError):
    """Raised when file content cannot be mapped to a supported format."""


def normalize_extension(filename: str) -> str:
    return PurePath(filename or "upload").suffix.lower()


def sniff_format(content: bytes, filename: str = "upload") -> str:
    """
    Detect the real document format from magic bytes.
    Extension is used only when magic bytes are inconclusive.
    """
    if not content:
        raise FormatDetectionError("File is empty")

    ext = normalize_extension(filename)
    head = content[:512]
    sniff = head.lstrip().lower()

    if content.startswith(b"%PDF"):
        return "pdf"
    if content.startswith(b"PK"):
        return "docx"
    if content.startswith(b"{\\rtf") or content.startswith(b"{\\RTF"):
        return "rtf"
    if sniff.startswith(b"<!doctype") or b"<html" in sniff or b"<body" in sniff:
        return "html"
    if content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "doc"
    if ext in EXTENSION_ALIASES:
        return EXTENSION_ALIASES[ext]

    if _looks_like_plain_text(content):
        return "txt"

    raise FormatDetectionError(
        f"Unsupported or unrecognized file type for '{filename}'. "
        f"Supported extensions: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )


def validate_extension_allowed(filename: str, *, pdf_only: bool = False) -> str:
    ext = normalize_extension(filename)
    allowed = frozenset({".pdf"}) if pdf_only else SUPPORTED_EXTENSIONS
    if ext and ext not in allowed:
        raise FormatDetectionError(
            f"File '{filename}' has unsupported extension '{ext}'. "
            f"Allowed extensions: {', '.join(sorted(allowed))}"
        )
    return ext


def extension_mismatch_warning(declared_ext: str, detected_format: str) -> str | None:
    if not declared_ext:
        return None
    expected = EXTENSION_ALIASES.get(declared_ext)
    if expected and expected != detected_format:
        return (
            f"Extension '{declared_ext}' does not match detected format '{detected_format}' "
            f"(content sniffing used)."
        )
    return None


def _looks_like_plain_text(content: bytes) -> bool:
    if b"\x00" in content[:4096]:
        return False
    sample = content[:4096]
    if not sample:
        return False
    printable = sum(1 for b in sample if b in (9, 10, 13) or 32 <= b <= 126)
    return printable / len(sample) >= 0.85
