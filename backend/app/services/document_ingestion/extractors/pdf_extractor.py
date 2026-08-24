from __future__ import annotations

import io
import logging

from app.services.document_ingestion.models import ExtractionReport

logger = logging.getLogger("app.document_ingestion.pdf")

# Minimum average characters per page for a text-based PDF.
_MIN_CHARS_PER_PAGE = 20
# If less than this fraction of pages have extractable text, treat as scanned.
_MIN_TEXT_PAGE_RATIO = 0.5


def extract_pdf(content: bytes, filename: str) -> tuple[str, list[str]]:
    """
    Extract text from a PDF using pdfplumber (primary) with pypdf fallback.
    Raises ValueError for empty, corrupt, or scanned/image-only PDFs.
    """
    warnings: list[str] = []
    text, page_stats = _extract_with_pdfplumber(content)
    if not text.strip():
        text, page_stats = _extract_with_pypdf(content)
        if text.strip():
            warnings.append("pdfplumber returned no text; used pypdf fallback")

    if not text.strip():
        raise ValueError(f"No extractable text found in PDF: {filename}")

    total_pages = page_stats.get("total_pages", 0)
    text_pages = page_stats.get("text_pages", 0)
    if total_pages > 0:
        ratio = text_pages / total_pages
        avg_chars = len(text.strip()) / total_pages
        if ratio < _MIN_TEXT_PAGE_RATIO:
            raise ValueError(
                f"PDF '{filename}' appears to be scanned/image-based "
                f"({text_pages}/{total_pages} pages had text). "
                "OCR (e.g. Tesseract) is required — not supported in this pipeline."
            )
        if avg_chars < _MIN_CHARS_PER_PAGE:
            warnings.append(
                f"Low text density ({avg_chars:.0f} chars/page); verify extraction quality"
            )

    logger.info(
        "PDF extraction complete: file=%s pages=%s text_pages=%s chars=%s",
        filename,
        total_pages,
        text_pages,
        len(text.strip()),
    )
    return text, warnings


def _extract_with_pdfplumber(content: bytes) -> tuple[str, dict]:
    try:
        import pdfplumber
    except ImportError as exc:
        logger.warning("pdfplumber not installed: %s", exc)
        return "", {"total_pages": 0, "text_pages": 0}

    parts: list[str] = []
    text_pages = 0
    total_pages = 0
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            total_pages = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
                if page_text.strip():
                    text_pages += 1
                    parts.append(page_text.strip())
    except Exception as exc:
        logger.error("pdfplumber failed for PDF extraction: %s", exc, exc_info=True)
        raise ValueError(f"Failed to read PDF: {exc}") from exc

    return "\n\n".join(parts), {"total_pages": total_pages, "text_pages": text_pages}


def _extract_with_pypdf(content: bytes) -> tuple[str, dict]:
    try:
        import pypdf
    except ImportError as exc:
        raise ValueError("No PDF reading library available (pdfplumber or pypdf required)") from exc

    parts: list[str] = []
    text_pages = 0
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        total_pages = len(reader.pages)
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_pages += 1
                parts.append(page_text.strip())
    except Exception as exc:
        logger.error("pypdf failed for PDF extraction: %s", exc, exc_info=True)
        raise ValueError(f"Failed to read PDF: {exc}") from exc

    return "\n\n".join(parts), {"total_pages": total_pages, "text_pages": text_pages}
