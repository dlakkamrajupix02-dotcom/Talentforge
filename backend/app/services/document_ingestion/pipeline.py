from __future__ import annotations

import logging

from app.services.document_ingestion.extractors.html_extractor import extract_html
from app.services.document_ingestion.extractors.office_extractor import extract_office_document
from app.services.document_ingestion.extractors.pdf_extractor import extract_pdf
from app.services.document_ingestion.extractors.txt_extractor import extract_txt
from app.services.document_ingestion.models import ExtractionReport, NormalizedDocument
from app.services.document_ingestion.normalize import normalize_extracted_text, split_paragraphs
from app.services.document_ingestion.sniffing import (
    FormatDetectionError,
    SUPPORTED_EXTENSIONS,
    extension_mismatch_warning,
    normalize_extension,
    sniff_format,
    validate_extension_allowed,
)

logger = logging.getLogger("app.document_ingestion")

_FORMAT_LABELS = {
    "pdf": "PDF",
    "docx": "Word (DOCX)",
    "doc": "Word (DOC)",
    "html": "HTML",
    "txt": "Plain text",
    "rtf": "Rich Text",
}


def get_supported_formats(*, pdf_only: bool = False) -> dict:
    extensions = sorted({".pdf"} if pdf_only else SUPPORTED_EXTENSIONS)
    formats = []
    seen: set[str] = set()
    mapping = [
        ("pdf", [".pdf"]),
        ("docx", [".docx", ".word"]),
        ("doc", [".doc"]),
        ("html", [".html", ".htm"]),
        ("txt", [".txt", ".text"]),
        ("rtf", [".rtf"]),
    ]
    for key, exts in mapping:
        if pdf_only and key != "pdf":
            continue
        if key in seen:
            continue
        seen.add(key)
        formats.append({
            "key": key,
            "extensions": exts,
            "label": _FORMAT_LABELS.get(key, key),
        })
    return {"formats": formats, "extensions": extensions}


def extract_document(
    content: bytes,
    filename: str = "upload",
    *,
    pdf_only: bool = False,
) -> NormalizedDocument:
    """
    Deterministic document ingestion entry point.
    Detects format via content sniffing, extracts text, normalizes output.
    """
    declared_ext = normalize_extension(filename)
    warnings: list[str] = []

    try:
        validate_extension_allowed(filename, pdf_only=pdf_only)
        detected = sniff_format(content, filename)
    except FormatDetectionError as exc:
        report = ExtractionReport(
            filename=filename,
            declared_extension=declared_ext,
            detected_format="unknown",
            success=False,
            error=str(exc),
        )
        logger.error("Format detection failed: file=%s error=%s", filename, exc)
        return NormalizedDocument(text="", paragraphs=[], detected_format="unknown", report=report)

    mismatch = extension_mismatch_warning(declared_ext, detected)
    if mismatch:
        warnings.append(mismatch)
        logger.warning("Extension mismatch: file=%s %s", filename, mismatch)

    try:
        raw_text, extractor_warnings = _dispatch_extraction(content, filename, detected)
        warnings.extend(extractor_warnings)
    except Exception as exc:
        logger.error(
            "Extraction failed: file=%s format=%s error=%s",
            filename,
            detected,
            exc,
            exc_info=True,
        )
        report = ExtractionReport(
            filename=filename,
            declared_extension=declared_ext,
            detected_format=detected,
            success=False,
            warnings=warnings,
            error=str(exc),
        )
        return NormalizedDocument(text="", paragraphs=[], detected_format=detected, report=report)

    text = normalize_extracted_text(raw_text)
    paragraphs = split_paragraphs(text)

    if not text:
        error = f"No extractable text after normalization: {filename}"
        logger.error(error)
        report = ExtractionReport(
            filename=filename,
            declared_extension=declared_ext,
            detected_format=detected,
            success=False,
            warnings=warnings,
            error=error,
        )
        return NormalizedDocument(text="", paragraphs=[], detected_format=detected, report=report)

    report = ExtractionReport(
        filename=filename,
        declared_extension=declared_ext,
        detected_format=detected,
        success=True,
        character_count=len(text),
        paragraph_count=len(paragraphs),
        warnings=warnings,
    )
    logger.info(
        "Extraction success: file=%s format=%s chars=%s paragraphs=%s warnings=%s",
        filename,
        detected,
        report.character_count,
        report.paragraph_count,
        len(warnings),
    )
    return NormalizedDocument(
        text=text,
        paragraphs=paragraphs,
        detected_format=detected,
        report=report,
    )


def _dispatch_extraction(content: bytes, filename: str, fmt: str) -> tuple[str, list[str]]:
    if fmt == "pdf":
        return extract_pdf(content, filename)
    if fmt == "html":
        return extract_html(content, filename)
    if fmt == "txt":
        return extract_txt(content, filename)
    if fmt in {"docx", "doc", "rtf", "word"}:
        return extract_office_document(content, filename, fmt)
    raise FormatDetectionError(f"No extractor registered for format '{fmt}'")
