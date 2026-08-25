from __future__ import annotations

import logging
import re
from html.parser import HTMLParser

logger = logging.getLogger("app.document_ingestion.html")

_BLOCK_TAGS = frozenset({
    "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt",
    "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
    "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
})


class _StandardHTMLTextExtractor(HTMLParser):
    """Zero-dependency fallback parser using Python standard library."""
    def __init__(self) -> None:
        super().__init__()
        self.lines: list[str] = []
        self._current: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        t = tag.lower()
        if t in {"script", "style", "noscript", "meta", "head"}:
            self._skip_depth += 1
        elif t in _BLOCK_TAGS or t in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "li", "tr"}:
            self._flush()

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in {"script", "style", "noscript", "meta", "head"}:
            self._skip_depth = max(0, self._skip_depth - 1)
        elif t in _BLOCK_TAGS or t in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "li", "tr"}:
            self._flush()

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            clean = data.strip()
            if clean:
                self._current.append(clean)

    def _flush(self) -> None:
        if self._current:
            line = " ".join(self._current).strip()
            if line:
                self.lines.append(line)
            self._current = []

    def get_lines(self) -> list[str]:
        self._flush()
        return self.lines


def extract_html(content: bytes, filename: str) -> tuple[str, list[str]]:
    """
    Extract text from HTML using BeautifulSoup with built-in standard library fallback.
    Preserves headings, list items, and table rows as separate lines.
    """
    warnings: list[str] = []
    html = _decode_html(content, filename)
    if not html.strip():
        raise ValueError(f"HTML file is empty: {filename}")

    lines: list[str] = []

    # 1. Try BeautifulSoup if available
    try:
        from bs4 import BeautifulSoup, NavigableString, Tag
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "meta", "head"]):
            tag.decompose()

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

    except ImportError:
        # 2. Built-in zero-dependency fallback parser
        logger.info("BeautifulSoup not found. Using standard HTMLParser fallback.")
        parser = _StandardHTMLTextExtractor()
        parser.feed(html)
        lines = parser.get_lines()

    text = "\n".join(lines)
    if not text.strip():
        # Last-resort regex strip
        clean_re = re.sub(r"<[^>]+>", " ", html)
        lines = [l.strip() for l in clean_re.splitlines() if l.strip()]
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
