from __future__ import annotations

import re


def split_paragraphs(text: str) -> list[str]:
    if not text:
        return []
    chunks = re.split(r"\n\s*\n+", text.strip())
    paragraphs = [chunk.strip() for chunk in chunks if chunk.strip()]
    if paragraphs:
        return paragraphs
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines


def normalize_extracted_text(text: str) -> str:
    """Normalize whitespace while preserving paragraph breaks."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
