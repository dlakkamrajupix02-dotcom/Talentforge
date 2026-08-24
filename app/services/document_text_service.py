from __future__ import annotations

from typing import Optional

from app.services.document_ingestion.pipeline import extract_document, get_supported_formats
from app.services.document_ingestion.sniffing import FormatDetectionError

# Backward-compatible alias used by saba routes.
UnsupportedDocumentFormatError = FormatDetectionError

SABA_JD_IMPORT_FORMATS = None  # deprecated; use get_supported_import_formats()


def get_supported_import_formats(*, pdf_only: bool = False) -> dict:
    return get_supported_formats(pdf_only=pdf_only)


def extract_text_from_document(
    content: bytes,
    filename: str = "upload",
    content_type: Optional[str] = None,
    *,
    pdf_only: bool = False,
) -> tuple[str, str]:
    """
    Extract plain text from a supported job-description document.

    Returns (text, detected_format_key).
    Raises FormatDetectionError or ValueError on failure.
    """
    del content_type  # format is determined by content sniffing, not MIME type
    result = extract_document(content, filename, pdf_only=pdf_only)
    if not result.success:
        error = result.report.error or f"Extraction failed for {filename}"
        if result.report.detected_format == "unknown":
            raise FormatDetectionError(error)
        raise ValueError(error)
    return result.text, result.detected_format
