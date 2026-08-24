from __future__ import annotations

import asyncio
import io
import json
import re
import logging
from typing import Any, List

logger = logging.getLogger(__name__)


_TEMPLATE_EXTRACTION_SYSTEM_PROMPT = """You are an expert HR data-extraction assistant.
You receive raw text from a Word or PDF file that contains one or more job templates.
Extract every template and return them as a JSON array with EXACTLY this structure.

OUTPUT FORMAT — return ONLY a valid JSON array, no prose, no markdown fences:
[
  {
    "template_code":   "string (required — unique short code e.g. SE001; use Job ID if present)",
    "job_title":       "string (required — job title from the document)",
    "company":         "string or null",
    "job_id":          "string or null  (job reference / requisition ID)",
    "job_family":      "string or null  (job family / category)",
    "job_level":       "string or null  (level code e.g. L1–L5)",
    "industry":        "string or null",
    "department":      "string or null",
    "location":        "string or null  (full location string)",
    "city":            "string or null",
    "country_code":    "string or null  (ISO-2 e.g. US, UK, IN)",
    "seniority":       "string or null  (Junior / Mid / Senior / Lead / Director etc.)",
    "employment_type": "string or null  (Full-time / Part-time / Contract etc.)",
    "salary_range":    "string or null  (e.g. $120k-$180k)",
    "salary_symbol":   "string or null  (e.g. $)",
    "salary_min_value":"string or null  (numeric only e.g. 120)",
    "salary_max_value":"string or null  (numeric only e.g. 180)",
    "salary_period":   "string or null  (e.g. /yr, /mo)",
    "professional_summary":      "string or null (professional summary paragraph)",
    "responsibilities_overview": "string or null (responsibilities prose)",
    "key_duties":          [{"point": "string", "weight": integer}],
    "core_competencies":   [{"point": "string", "weight": integer}],
    "functional_competencies": [{"point": "string", "weight": integer}],
    "qualifications_required":  [{"point": "string", "weight": integer}],
    "qualifications_preferred": [{"point": "string", "weight": integer}],
    "required_licenses_certifications": ["string"],
    "compliance_requirements":  ["string"],
    "tools_technologies":       ["string"],
    "equal_opportunity_statement": "string or null"
  }
]

RULES:
- Extract ALL templates (separated by ---, ===, or numbered headings).
- template_code: use Job ID if present; otherwise auto-generate from title initials + index.
- salary_range: reconstruct from symbol+min+max if split across fields (e.g. "$120k-$180k").
- salary_min_value / salary_max_value: numeric string only, no symbols.
- Weights in EVERY weighted section MUST sum to exactly 100. Distribute evenly if absent.
- qualifications_required and qualifications_preferred use the same {point, weight} format as key_duties.
- required_licenses_certifications = actual licence/certification strings (not qualifications).
- tools_technologies = named tools/platforms list.
- professional_summary and responsibilities_overview are plain prose strings.
- equal_opportunity_statement is the full verbatim equal-opportunity paragraph.
- Return EMPTY array [] if nothing can be extracted.
- Return ONLY the JSON array — no text before or after."""


async def ai_extract_templates_from_text(raw_text: str,filename: str = "file") -> List[dict]:
    """
    Send raw document text to the AI model and return a list of parsed template dicts.
    Falls back to an empty list on any error so the caller can use the rule-based parser instead.
    """
    try:
        from langchain_mistralai import ChatMistralAI
        from langchain_core.messages import SystemMessage, HumanMessage
        from app.core.config import settings
        from json_repair import repair_json
    except ImportError as exc:
        logger.warning("ai_extract_templates_from_text: missing dependency — %s", exc)
        return []

    if not raw_text or not raw_text.strip():
        return []

    # Increase limit to handle more templates in one go (approx 30k chars)
    truncated = raw_text[:30_000]

    user_prompt = (
        f"Extract all job templates from the following document text.\n"
        f"Document filename: {filename}\n\n"
        f"--- DOCUMENT TEXT START ---\n{truncated}\n--- DOCUMENT TEXT END ---"
    )

    try:
        from app.services.enhanced_ai_service import get_llm_client
        client = get_llm_client(model_name=settings.ai_model, temperature=0.1)

        async def _async_call() -> str:
            messages = [
                SystemMessage(content=_TEMPLATE_EXTRACTION_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
            resp = await client.ainvoke(messages)
            return (resp.content or "").strip()

        raw_response = await asyncio.wait_for(_async_call(), timeout=float(getattr(settings, "ai_timeout_read", 90.0)))

        if not raw_response:
            logger.warning("ai_extract_templates_from_text: empty AI response for %s", filename)
            return []

        # Strip markdown fences if the model wraps in ```json ... ```
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            repaired = repair_json(cleaned)
            parsed = json.loads(repaired)

        if not isinstance(parsed, list):
            logger.warning("ai_extract_templates_from_text: AI returned non-list for %s", filename)
            return []

        results: List[dict] = []
        for idx, item in enumerate(parsed, start=1):
            if not isinstance(item, dict):
                continue
            # Ensure required fields exist
            if not item.get("job_title") and not item.get("template_code"):
                continue
            # Auto-generate template_code if missing
            if not item.get("template_code"):
                title = str(item.get("job_title", ""))
                words = re.findall(r"[A-Za-z]+", title)
                abbr = "".join(w[0].upper() for w in words[:4]) or "TPL"
                item["template_code"] = f"{abbr}{idx:03d}"
            # Normalise weighted sections
            for section in ("key_duties", "core_competencies", "functional_competencies"):
                item[section] = _normalise_weighted(item.get(section) or [])
            # Normalise list sections
            for section in ("required_licenses_certifications",
                "compliance_requirements",
                "tools_technologies",
            ):
                raw_val = item.get(section) or []
                if isinstance(raw_val, str):
                    raw_val = [s.strip() for s in re.split(r"[,;]", raw_val) if s.strip()]
                item[section] = [str(v).strip() for v in raw_val if str(v).strip()]
            results.append(item)

        logger.info("ai_extract_templates_from_text: extracted %d template(s) from %s",len(results),filename)
        return results

    except asyncio.TimeoutError:
        logger.warning("ai_extract_templates_from_text: timed out for %s", filename)
        return []
    except Exception as exc:
        logger.warning("ai_extract_templates_from_text failed for %s: %s", filename, exc)
        return []


def _normalise_weighted(items: Any) -> list:
    """
    Ensure a weighted section is a list of {point, weight} dicts that sum to 100.
    Accepts strings, lists of strings, or lists of dicts.
    """
    if not items:
        return []

    normalised: list = []
    if isinstance(items, str):
        lines = [ln.strip(" -•*\t") for ln in items.splitlines() if ln.strip()]
        items = lines

    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                point = str(item.get("point") or item.get("text") or "").strip()
                try:
                    weight = int(float(item.get("weight") or 0))
                except (TypeError, ValueError):
                    weight = 0
                if point:
                    normalised.append({"point": point, "weight": weight})
            elif isinstance(item, str) and item.strip():
                normalised.append({"point": item.strip(), "weight": 0})

    if not normalised:
        return []

    total = sum(i["weight"] for i in normalised)
    if total != 100:
        per = 100 // len(normalised)
        rem = 100 - per * len(normalised)
        for i, entry in enumerate(normalised):
            entry["weight"] = per + (1 if i < rem else 0)

    return normalised

_SECTION_MAP: dict[str, str] = {
    # ── identity / meta ─────────────────────────────────────────────────────
    "template code": "template_code",
    "code": "template_code",
    "job title": "job_title",
    "title": "job_title",
    "position": "job_title",
    "position title": "job_title",
    "role": "job_title",
    "role title": "job_title",
    # ── job reference ────────────────────────────────────────────────────────
    "job id": "job_id",
    "job ref": "job_id",
    "job reference": "job_id",
    "requisition id": "job_id",
    "req id": "job_id",
    # ── job family / level ───────────────────────────────────────────────────
    "job family": "job_family",
    "job category": "job_family",
    "career family": "job_family",
    "job level": "job_level",
    "level": "job_level",
    "grade": "job_level",
    "pay grade": "job_level",
    # ── seniority ────────────────────────────────────────────────────────────
    "seniority": "seniority",
    "seniority level": "seniority",
    "career level": "seniority",
    "experience level": "seniority",
    # ── organisation ────────────────────────────────────────────────────────
    "industry": "industry",
    "industries": "industry",
    "industry focus": "industry",
    "industry sector": "industry",
    "sector": "industry",
    "company": "company",
    "company name": "company",
    "organisation": "company",
    "organization": "company",
    "employer": "company",
    "department": "department",
    "dept": "department",
    "division": "department",
    "business unit": "department",
    # ── location ─────────────────────────────────────────────────────────────
    "location": "location",
    "job location": "location",
    "work location": "location",
    "office location": "location",
    "city": "city",
    "country": "country_code",
    "country code": "country_code",
    # ── employment ───────────────────────────────────────────────────────────
    "employment type": "employment_type",
    "job type": "employment_type",
    "contract type": "employment_type",
    "work type": "employment_type",
    # ── salary ───────────────────────────────────────────────────────────────
    "salary range": "salary_range",
    "salary": "salary_range",
    "compensation": "salary_range",
    "pay range": "salary_range",
    "remuneration": "salary_range",
    "salary min": "salary_min_value",
    "minimum salary": "salary_min_value",
    "salary min value": "salary_min_value",
    "salary max": "salary_max_value",
    "maximum salary": "salary_max_value",
    "salary max value": "salary_max_value",
    "salary symbol": "salary_symbol",
    "currency": "salary_symbol",
    "salary period": "salary_period",
    "pay period": "salary_period",
    # ── skills ───────────────────────────────────────────────────────────────
    "key skills and requirements": "key_skills_and_requirements",
    "key skills": "key_skills_and_requirements",
    "skills": "key_skills_and_requirements",
    "required skills": "key_skills_and_requirements",
    "skills and requirements": "key_skills_and_requirements",
    "technical skills": "key_skills_and_requirements",
    "skills requirements": "key_skills_and_requirements",
    # ── content sections ─────────────────────────────────────────────────────
    "professional summary": "professional_summary",
    "summary": "professional_summary",
    "professional profile": "professional_summary",
    "profile": "professional_summary",
    "overview": "professional_summary",
    "about the role": "professional_summary",
    "role overview": "professional_summary",
    "responsibilities overview": "responsibilities_overview",
    "responsibilities": "responsibilities_overview",
    "essential duties and responsibilities": "responsibilities_overview",
    "essential duties": "responsibilities_overview",
    "additional context": "additional_context",
    "additional information": "additional_context",
    "notes": "additional_context",
    "context": "additional_context",
    "key duties": "key_duties",
    "key performance areas": "key_duties",
    "duties": "key_duties",
    "key responsibilities": "key_duties",
    "core competencies": "core_competencies",
    "competencies": "core_competencies",
    "functional competencies": "functional_competencies",
    "required licenses": "required_licenses_certifications",
    "required licenses & certifications": "required_licenses_certifications",
    "licenses and certifications": "required_licenses_certifications",
    "licenses & certifications": "required_licenses_certifications",
    "required qualifications": "qualifications_required",
    "qualifications required": "qualifications_required",
    "preferred qualifications": "qualifications_preferred",
    "qualifications preferred": "qualifications_preferred",
    "compliance requirements": "compliance_requirements",
    "compliance": "compliance_requirements",
    "tools & technologies": "tools_technologies",
    "tools and technologies": "tools_technologies",
    "tools": "tools_technologies",
    "technologies": "tools_technologies",
    "tech stack": "tools_technologies",
    "equal opportunity statement": "equal_opportunity_statement",
    "eeo statement": "equal_opportunity_statement",
    "equal opportunity employer": "equal_opportunity_statement",
    "equal employment opportunity": "equal_opportunity_statement",
    "eeo policy": "equal_opportunity_statement",
    "equal opportunity": "equal_opportunity_statement",
}

_WEIGHTED_SECTIONS = {
    "key_duties", "core_competencies", "functional_competencies",
    "qualifications_required", "qualifications_preferred",
}
_LIST_SECTIONS = {
    "required_licenses_certifications",
    "compliance_requirements",
    "tools_technologies",
}
_TEXT_SECTIONS = {
    "professional_summary",
    "responsibilities_overview",
    "equal_opportunity_statement",
    "additional_context",
    "key_skills_and_requirements",
}
# Scalar fields stored directly on the raw dict (not weighted/list/text)
_SCALAR_FIELDS = {
    "template_code", "job_title", "job_id", "job_family", "job_level",
    "industry", "company", "department", "location", "city", "country_code",
    "seniority", "employment_type",
    "salary_range", "salary_symbol", "salary_min_value", "salary_max_value", "salary_period",
    "compliance_tag",  # Add compliance_tag as scalar field
}

_JD_HEADING_RE = re.compile(
    r"^(?:\d+[\.\)]\s*)?JOB\s+DESCRIPTION\s*[:\-–—]?\s*(.*)$|^\d+[\.\)]\s+([A-Z].+)$",
    re.IGNORECASE,
)

_KV_RE = re.compile(r"^([A-Za-z0-9\s&/\-]+?)\s*[:\-–—]\s*(.+)$|^([A-Z][A-Z\s&]+)\s+(.+)$")


def _parse_python_dict_str(val: str):
    import ast
    if not (val.startswith("{") and val.endswith("}")):
        return None
    try:
        parsed = ast.literal_eval(val)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return None


def _canonical(heading: str) -> str:
    """Normalise a heading string to a canonical field key."""
    cleaned = re.sub(r"[\[\]#*_·•\-\u2022]", "", heading).strip().lower()
    # strip trailing colon
    cleaned = cleaned.rstrip(":")
    return _SECTION_MAP.get(cleaned, "")


def _parse_weighted(lines: list[str]) -> list[dict[str, Any]]:
    """Parse lines into WeightedItem dicts. Handles multi-line format where description and weight are on separate lines."""
    raw: list[tuple[str, int | None]] = []
    
    # Filter out table headers and noise
    HEADERS = {"description", "weight (%)", "weight", "point", "rating", "percentage", "value (%)", "wt (%)", "wt", "(%)"}
    filtered = []
    for ln in lines:
        s = ln.strip()
        if not s or s.lower() in HEADERS:
            continue
        filtered.append(s)

    i = 0
    while i < len(filtered):
        line = filtered[i]
        stripped = re.sub(r"^[•\-\*\u2022]\s*", "", line).strip()
        
        parsed_dict = _parse_python_dict_str(stripped)
        if parsed_dict:
            name = parsed_dict.get("point") or parsed_dict.get("title") or parsed_dict.get("text") or ""
            weight = parsed_dict.get("weight")
            try:
                weight = int(weight) if weight is not None else None
            except (TypeError, ValueError):
                weight = None
            if name:
                raw.append((name, weight))
            i += 1
            continue

        # Skip lines that are just percentages (they belong to previous item)
        if re.match(r'^\d+\s*%?$', stripped):
            i += 1
            continue
        
        # Case 1: "Name | 50" or "Name 50%" on same line
        if "|" in stripped:
            parts = stripped.rsplit("|", 1)
            name = parts[0].strip()
            w_match = re.search(r"(\d+)", parts[1])
            weight = int(w_match.group(1)) if w_match else None
            if name:
                raw.append((name, weight))
            i += 1
            continue
        
        # Case 2: Multi-line format - description followed by percentage on next line
        if i + 1 < len(filtered):
            next_line = filtered[i + 1].strip()
            # Check if next line is just a percentage
            pct_match = re.match(r'^(\d+)\s*%?$', next_line)
            if pct_match:
                name = stripped
                weight = int(pct_match.group(1))
                if name:
                    raw.append((name, weight))
                i += 2  # Skip both lines
                continue
        
        # Default: Just a point name, weight will be calculated later
        if stripped:
            raw.append((stripped, None))
        i += 1

    if not raw:
        return []

    # Final normalisation to ensure weights sum to 100
    has_weights = any(w is not None for _, w in raw)
    if not has_weights:
        per_item = 100 // len(raw)
        remainder = 100 - per_item * len(raw)
        return [
            {"point": name, "weight": per_item + (1 if idx < remainder else 0)}
            for idx, (name, _) in enumerate(raw)
        ]
    
    return [
        {"point": name, "weight": w if w is not None else 0}
        for name, w in raw
    ]


def _parse_simple_list(lines: list[str]) -> list[str]:
    result = []
    for line in lines:
        stripped = re.sub(r"^[•\-\*\u2022]\s*", "", line).strip()
        parsed_dict = _parse_python_dict_str(stripped)
        if parsed_dict:
            name = parsed_dict.get("point") or parsed_dict.get("title") or parsed_dict.get("text") or ""
            if name:
                result.append(name)
        elif stripped:
            result.append(stripped)
    return result


def normalize_seniority(val: Any) -> str:
    """Accept any seniority value, stripping whitespace. Returns empty string for None/NaN."""
    if val is None or (isinstance(val, float) and val != val):  # handles None and NaN
        return ""
    val_str = str(val).strip()
    return val_str


def _build_template(raw: dict[str, Any]) -> dict[str, Any]:
    """Build a template dict whose content keys match the JD content structure exactly."""
    return {
        "template_code":   raw.get("template_code", ""),
        "job_title":       raw.get("job_title", ""),
        "company":         raw.get("company"),
        "job_id":          raw.get("job_id"),
        "job_family":      raw.get("job_family"),
        "job_level":       raw.get("job_level"),
        "industry":        raw.get("industry", ""),
        "department":      raw.get("department"),
        "location":        raw.get("location"),
        "city":            raw.get("city"),
        "country_code":    raw.get("country_code"),
        "seniority":       normalize_seniority(raw.get("seniority")),
        "employment_type": raw.get("employment_type"),
        "salary_range":    raw.get("salary_range"),
        "salary_symbol":   raw.get("salary_symbol"),
        "salary_min_value":raw.get("salary_min_value"),
        "salary_max_value":raw.get("salary_max_value"),
        "salary_period":   raw.get("salary_period"),
        "key_skills_and_requirements": raw.get("key_skills_and_requirements"),
        "additional_context":          raw.get("additional_context"),
        "professional_summary":             raw.get("professional_summary"),
        "responsibilities_overview":        raw.get("responsibilities_overview"),
        "key_duties":                       raw.get("key_duties", []),
        "core_competencies":                raw.get("core_competencies", []),
        "functional_competencies":          raw.get("functional_competencies", []),
        "qualifications_required":          raw.get("qualifications_required", []),
        "qualifications_preferred":         raw.get("qualifications_preferred", []),
        "required_licenses_certifications": raw.get("required_licenses_certifications", []),
        "compliance_requirements":          raw.get("compliance_requirements", []),
        "tools_technologies":               raw.get("tools_technologies", []),
        "equal_opportunity_statement":      raw.get("equal_opportunity_statement"),
    }



def _parse_block(lines: list[str]) -> dict[str, Any]:
    """Parse a single template text block (Layout B) into a raw dict."""
    raw: dict[str, Any] = {}
    current_section: str = ""
    current_lines: list[str] = []

    def _flush():
        nonlocal current_section, current_lines
        if current_section and current_lines:
            if current_section in _WEIGHTED_SECTIONS:
                raw[current_section] = _parse_weighted(current_lines)
            elif current_section in _LIST_SECTIONS:
                raw[current_section] = _parse_simple_list(current_lines)
            elif current_section in _TEXT_SECTIONS:
                raw[current_section] = " ".join(current_lines).strip()
        current_lines = []

    # Try to extract job title from first few lines if not found in sections
    def _extract_job_title_from_text(text_lines):
        for line in text_lines[:15]:  # Check first 15 lines for better coverage
            line = line.strip()
            # Look for job title patterns
            if any(keyword in line.lower() for keyword in ['position', 'role', 'job title', 'title']):
                if ':' in line:
                    title = line.split(':', 1)[1].strip()
                elif '|' in line:
                    title = line.split('|', 1)[1].strip()
                else:
                    # Handle space-separated format like "JOB TITLE Orthopedic Surgeon"
                    # Split on the keyword and take the part after it
                    for keyword in ['job title', 'position', 'role', 'title']:
                        if keyword in line.lower():
                            # Find the keyword in the line and extract everything after it
                            idx = line.lower().find(keyword)
                            title = line[idx + len(keyword):].strip()
                            if title and len(title) > 3 and len(title) < 100:
                                return title
                if 'title' in locals() and len(title) > 3 and len(title) < 100:
                    return title
            # Standalone line that looks like a job title (expanded patterns)
            if (len(line) > 5 and len(line) < 120 and 
                not line.isupper() and 
                not re.search(r'\d', line) and
                any(word in line.lower() for word in [
                    'manager', 'developer', 'analyst', 'engineer', 'director', 'coordinator', 
                    'specialist', 'associate', 'consultant', 'advisor', 'officer', 
                    'representative', 'technician', 'therapist', 'nurse', 'assistant',
                    'coordinator', 'administrator', 'supervisor', 'lead', 'principal',
                    'surgeon', 'pediatrician', 'physician', 'doctor'
                ])):
                return line
            # Handle format like "Position: Senior Care Assistant"
            if ':' in line and any(keyword in line.lower() for keyword in ['position', 'role']):
                title = line.split(':', 1)[1].strip()
                if len(title) > 3 and len(title) < 100:
                    return title
        return None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # Heading formats: [Heading], # Heading, **Heading**, ALL CAPS
        heading_match = re.match(r"^\[?(.+?)\]?$|^#{1,3}\s+(.+?)$|^\*{1,2}(.+?)\*{1,2}$",line)
        if heading_match:
            candidate = (heading_match.group(1) or heading_match.group(2)
                or heading_match.group(3) or "").strip()
            key = _canonical(candidate.strip(": "))
            if key:
                _flush()
                current_section = key
                continue

        # ALL-CAPS plain heading (expanded to include more patterns)
        # Only match if the line is truly ALL CAPS (no lowercase letters)
        if (line.isupper() and len(line) >= 4 and not re.search(r"\d", line) and ":" not in line and len(line.strip()) < 50):
            key = _canonical(line)
            if key:
                _flush()
                current_section = key
                continue

        # Handle specific section headers from PDF format
        upper_line = line.upper().strip()
        if upper_line in [
            "SUMMARY", "ESSENTIAL DUTIES & RESPONSIBILITIES", "KEY PERFORMANCE AREAS",
            "CORE COMPETENCIES", "FUNCTIONAL COMPETENCIES", "QUALIFICATIONS",
            "PREFERRED QUALIFICATIONS", "REQUIRED LICENSES & CERTIFICATIONS",
            "COMPLIANCE REQUIREMENTS", "TOOLS & TECHNOLOGIES", "EQUAL OPPORTUNITY STATEMENT"
        ]:
            mapped_key = {
                "SUMMARY": "professional_summary",
                "ESSENTIAL DUTIES & RESPONSIBILITIES": "responsibilities_overview",
                "KEY PERFORMANCE AREAS": "key_duties",
                "CORE COMPETENCIES": "core_competencies",
                "FUNCTIONAL COMPETENCIES": "functional_competencies",
                "QUALIFICATIONS": "qualifications_required",
                "PREFERRED QUALIFICATIONS": "qualifications_preferred",
                "REQUIRED LICENSES & CERTIFICATIONS": "required_licenses_certifications",
                "COMPLIANCE REQUIREMENTS": "compliance_requirements",
                "TOOLS & TECHNOLOGIES": "tools_technologies",
                "EQUAL OPPORTUNITY STATEMENT": "equal_opportunity_statement"
            }.get(upper_line)
            if mapped_key:
                _flush()
                current_section = mapped_key
                continue

        # Inline key: value meta / scalar fields
        kv_match = _KV_RE.match(line)
        if kv_match:
            # Handle both formats: "Key: Value" or "KEY Value" (space-separated)
            key = kv_match.group(1) or kv_match.group(3)
            value = kv_match.group(2) or kv_match.group(4)
            if key:
                key_canonical = _canonical(key.strip())
                value = value.strip()
                # Only extract if this is a known scalar field (not a section header)
                if key_canonical and key_canonical in _SCALAR_FIELDS:
                    _flush()
                    current_section = ""
                    raw[key_canonical] = value
                    logger.debug("_parse_block: extracted scalar field '%s' = '%s'", key_canonical, value)
                    continue

        if current_section:
            current_lines.append(line)

    _flush()
    
    # If no job title found in structured sections, try to extract from text
    if not raw.get("job_title"):
        extracted_title = _extract_job_title_from_text(lines)
        if extracted_title:
            raw["job_title"] = extracted_title
            # Auto-generate template code if missing
            if not raw.get("template_code"):
                words = re.findall(r"[A-Za-z]+", extracted_title)
                abbr = "".join(w[0].upper() for w in words[:4]) or "JOB"
                raw["template_code"] = f"{abbr}001"
    
    return raw


def _split_and_parse_blocks(lines: list[str], filename: str) -> list[dict[str, Any]]:
    # First try page-based separation for multi-page documents
    page_templates = _extract_page_based_templates(lines, filename)
    if page_templates:
        logger.info("_split_and_parse_blocks: found %d page-based templates in %s", len(page_templates), filename)
        return page_templates
    
    # Fallback to original block logic
    blocks = []
    current = []

    # Better template detection - look for various separators
    for line in lines:
        upper_line = line.upper().strip()
        
        # Multiple ways to detect template boundaries
        if (upper_line.startswith("TEMPLATE CODE") or 
            upper_line.startswith("JOB DESCRIPTION") or
            re.match(r'^\d+[\.\)]\s*JOB\s+DESCRIPTION', upper_line) or
            re.match(r'^[-=]{3,}$', line) or  # --- or === separators
            (len(line.strip()) > 0 and line.strip() == line.strip().upper() and len(line.strip()) > 10)):  # ALL CAPS headings
            if current:
                blocks.append(current)
                current = []
        current.append(line)

    if current:
        blocks.append(current)

    logger.info("_split_and_parse_blocks: found %d blocks in %s", len(blocks), filename)
    
    templates = []
    for i, block in enumerate(blocks):
        logger.debug("_split_and_parse_blocks: processing block %d with %d lines", i, len(block))
        parsed = _parse_block(block)
        if parsed.get("job_title") or parsed.get("template_code"):
            templates.append(_build_template(parsed))
            logger.info("_split_and_parse_blocks: successfully parsed template %d from block %d", len(templates), i)
        else:
            logger.debug("_split_and_parse_blocks: block %d has no job_title or template_code", i)

    # Fallback: If no templates found, try treating entire document as one template
    if not templates and lines:
        logger.info("_split_and_parse_blocks: no templates found, trying entire document as single template for %s", filename)
        parsed = _parse_block(lines)
        if parsed.get("job_title") or parsed.get("template_code"):
            templates.append(_build_template(parsed))
            logger.info("_split_and_parse_blocks: successfully parsed entire document as template for %s", filename)

    logger.info("_split_and_parse_blocks: extracted %d templates from %s", len(templates), filename)
    return templates


def _extract_page_based_templates(lines: list[str], filename: str) -> list[dict[str, Any]]:
    """Extract templates from multi-page documents where each page is a separate template."""
    templates = []
    
    # Look for page patterns like "Page 1 of 10" or similar
    page_breaks = []
    for i, line in enumerate(lines):
        if re.match(r'page\s+\d+\s+of\s+\d+', line.lower()):
            page_breaks.append(i)
    
    # If no clear page breaks, try to detect by template code patterns
    if not page_breaks:
        # Look for lines that START with "TEMPLATE CODE" (not just contain it)
        for i, line in enumerate(lines):
            if line.strip().upper().startswith("TEMPLATE CODE"):
                page_breaks.append(i)
    
    if not page_breaks:
        return []
    
    # Split into page-based blocks
    for i in range(len(page_breaks)):
        start_idx = page_breaks[i]
        end_idx = page_breaks[i + 1] if i + 1 < len(page_breaks) else len(lines)
        
        page_lines = lines[start_idx:end_idx]
        if len(page_lines) < 3:  # Skip very short pages
            continue
            
        # Try to parse this page as a template
        parsed = _parse_block(page_lines)
        if parsed.get("job_title") or parsed.get("template_code"):
            templates.append(_build_template(parsed))
            logger.info("_extract_page_based_templates: extracted template from page %d in %s", i + 1, filename)
        else:
            logger.debug("_extract_page_based_templates: page %d has no job_title or template_code", i + 1)
    
    return templates



def parse_word_bytes(content: bytes, filename: str = "file.docx") -> list[dict[str, Any]]:
    try:
        from docx import Document
        from docx.table import Table
        from docx.text.paragraph import Paragraph
    except ImportError:
        raise RuntimeError("python-docx is required: pip install python-docx")

    doc = Document(io.BytesIO(content))

    is_layout_a = False
    for para in doc.paragraphs[:30]:
        if _JD_HEADING_RE.match(para.text.strip()):
            is_layout_a = True
            break

    if is_layout_a:
        return _parse_layout_a(doc, filename)
    else:
        return _parse_layout_b(doc, filename)


def _iter_block_items(parent):
    from docx.document import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P

    if isinstance(parent, Document):
        parent_elm = parent.element.body
    else:
        parent_elm = parent._element

    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def _parse_layout_a(doc, filename: str) -> list[dict[str, Any]]:
    templates: list[dict[str, Any]] = []
    current_jd: dict[str, Any] | None = None
    current_section: str = ""
    current_lines: list[str] = []
    jd_counter = 0

    def flush_section():
        nonlocal current_section, current_lines
        if not current_jd or not current_section or not current_lines:
            current_lines = []
            return
        if current_section in _WEIGHTED_SECTIONS:
            current_jd[current_section] = _parse_weighted(current_lines)
        elif current_section in _LIST_SECTIONS:
            current_jd[current_section] = _parse_simple_list(current_lines)
        elif current_section in _TEXT_SECTIONS:
            existing = current_jd.get(current_section, "")
            addition = " ".join(current_lines).strip()
            current_jd[current_section] = (existing + " " + addition).strip() if existing else addition
        current_lines = []

    def save_current_jd():
        nonlocal current_jd
        if current_jd is None: return
        flush_section()
        built = _build_template(current_jd)
        if built.get("job_title") or built.get("template_code"):
            templates.append(built)
        current_jd = None

    def auto_code(title: str, idx: int) -> str:
        words = re.findall(r"[A-Za-z]+", title)
        abbr = "".join(w[0].upper() for w in words[:4])
        return f"{abbr}{idx:03d}"

    for item in _iter_block_items(doc):
        if hasattr(item, "text"):  # Paragraph
            text = item.text.strip()
            if not text: continue

            jd_match = _JD_HEADING_RE.match(text)
            if jd_match:
                save_current_jd()
                jd_counter += 1
                job_title = jd_match.group(1).strip()
                current_jd = {"job_title": job_title, "template_code": auto_code(job_title, jd_counter)}
                current_section = ""
                current_lines = []
                continue

            if current_jd is None: continue

            section_key = _detect_section_heading(text)
            if section_key:
                flush_section()
                current_section = section_key
                continue

            kv_match = _KV_RE.match(text)
            if kv_match:
                field = _canonical(kv_match.group(1))
                value = kv_match.group(2).strip()
                if field and field not in _WEIGHTED_SECTIONS | _LIST_SECTIONS | _TEXT_SECTIONS:
                    flush_section()
                    current_section = ""
                    current_jd[field] = value
                    continue

            if current_section:
                current_lines.append(text)
        else:  # Table
            if current_jd is None: continue
            rows_text = []
            for row in item.rows:
                cells_text = [cell.text.strip() for cell in row.cells]
                if any(cells_text): rows_text.append(cells_text)
            if not rows_text: continue
            first_row = rows_text[0]
            if len(first_row) == 1:
                section_key = _detect_section_heading(first_row[0])
                if section_key:
                    flush_section()
                    current_section = section_key
                    if len(rows_text) > 1:
                        for r in rows_text[1:]: current_lines.append(" | ".join(c for c in r if c))
                    continue
            if len(first_row) >= 2:
                header_lower = first_row[0].lower()
                if "description" in header_lower or "point" in header_lower:
                    flush_section()
                    data_rows = rows_text[1:]
                    if current_section in _WEIGHTED_SECTIONS:
                        current_jd[current_section] = _table_rows_to_weighted(data_rows)
                    elif current_section in _LIST_SECTIONS:
                        current_jd[current_section] = [r[0] for r in data_rows if r[0]]
                    else:
                        for r in data_rows: current_lines.append(" | ".join(c for c in r if c))
                    continue
            for r in rows_text:
                if len(r) >= 2 and r[0]:
                    field = _canonical(r[0])
                    if field and field not in _WEIGHTED_SECTIONS | _LIST_SECTIONS | _TEXT_SECTIONS:
                        current_jd[field] = r[1]
                    else:
                        current_lines.append(" | ".join(c for c in r if c))
                elif r:
                    current_lines.append(r[0])

    save_current_jd()
    return templates


def _detect_section_heading(text: str) -> str:
    """Check if a line looks like a known section heading (e.g. 'Core Competencies:')."""
    stripped = text.strip()
    if not stripped or len(stripped) > 80:
        return ""

    # 1. Check for bracketed, hashed, or starred headings: [Heading], ### Heading, **Heading**
    m = re.match(r"^\[?(.+?)\]?$|^#{1,3}\s+(.+)$|^\*{1,2}(.+?)\*{1,2}$", stripped)
    if m:
        candidate = m.group(1) or m.group(2) or m.group(3) or ""
        key = _canonical(candidate.strip(": "))
        if key:
            return key

    # 2. Check for "Key: Value" (where Key is a known section)
    kv_match = _KV_RE.match(stripped)
    if kv_match:
        key = _canonical(kv_match.group(1))
        if key in _WEIGHTED_SECTIONS | _LIST_SECTIONS | _TEXT_SECTIONS:
            return key

    # 3. ALL CAPS or plain canonical match
    key = _canonical(stripped.rstrip(": "))
    if key:
        return key

    return ""


def _table_rows_to_weighted(rows: list[list[str]]) -> list[dict[str, Any]]:
    raw = []
    for r in rows:
        if not r or not r[0]: continue
        name = r[0].strip()
        weight = None
        if len(r) >= 2 and r[1]:
            w_str = re.sub(r"[^\d]", "", r[1])
            if w_str:
                try: weight = int(w_str)
                except: pass
        raw.append((name, weight))
    if not raw: return []
    has_w = any(w is not None for _, w in raw)
    if not has_w:
        per = 100 // len(raw)
        rem = 100 - per * len(raw)
        return [{"point": n, "weight": per + (1 if i < rem else 0)} for i, (n, _) in enumerate(raw)]
    return [{"point": n, "weight": w if w is not None else 0} for n, w in raw]


def _parse_layout_b(doc, filename: str) -> list[dict[str, Any]]:
    lines = []
    for item in _iter_block_items(doc):
        if hasattr(item, "text"):
            if item.text.strip(): lines.append(item.text.strip())
        else:
            for row in item.rows:
                cells = [c.text.strip() for c in row.cells]
                if len(cells) >= 2 and cells[0]:
                    lines.append(f"{cells[0]}: {cells[1]}")
                elif cells and cells[0]:
                    lines.append(cells[0])
    return _split_and_parse_blocks(lines, filename)


def parse_pdf_bytes(content: bytes, filename: str = "file.pdf") -> list[dict[str, Any]]:
    text = _extract_pdf_text(content)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    
    logger.info("parse_pdf_bytes: extracted %d non-empty lines from %s", len(lines), filename)
    
    # Debug: Show first few lines to understand structure
    if lines:
        sample_lines = lines[:10]
        logger.debug("parse_pdf_bytes: first 10 lines from %s: %s", filename, sample_lines)
    
    # Check if this is Layout A (numbered JOB DESCRIPTION headings)
    is_layout_a = False
    for ln in lines[:100]:  # Scan a bit deeper
        if _JD_HEADING_RE.search(ln):
            is_layout_a = True
            logger.debug("parse_pdf_bytes: found JD heading pattern: %s", ln)
            break
            
    if is_layout_a:
        logger.info("parse_pdf_bytes: detected Layout A (heading-based) for %s", filename)
        return _parse_pdf_layout_a(lines, filename)
    
    logger.info("parse_pdf_bytes: falling back to block-based parsing for %s", filename)
    result = _split_and_parse_blocks(lines, filename)
    logger.info("parse_pdf_bytes: block parsing returned %d templates", len(result))
    return result


def _parse_pdf_layout_a(lines: list[str], filename: str) -> list[dict[str, Any]]:
    templates = []
    current_jd = None
    current_section = ""
    current_lines = []
    jd_counter = 0

    def flush_section():
        nonlocal current_section, current_lines
        if not current_jd or not current_section or not current_lines:
            current_lines = []
            return
        if current_section in _WEIGHTED_SECTIONS:
            current_jd[current_section] = _parse_weighted(current_lines)
        elif current_section in _LIST_SECTIONS:
            current_jd[current_section] = _parse_simple_list(current_lines)
        elif current_section in _TEXT_SECTIONS:
            existing = current_jd.get(current_section, "")
            addition = " ".join(current_lines).strip()
            current_jd[current_section] = (existing + " " + addition).strip() if existing else addition
        current_lines = []

    def save_current_jd():
        nonlocal current_jd
        if current_jd is None: return
        flush_section()
        built = _build_template(current_jd)
        if built.get("job_title") or built.get("template_code"):
            templates.append(built)
        current_jd = None

    def auto_code(title: str, idx: int) -> str:
        words = re.findall(r"[A-Za-z]+", title)
        abbr = "".join(w[0].upper() for w in words[:4])
        return f"{abbr}{idx:03d}"

    logger.info("_parse_pdf_layout_a: starting scan of %d lines", len(lines))
    for idx, text in enumerate(lines):
        jd_match = _JD_HEADING_RE.search(text)
        if jd_match:
            save_current_jd()
            jd_counter += 1
            # Capture title from whichever group matched
            job_title = (jd_match.group(1) or jd_match.group(2) or "").strip()
            if not job_title:
                job_title = f"Template {jd_counter}"
            
            logger.info("Line %d: Found JD heading -> %s", idx, job_title)
            current_jd = {"job_title": job_title, "template_code": auto_code(job_title, jd_counter)}
            current_section = ""
            current_lines = []
            continue

        if current_jd is None: continue
        section_key = _detect_section_heading(text)
        if section_key:
            flush_section()
            current_section = section_key
            continue

        kv_match = _KV_RE.match(text)
        if kv_match:
            field = _canonical(kv_match.group(1))
            value = kv_match.group(2).strip()
            if field and field not in _WEIGHTED_SECTIONS | _LIST_SECTIONS | _TEXT_SECTIONS:
                flush_section()
                current_section = ""
                current_jd[field] = value
                continue
        if current_section:
            current_lines.append(text)
            
            # If the current section is the 'last field' (EO Statement),
            # and we see something that looks like a page number or footer,
            # we might want to stop capturing. 
            # (Simple heuristic: if it's very short and numeric, it's likely a page number)
            if current_section == "equal_opportunity_statement":
                if len(text) < 10 and re.search(r"^\d+$|^Page\s+\d+", text, re.IGNORECASE):
                    continue
    save_current_jd()
    return templates


def _extract_pdf_text(content: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text
        return extract_text(io.BytesIO(content))
    except ImportError: pass
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError: pass
    raise RuntimeError("No PDF reading library found.")
