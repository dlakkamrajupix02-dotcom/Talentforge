"""
Deterministic document ingestion tests for Saba JD import pipeline.
No AI/LLM involved in these tests — extraction only.
"""
from __future__ import annotations

import io
import zipfile

import pytest

from app.services.document_ingestion.pipeline import extract_document
from app.services.document_ingestion.sniffing import FormatDetectionError, sniff_format
from app.services.document_ingestion.extractors.office_extractor import (
    extract_doc,
    extract_docx,
    extract_rtf,
)
from app.services.document_ingestion.extractors.html_extractor import extract_html
from app.services.document_ingestion.extractors.txt_extractor import extract_txt


# ---------------------------------------------------------------------------
# Fixtures — programmatic sample files
# ---------------------------------------------------------------------------

SAMPLE_HTML = b"""<!DOCTYPE html>
<html><head><title>JD</title><style>.x{}</style><script>ignore();</script></head>
<body>
<h1>Senior Software Engineer</h1>
<p>Department: Engineering</p>
<ul><li>Design systems</li><li>Lead reviews</li></ul>
<table><tr><th>Skill</th><th>Level</th></tr><tr><td>Python</td><td>Expert</td></tr></table>
</body></html>"""

SAMPLE_RTF = b"{\\rtf1\\ansi Senior Engineer\\par Department: IT\\par}"


def _make_docx_bytes(paragraphs: list[str]) -> bytes:
    from docx import Document

    doc = Document()
    for para in paragraphs:
        doc.add_paragraph(para)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


SAMPLE_DOCX = _make_docx_bytes([
    "Job Title: Data Analyst",
    "Department: Analytics",
    "Core Competencies",
    "SQL proficiency",
    "Statistical modeling",
])

SAMPLE_TXT = "Job Title: Product Manager\nDepartment: Product\n\nResponsibilities:\n- Roadmap planning".encode("utf-8")
SAMPLE_TXT_LATIN1 = "Job Title: Analyseur\nDépartement: Opérations".encode("latin-1")


def _make_minimal_pdf_with_text(text: str) -> bytes:
    """Build a minimal valid PDF with embedded text using reportlab if available."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except ImportError:
        pytest.skip("reportlab required to generate test PDF")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.drawString(72, 720, text)
    c.drawString(72, 700, "Department: Finance")
    c.showPage()
    c.save()
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Format sniffing
# ---------------------------------------------------------------------------

class TestFormatSniffing:
    def test_sniff_docx_from_pk_header(self):
        assert sniff_format(SAMPLE_DOCX, "mislabeled.doc") == "docx"

    def test_sniff_html(self):
        assert sniff_format(SAMPLE_HTML, "job.htm") == "html"

    def test_sniff_rtf(self):
        assert sniff_format(SAMPLE_RTF, "job.rtf") == "rtf"

    def test_sniff_txt(self):
        assert sniff_format(SAMPLE_TXT, "job.txt") == "txt"

    def test_empty_file_raises(self):
        with pytest.raises(FormatDetectionError, match="empty"):
            sniff_format(b"", "empty.pdf")

    def test_unknown_binary_raises(self):
        with pytest.raises(FormatDetectionError):
            sniff_format(b"\x00\x01\x02\x03\xff", "unknown.xyz")


# ---------------------------------------------------------------------------
# HTML extractor
# ---------------------------------------------------------------------------

class TestHtmlExtractor:
    def test_extracts_headings_lists_tables(self):
        text, warnings = extract_html(SAMPLE_HTML, "job.html")
        assert "Senior Software Engineer" in text
        assert "Department: Engineering" in text
        assert "Design systems" in text
        assert "Python" in text
        assert "ignore()" not in text

    def test_empty_html_raises(self):
        with pytest.raises(ValueError, match="empty"):
            extract_html(b"  ", "empty.html")


# ---------------------------------------------------------------------------
# TXT extractor
# ---------------------------------------------------------------------------

class TestTxtExtractor:
    def test_utf8(self):
        text, _ = extract_txt(SAMPLE_TXT, "job.txt")
        assert "Product Manager" in text
        assert "Roadmap planning" in text

    def test_latin1_encoding(self):
        text, warnings = extract_txt(SAMPLE_TXT_LATIN1, "job.txt")
        assert "Analyseur" in text
        assert any("encoding" in w.lower() for w in warnings)


# ---------------------------------------------------------------------------
# Office extractors
# ---------------------------------------------------------------------------

class TestOfficeExtractor:
    def test_docx_paragraphs(self):
        text, _ = extract_docx(SAMPLE_DOCX, "job.docx")
        assert "Data Analyst" in text
        assert "SQL proficiency" in text

    def test_docx_word_extension(self):
        result = extract_document(SAMPLE_DOCX, "job.word")
        assert result.success
        assert result.detected_format == "docx"
        assert "Data Analyst" in result.text

    def test_rtf_extraction(self):
        text, _ = extract_rtf(SAMPLE_RTF, "job.rtf")
        assert "Senior Engineer" in text
        assert "Department" in text

    def test_mislabeled_doc_as_docx(self):
        text, warnings = extract_doc(SAMPLE_DOCX, "job.doc")
        assert "Data Analyst" in text
        assert any("OOXML" in w for w in warnings)

    def test_corrupt_docx_raises(self):
        with pytest.raises(ValueError, match="Corrupt|invalid|Failed"):
            extract_docx(b"not a zip file", "bad.docx")

    def test_legacy_doc_insufficient_raises(self):
        with pytest.raises(ValueError, match="Unable to extract|insufficient"):
            extract_doc(b"\xd0\xcf\x11\xe0" + b"\x00" * 100, "tiny.doc")


# ---------------------------------------------------------------------------
# PDF extractor
# ---------------------------------------------------------------------------

class TestPdfExtractor:
    def test_text_pdf_extraction(self):
        pdf_bytes = _make_minimal_pdf_with_text("Registered Nurse")
        result = extract_document(pdf_bytes, "nurse.pdf")
        assert result.success
        assert "Registered Nurse" in result.text
        assert result.report.character_count > 0

    def test_scanned_pdf_raises(self):
        """PDF with no text layers should fail loudly."""
        # Minimal PDF with no text operators
        minimal = (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj "
            b"xref\n0 4\n0000000000 65535 f \n"
            b"trailer<</Root 1 0 R/Size 4>>\nstartxref\n0\n%%EOF"
        )
        result = extract_document(minimal, "scanned.pdf")
        assert not result.success
        assert result.report.error


# ---------------------------------------------------------------------------
# Pipeline integration
# ---------------------------------------------------------------------------

class TestPipeline:
    def test_full_pipeline_docx(self):
        result = extract_document(SAMPLE_DOCX, "jd.docx")
        assert result.success
        assert result.report.character_count > 20
        assert result.report.paragraph_count >= 1
        assert result.report.detected_format == "docx"

    def test_extension_mismatch_warning(self):
        result = extract_document(SAMPLE_DOCX, "file.doc")
        assert result.success
        assert any("does not match" in w for w in result.report.warnings)

    def test_report_to_dict(self):
        result = extract_document(SAMPLE_TXT, "jd.txt")
        d = result.report.to_dict()
        assert d["success"] is True
        assert d["detected_format"] == "txt"
        assert d["character_count"] > 0

    def test_pdf_only_blocks_docx(self):
        result = extract_document(SAMPLE_DOCX, "jd.docx", pdf_only=True)
        assert not result.success
        assert "unsupported extension" in (result.report.error or "").lower()
