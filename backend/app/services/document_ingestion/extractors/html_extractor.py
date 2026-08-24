from __future__ import annotations

import logging
import re

logger = logging.getLogger("app.document_ingestion.html")

_BLOCK_TAGS = frozenset({
    "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
    "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
    "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
})


def extract_html(content: bytes, filename: str) -> tuple[str, list[str]]:
    """
    Extract text from HTML using BeautifulSoup.
    Preserves headings, list items, and table rows as separate lines.
    """
    warnings: list[str] = []
    html = _decode_html(content, filename)
    if not html.strip():
        raise ValueError(f"HTML file is empty: {filename}")

    try:
        from bs4 import BeautifulSoup, NavigableString, Tag
    except ImportError as exc:
        raise RuntimeError("beautifulsoup4 is required: pip install beautifulsoup4") from exc

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "meta", "head"]):
        tag.decompose()

    lines: list[str] = []

    def walk(node) -> None:
        if isinstance(node, NavigableString):
            text = str(node).strip()
            if text:
                lines.append(text)
            return
        if not isinstance(node, Tag):
            return
        name = (node.name or "").lower()
        if name in {"ul", "ol"}:
            for li in node.find_all("li", recursive=False):
                item_text = li.get_text(" ", strip=True)
                if item_text:
                    lines.append(f"• {item_text}")
            return
        if name == "tr":
            cells = [cell.get_text(" ", strip=True) for cell in node.find_all(["th", "td"])]
            cells = [c for c in cells if c]
            if cells:
                lines.append(" | ".join(cells))
            return
        if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            heading = node.get_text(" ", strip=True)
            if heading:
                lines.append(heading)
            return
        if name in {"p", "div", "section", "article", "blockquote", "pre"}:
            block_text = node.get_text("\n", strip=True)
            if block_text:
                lines.extend(part.strip() for part in block_text.splitlines() if part.strip())
            return
        for child in node.children:
            walk(child)

    body = soup.body or soup
    walk(body)

    if not lines:
        fallback = soup.get_text("\n", strip=True)
        lines = [part.strip() for part in fallback.splitlines() if part.strip()]
        if lines:
            warnings.append("Used flat text fallback; document structure may be simplified")

    text = "\n".join(lines)
    if not text.strip():
        raise ValueError(f"No extractable text found in HTML: {filename}")

    logger.info("HTML extraction complete: file=%s chars=%s lines=%s", filename, len(text), len(lines))
    return text, warnings


def _decode_html(content: bytes, filename: str) -> str:
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    try:
        import chardet
        detected = chardet.detect(content)
        encoding = detected.get("encoding") or "utf-8"
        return content.decode(encoding, errors="replace")
    except ImportError:
        return content.decode("utf-8", errors="replace")
