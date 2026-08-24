from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ExtractionReport:
    filename: str
    declared_extension: str
    detected_format: str
    success: bool
    character_count: int = 0
    paragraph_count: int = 0
    warnings: list[str] = field(default_factory=list)
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "filename": self.filename,
            "declared_extension": self.declared_extension,
            "detected_format": self.detected_format,
            "success": self.success,
            "character_count": self.character_count,
            "paragraph_count": self.paragraph_count,
            "warnings": list(self.warnings),
            "error": self.error,
        }


@dataclass
class NormalizedDocument:
    """Common internal representation regardless of source file type."""

    text: str
    paragraphs: list[str]
    detected_format: str
    report: ExtractionReport

    @property
    def success(self) -> bool:
        return self.report.success
