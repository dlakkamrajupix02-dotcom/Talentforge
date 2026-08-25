from app.core.logging import get_logger
from app.core.logging import log_exception_one_line
import json
import re
import ast
from uuid import UUID
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request, Body
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.models.models import CandidateUser, JobDescription, User
from app.services.cache_service import cache_service
from app.services.enhanced_ai_service import generate_job_description
from app.schemas.schemas import (JobDescriptionResponse, OrgJdSummaryResponse, JDCreateFromTemplate,JDGenerateRequest,JDAutosaveRequest,JDUpdateSectionRequest,JDStatusUpdateRequest,JDBulkStatusUpdateRequest,JobIdCheckRequest,JobIdCheckResponse,StandaloneRegenerateRequest,
    StandaloneRegenerateSectionResponse,StandaloneRegeneratePointRequest,StandaloneRegeneratePointResponse,UserWordLimitsPatch,UserWordLimitsResponse,OrgJdIdResponse,JobDescriptionSkeletonCreate,
    DEIScanRequest,DEIScanResponse,ComplianceScanRequest,ComplianceScanResponse,JDTranslateRequest,JDTranslateResponse, migrate_to_stable_format, reindex_stable_sections, delete_and_reindex_stable_sections, _sanitize_stable_content)
from app.services.dependencies import get_current_regular_user, get_current_user, ORG_JD_ADMIN_ROLES, is_super_admin_role
from app.services.enhanced_ai_service import (regenerate_section, regenerate_point, analyze_dei, analyze_compliance,
    translate_jd)
from app.repository import jd_repository as jd_repo
from app.repository import organization_repository as org_repo
from app.repository import org_image_repository as org_img_repo
from app.repository import auth_repository as auth_repo
from app.core.file_storage import save_image_to_disk
from app.services.pdf_service import PDFGenerator



logger = get_logger()
pdf_generator = PDFGenerator()

router = APIRouter(prefix="/job_descriptions", tags=["Job Descriptions"])

WEIGHTED_SECTIONS = {
    "key_duties",
    "core_competencies",
    "functional_competencies",
    "qualifications_required",
    "qualifications_preferred",
}

STANDARD_CONTENT_SECTIONS = frozenset({
    "summary",
    "essential_duties_and_responsibilities",
    *WEIGHTED_SECTIONS,
    "eeo_statement",
})

# Frontend alias keys → canonical content keys
SECTION_KEY_ALIASES = {
    "responsibilities": "key_duties",
    "corecompetencies": "core_competencies",
    "functionalcompetencies": "functional_competencies",
    "responsibilities_view": "key_duties_view",
    "corecompetencies_view": "core_competencies_view",
    "functionalcompetencies_view": "functional_competencies_view",
    "weight_view_responsibilities": "weight_view_key_duties",
    "weight_view_responsibilities_view": "weight_view_key_duties",
    "weight_view_corecompetencies": "weight_view_core_competencies",
    "weight_view_corecompetencies_view": "weight_view_core_competencies",
    "weight_view_functionalcompetencies": "weight_view_functional_competencies",
    "weight_view_functionalcompetencies_view": "weight_view_functional_competencies",
    "weight_view_qualifications_required_view": "weight_view_qualifications_required",
    "weight_view_qualifications_preferred_view": "weight_view_qualifications_preferred",
}

def _stable_section_display_name(section_key: str, section_param: str, labels: dict, existing_name: Optional[str] = None) -> str:
    if existing_name and not str(existing_name).startswith("section_"):
        return existing_name
    if labels.get(section_key):
        return labels[section_key]
    if section_param and not section_param.startswith("section_"):
        return section_param
    return section_key.replace("_", " ").title()


def _raw_jd_content(jd) -> dict:
    """Return persisted JSONB content without the legacy-facing content getter transform."""
    raw = getattr(jd, "_content", None)
    if isinstance(raw, dict):
        return dict(raw)
    return dict(getattr(jd, "content", None) or {})


def _unwrap_stable_section_payload(value: Any) -> tuple[Any, dict]:
    """Extract section_data (+ optional name/type/metadata) from a stable section object."""
    if not isinstance(value, dict) or "section_data" not in value:
        return value, {}
    extras: dict = {}
    if value.get("name"):
        extras["name"] = value["name"]
    if value.get("type"):
        extras["type"] = value["type"]
    if isinstance(value.get("metadata"), dict):
        extras["metadata"] = dict(value["metadata"])
    payload = value.get("section_data")
    while isinstance(payload, dict) and "section_data" in payload and (
        "name" in payload or "type" in payload or "metadata" in payload
    ):
        if payload.get("name"):
            extras["name"] = payload["name"]
        if payload.get("type"):
            extras["type"] = payload["type"]
        if isinstance(payload.get("metadata"), dict):
            merged_meta = dict(extras.get("metadata") or {})
            merged_meta.update(payload["metadata"])
            extras["metadata"] = merged_meta
        payload = payload.get("section_data")
    return payload, extras


def _enforce_stable_jd_payload(content: dict, sections_metadata: Optional[dict] = None) -> dict:
    """Normalize content + sections_metadata to the stable {name, type, section_data} schema."""
    migrated = migrate_to_stable_format({
        "content": dict(content or {}),
        "sections_metadata": dict(sections_metadata or {}),
        "custom_fields": {},
    })
    return migrated


def _normalize_sections_order_list(order: Any) -> list[str]:
    """Coerce order payloads to a list of section key strings."""
    if not isinstance(order, list):
        return []
    normalized: list[str] = []
    for item in order:
        if isinstance(item, str):
            key = item.strip()
            if key:
                normalized.append(key)
        elif isinstance(item, dict):
            raw = item.get("point") or item.get("title") or item.get("name") or item.get("key") or item.get("id")
            if raw is not None:
                key = str(raw).strip()
                if key:
                    normalized.append(key)
        elif item is not None:
            key = str(item).strip()
            if key:
                normalized.append(key)
    return normalized


def _apply_sections_order_update(
    jd,
    order: list,
) -> tuple[dict, dict]:
    """Persist a frontend-provided section order into stable content + metadata."""
    order = _normalize_sections_order_list(order)
    if not order:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="sections_order must be a non-empty array of section keys.")
    migrated = _enforce_stable_jd_payload(_raw_jd_content(jd), jd.sections_metadata)
    new_content = dict(migrated["content"])
    new_meta = dict(migrated.get("sections_metadata") or jd.sections_metadata or {})
    new_content["sections_order"] = order
    new_content["_section_order"] = [
        k for k in order
        if (sec := new_content.get(k)) and isinstance(sec, dict)
    ] or list(order)
    new_meta["order"] = order
    final = _enforce_stable_jd_payload(new_content, new_meta)
    return final["content"], final["sections_metadata"]

DEFAULT_SECTION_LABELS = {
    "summary": "Summary",
    "essential_duties_and_responsibilities": "Role Narrative",
    "essential_duties_block": "Essential Duties & Responsibilities",
    "key_duties": "Key Performance Areas",
    "core_competencies": "Core Competencies",
    "functional_competencies": "Functional Competencies",
    "qualifications_required": "Required Qualifications",
    "qualifications_preferred": "Preferred Qualifications",
    "eeo_statement": "Equal Opportunity Statement",
}

TOP_LEVEL_SECTION_MAP = {
    "title": "title",
    "jobtitle": "title",
    "job_title": "title",
    "job_id": "job_id",
    "jobid": "job_id",
    "department": "department",
    "job_family": "job_family",
    "jobfamily": "job_family",
    "salary_range": "salary_range",
    "salaryrange": "salary_range",
    "salary": "salary_range",
    "salary_min_value": "salary_min_value",
    "salary_max_value": "salary_max_value",
    "salary_symbol": "salary_symbol",
    "salary_period": "salary_period",
    "compensation": "salary_range",
    "remuneration": "salary_range",
    "job_level": "job_level",
    "joblevel": "job_level",
    "industry": "industry",
    "location": "location",
    "image_url": "image_url",
    "image": "image_url",
    "employment_type": "employment_type",
    "employmenttype": "employment_type",
    "job_type": "employment_type",
    "jobtype": "employment_type",
    "work_type": "employment_type",
    "worktype": "employment_type",
    "company_name": "company_name",
    "companyname": "company_name",
    "seniority": "seniority",
    "city": "city",
    "country_code": "country_code",
    "countrycode": "country_code",
    "key_skills": "key_skills",
    "keyskills": "key_skills",
    "skills": "key_skills",
    "additional_context": "additional_context",
    "additionalcontext": "additional_context",
    "context": "additional_context",
}


def _normalize_section_key(section: str) -> str:
    """Normalizes section keys for consistent lookup."""
    s = str(section or "").strip().lower()
    s = s.replace(":", "")
    s = s.replace(" ", "_")
    compact = s.replace("_", "")
    if s in SECTION_KEY_ALIASES:
        return SECTION_KEY_ALIASES[s]
    if compact in SECTION_KEY_ALIASES:
        return SECTION_KEY_ALIASES[compact]
    return s


def _resolve_top_level_field(section: str) -> Optional[str]:
    """Maps a section name to a top-level model field if applicable."""
    normalized = _normalize_section_key(section)
    if normalized in TOP_LEVEL_SECTION_MAP:
        return TOP_LEVEL_SECTION_MAP[normalized]
    compact = normalized.replace("_", "")
    return TOP_LEVEL_SECTION_MAP.get(compact)


async def _attach_public_and_original_jd_ids(db: AsyncSession, jds: list[JobDescription]) -> None:
    if not jds:
        return

    root_ids = [jd.id for jd in jds if jd.id is not None]
    clone_map = await jd_repo.get_public_clone_map_for_jds(db, root_ids)
    for jd in jds:
        jd.original_jd_id = jd.parent_jd_id if jd.parent_jd_id is not None else None
        public_clone_id = clone_map.get(jd.id)
        jd.public_jd_id = public_clone_id if public_clone_id is not None else None



def _is_view_lock_value(value: Any) -> bool:
    return value in ("locked", "unlocked")


def _default_standard_view_locks() -> dict:
    """Default locked/unlocked flags for built-in content sections."""
    return {f"{section}_view": "unlocked" for section in STANDARD_CONTENT_SECTIONS}


def _default_weight_view_locks() -> dict:
    """Default locked/unlocked flags for weighted-section weight visibility."""
    return {f"weight_view_{section}": "unlocked" for section in WEIGHTED_SECTIONS}


def _is_content_lock_entry(key: str, value: Any) -> bool:
    """True when a content key holds a section lock state, not section data."""
    normalized = _normalize_section_key(key)
    return _is_view_lock_value(value) and (normalized.endswith("_view") or normalized.startswith("weight_view_"))


def _normalize_content_view_locks(content: dict) -> dict:
    """
    Strip legacy lock keys and keep only {section}_view / weight_view_* locks.
    """
    data = dict(content or {})
    migrated_locks: dict[str, str] = {}

    for key in list(data.keys()):
        value = data[key]
        if not _is_view_lock_value(value):
            continue
        normalized = _normalize_section_key(key)
        if normalized == "custom_fields":
            del data[key]
            continue
        if normalized.startswith("weight_view_"):
            migrated_locks[normalized] = value
            if key != normalized:
                del data[key]
            continue
        view_key = normalized if normalized.endswith("_view") else f"{normalized}_view"
        migrated_locks[view_key] = value
        if key != view_key:
            del data[key]

    data.update(migrated_locks)
    return data


def _build_content_with_view_locks(content: dict) -> dict:
    """Normalize section lock keys in content."""
    return _normalize_content_view_locks(content)


_STANDARD_GENERATED_SECTION_ORDER = [
    "summary",
    "essential_duties_and_responsibilities",
    "key_duties",
    "core_competencies",
    "functional_competencies",
    "qualifications_required",
    "qualifications_preferred",
    "eeo_statement",
]


def _user_section_has_content(content: Any) -> bool:
    if content is None:
        return False
    if isinstance(content, str):
        return bool(content.strip())
    if isinstance(content, list):
        for item in content:
            if isinstance(item, str) and item.strip():
                return True
            if isinstance(item, dict):
                point = str(item.get("point") or item.get("title") or "").strip()
                if point:
                    return True
        return False
    return True


def _normalize_user_section_value(content: Any, sec_type: str) -> Any:
    if sec_type == "points":
        if isinstance(content, str):
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            return [{"point": line, "weight": 0} for line in lines]
        if isinstance(content, list):
            normalized = []
            for item in content:
                if isinstance(item, dict):
                    point = str(item.get("point") or item.get("title") or "").strip()
                    if point:
                        normalized.append({"point": point, "weight": int(item.get("weight") or 0)})
                elif isinstance(item, str) and item.strip():
                    normalized.append({"point": item.strip(), "weight": 0})
            return normalized
        return []
    if isinstance(content, list):
        return "\n".join(str(item) for item in content if item is not None)
    return str(content or "")


def _build_full_section_order(content: dict, user_sections: Optional[list], order_hint: Optional[list]) -> list[str]:
    order: list[str] = []
    for key in _STANDARD_GENERATED_SECTION_ORDER:
        if key in content:
            order.append(key)
    custom_names = [str(spec.name).strip() for spec in (user_sections or []) if getattr(spec, "name", None)]
    hinted = _normalize_sections_order_list(order_hint or [])
    for name in hinted:
        if name in custom_names and name not in order:
            order.append(name)
    for name in custom_names:
        if name and name not in order:
            order.append(name)
    return order


async def _merge_user_sections_into_content(
    generated_content: dict,
    user_sections: Optional[list],
    order_hint: Optional[list],
    jd_context: dict,
    provider_model: Optional[str],
) -> dict:
    """Merge wizard-provided sections: preserve filled data, AI-generate empty ones."""
    if not user_sections:
        return generated_content

    merged = dict(generated_content or {})
    for spec in user_sections:
        name = str(getattr(spec, "name", "") or "").strip()
        if not name:
            continue

        raw_content = getattr(spec, "content", None)
        sec_type = getattr(spec, "type", None) or ("points" if isinstance(raw_content, list) else "text")
        generate_if_empty = getattr(spec, "generate_if_empty", True)

        if _user_section_has_content(raw_content):
            merged[name] = _normalize_user_section_value(raw_content, sec_type)
        elif generate_if_empty:
            try:
                reg_payload = {**jd_context, "content": merged, **merged}
                reg_result = await regenerate_section(
                    reg_payload,
                    section=name,
                    section_label=name,
                    section_type=sec_type,
                    model_name=provider_model,
                )
                merged[name] = reg_result.get(name, "" if sec_type == "text" else [])
            except Exception as exc:
                logger.warning(f"Failed to generate user section '{name}': {exc}")
                merged[name] = "" if sec_type == "text" else []
        else:
            merged[name] = "" if sec_type == "text" else []

        section_meta = getattr(spec, "metadata", None)
        view_section = True if section_meta is None else getattr(section_meta, "view_section", True)
        merged[f"{name}_view"] = "unlocked" if view_section else "locked"

    merged["_section_order"] = _build_full_section_order(merged, user_sections, order_hint)
    return merged


def _dynamic_sections_from_user_specs(user_sections: Optional[list]) -> list[dict]:
    dynamic_sections: list[dict] = []
    for spec in user_sections or []:
        name = str(getattr(spec, "name", "") or "").strip()
        if not name:
            continue
        section_meta = getattr(spec, "metadata", None)
        push_to_csod = True if section_meta is None else getattr(section_meta, "push_to_csod", True)
        sec_type = getattr(spec, "type", None) or "text"
        dynamic_sections.append({
            "key": name,
            "id": name,
            "heading": name,
            "type": sec_type,
            "push_to_csod": push_to_csod,
        })
    return dynamic_sections


def _resolve_section_lock_key(section: str) -> Optional[str]:
    """Resolve the content key used for lock state — always {section}_view."""
    normalized = _normalize_section_key(section)
    if normalized.startswith("weight_view_"):
        return normalized
    if normalized.endswith("_view"):
        return normalized
    return f"{normalized}_view"


def _is_standard_content_section(section: str) -> bool:
    """True for built-in JD content keys stored in the content JSONB column."""
    normalized = _normalize_section_key(section)
    if normalized in STANDARD_CONTENT_SECTIONS:
        return True
    if normalized.endswith("_view"):
        return True
    if normalized.startswith("weight_view_"):
        return True
    return False


def _is_section_unlocked(content: dict, section: str) -> bool:
    """Return True when a section's _view lock is unlocked (default unlocked if missing)."""
    normalized = _normalize_section_key(section)
    lock_val = (content or {}).get(f"{normalized}_view")
    if lock_val is None:
        return True
    return lock_val == "unlocked"


def _section_locked_in_metadata(sections_metadata: Optional[dict], section_key: str, content: dict) -> bool:
    """Return True when a section is hidden via sections_metadata locks or legacy _view keys."""
    meta = sections_metadata or {}
    locks = meta.get("locks") or {}
    norm = _normalize_section_key(section_key)
    if locks.get(section_key) == "locked" or locks.get(norm) == "locked":
        return True
    return (content or {}).get(f"{norm}_view") == "locked"


def _filter_content_for_export(content: dict, sections_metadata: Optional[dict] = None) -> dict:
    """Include exportable section data; skip hidden sections; attach labels metadata."""
    base_content = dict(content or {})
    meta = sections_metadata or {}
    exportable: dict = {}
    labels = dict(DEFAULT_SECTION_LABELS)
    labels.update(meta.get("labels") or {})

    section_order = base_content.get("_section_order") or meta.get("order") or []

    for section in section_order:
        if _section_locked_in_metadata(meta, section, base_content):
            continue
        norm = _normalize_section_key(section)
        value = base_content.get(section)
        if value is None:
            value = base_content.get(norm)
        if value is None or value == "" or value == []:
            continue
        if _is_content_lock_entry(section, value):
            continue
        export_key = section if section in base_content else norm
        exportable[export_key] = value

    for key, value in base_content.items():
        norm = _normalize_section_key(key)
        if norm.endswith("_view") or norm.startswith("weight_view_"):
            exportable[norm] = value

    exportable["_section_order"] = section_order
    if "_section_labels" in base_content and isinstance(base_content["_section_labels"], dict):
        labels.update(base_content["_section_labels"])
    exportable["_section_labels"] = labels
    return exportable


def _to_legacy_content_format(content: dict) -> dict:
    if not any(k.startswith("section_") for k in content.keys()):
        return content
        
    legacy_content = {}
    sections_order = content.get("sections_order") or []
    dynamic_labels = {}
    
    for key in sections_order:
        sec_obj = content.get(key)
        if isinstance(sec_obj, dict) and "name" in sec_obj and "section_data" in sec_obj:
            name = sec_obj["name"]
            sem_key = name.lower().strip().replace(" ", "_")
            if sem_key == "professional_summary":
                sem_key = "summary"
            elif sem_key == "essential_duties_and_responsibilities":
                sem_key = "essential_duties_and_responsibilities"
                
            legacy_content[sem_key] = sec_obj["section_data"]
            dynamic_labels[sem_key] = name
            
            view_lock = sec_obj.get("metadata", {}).get("view", "unlocked")
            legacy_content[f"{sem_key}_view"] = view_lock
            
    legacy_content["_section_order"] = [
        (v["name"].lower().strip().replace(" ", "_") if v["name"].lower().strip().replace(" ", "_") != "professional_summary" else "summary")
        for k in sections_order if (v := content.get(k)) and isinstance(v, dict)
    ]
    legacy_content["_section_labels"] = dynamic_labels
    return legacy_content


def _prepare_jd_export_payload(jd: JobDescription, image_url: Optional[str]) -> dict:
    """Build export payload with all content; renderers decide how to show locks."""
    legacy_content = _to_legacy_content_format(jd.content or {})
    normalized_content = _normalize_content_view_locks(legacy_content)
    payload = _jd_to_export_payload(jd, image_url)
    payload["sections_metadata"] = dict(jd.sections_metadata or {})
    payload["content"] = _filter_content_for_export(normalized_content, jd.sections_metadata)
    return payload


def _show_export_weights(export_content: dict, section: str) -> bool:
    """Return True unless a weighted section's weight visibility is locked."""
    normalized = _normalize_section_key(section)
    return (export_content or {}).get(f"weight_view_{normalized}") != "locked"


def _format_export_section_body(value: Any, show_weights: bool = True) -> str:
    """Format a section value as plain text for clipboard export."""
    table = _as_markdown_weight_table(value if show_weights and isinstance(value, list) else [])
    if table:
        return table + "\n"
    if isinstance(value, list) and value and isinstance(value[0], dict):
        points = [
            str(i.get("point") or i.get("text") or "").strip()
            for i in value
            if str(i.get("point") or i.get("text") or "").strip()
        ]
        return "\n".join(f"- {point}" for point in points) + ("\n" if points else "")
    text = _as_text(value)
    return f"{text}\n" if text else ""


def _build_clipboard_export_text(jd: JobDescription, export_content: dict) -> str:
    """Build clipboard plain text from filtered export content."""
    text = f"{jd.title}\n\n"
    if jd.company_name:
        text += f"Company: {jd.company_name}\n"
    if jd.job_id:
        text += f"Job ID: {jd.job_id}\n"
    if jd.job_family:
        text += f"Job Family: {jd.job_family}\n"
    if jd.job_level:
        text += f"Job Level: {jd.job_level}\n"
    if jd.department:
        text += f"Department: {jd.department}\n"
    if jd.location:
        text += f"Location: {jd.location}\n"
    if jd.industry:
        text += f"Industry: {jd.industry}\n"
    if jd.seniority:
        text += f"Seniority: {jd.seniority}\n"
    emp_type = jd.employment_type or "Full-Time"
    if emp_type:
        text += f"Employment Type: {emp_type}\n"
    if jd.salary_range:
        text += f"Salary Range: {jd.salary_range}\n"
    text += "\n"
    section_labels = [
        ("PROFESSIONAL SUMMARY", "summary", 500),
        ("ESSENTIAL DUTIES AND RESPONSIBILITIES", "essential_duties_and_responsibilities", 800),
        ("KEY DUTIES", "key_duties", None),
        ("CORE COMPETENCIES", "core_competencies", 500),
        ("FUNCTIONAL COMPETENCIES", "functional_competencies", 500),
        ("QUALIFICATIONS REQUIRED", "qualifications_required", None),
        ("QUALIFICATIONS PREFERRED", "qualifications_preferred", None),
        ("EQUAL OPPORTUNITY STATEMENT", "eeo_statement", 400),
    ]
    known_keys = {key for _, key, _ in section_labels}

    for label, key, max_len in section_labels:
        value = export_content.get(key)
        if not value:
            continue
        body = _format_export_section_body(value, _show_export_weights(export_content, key)).strip()
        if not body:
            continue
        if max_len and len(body) > max_len:
            body = body[: max_len - 3] + "..."
        text += f"{label}\n{body}\n\n"
    labels = export_content.get("_section_labels", {})
    
    for key, value in export_content.items():
        if key in known_keys or key.endswith("_view") or key.startswith("weight_view_"):
            continue
        if key in ("_section_order", "_section_labels", "_dynamic_sections"):
            continue
        body = _format_export_section_body(value, _show_export_weights(export_content, key)).strip()
        if not body:
            continue
        
        # Use custom label if available, otherwise fallback to key formatting
        label = labels.get(key, key.replace('_', ' ').title())
        text += f"{label.upper()}\n{body}\n\n"

    return text


def _extract_section_value(payload_value: Any, section: str, resolved_field: Optional[str]) -> Any:
    """Extracts a specific section value from a payload dictionary."""
    if not isinstance(payload_value, dict):
        return payload_value

    normalized_section = _normalize_section_key(section)
    candidates = {
        section,
        normalized_section,
        normalized_section.replace("_", ""),
    }
    if resolved_field:
        candidates.update({resolved_field, resolved_field.replace("_", "")})
    for key in candidates:
        if key in payload_value:
            return payload_value[key]
    for k, v in payload_value.items():
        nk = _normalize_section_key(str(k))
        if nk in candidates or nk.replace("_", "") in candidates:
            return v

    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,detail=(f"Payload must include '{resolved_field or section}' under 'value' ""or pass the raw value directly."))


def _parse_python_dict_str(val: str) -> Optional[dict]:
    if not (val.startswith("{") and val.endswith("}")):
        return None
    try:
        parsed = ast.literal_eval(val)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return None


def _extract_points(value: Any) -> List[str]:
    """Normalizes various input formats into a list of string points."""
    if value is None:
        return []
    if isinstance(value, list):
        points: List[str] = []
        for item in value:
            if isinstance(item, str):
                parsed = _parse_python_dict_str(item.strip())
                if parsed:
                    item = parsed
            if isinstance(item, dict):
                title = (
                    item.get("Title") or item.get("title")
                    or item.get("name") or item.get("Name")
                )
                definition = (
                    item.get("Definition") or item.get("definition")
                    or item.get("description") or item.get("Description")
                )
                if title and definition:
                    text = f"{str(title).strip()}: {str(definition).strip()}"
                else:
                    text = str(
                        item.get("point") or item.get("text") or item.get("title") or title or definition or ""
                    ).strip()
            else:
                text = str(item).strip()
            if text:
                points.append(text)
        return points
    if isinstance(value, str):
        lines = [ln.strip(" -•\t") for ln in value.splitlines() if ln.strip()]
        if len(lines) > 1:
            return [ln for ln in lines if ln]
        sentences = [s.strip() for s in re.split(r"[.;]\s+", value) if s.strip()]
        return sentences if sentences else [value.strip()]
    return [str(value).strip()]


def _competency_field_to_stored_text(value: Any) -> Optional[str]:
    """ORM columns are Text; clients may send weighted lists — serialize like template routes."""
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s if s else None
    if isinstance(value, list):
        if not value:
            return None
        # Handle Pydantic models by converting to dicts
        items = [item.model_dump() if hasattr(item, 'model_dump') else item for item in value]
        return json.dumps(items)
    if isinstance(value, dict):
        if not value:
            return None
        return json.dumps(value)
    # Handle single Pydantic model
    if hasattr(value, 'model_dump'):
        return json.dumps(value.model_dump())
    return str(value)


def _proportionally_scale_integer_weights(weights: List[int], target: int = 100) -> List[int]:
    """
    Map weights to positive integers that sum exactly to `target`, preserving ratios.
    Used for sections OTHER than core/functional competencies.
    """
    n = len(weights)
    if n == 0:
        return []
    if n == 1:
        return [target]
    total = sum(weights)
    if total <= 0:
        base, rem = divmod(target, n)
        return [base + (1 if i < rem else 0) for i in range(n)]
    if total == target:
        return list(weights)
    scaled = [target * w / total for w in weights]
    floors = [int(s) for s in scaled]
    remainder = target - sum(floors)
    order = sorted(range(n), key=lambda i: scaled[i] - floors[i], reverse=True)
    for k in range(remainder):
        floors[order[k]] += 1
    return floors


def _calculate_total_weight(weighted_items: List[dict]) -> int:
    """Calculate total weight of weighted items."""
    return sum(item.get("weight", 0) for item in weighted_items)


def _should_preserve_weights(section: str) -> bool:
    """Core and functional competencies preserve input weights; others scale."""
    if not section:
        return True
    normalized = _normalize_section_key(section)
    if normalized.startswith("section_"):
        return True
    return normalized in {"core_competencies", "functional_competencies"}


def _to_weighted_points(value: Any, section: str = None) -> List[dict]:
    """Converts a value into a list of points with associated weights.
    For core/functional competencies: preserves input weights exactly.
    For other sections: scales weights to sum to 100.
    """
    if isinstance(value, list) and value:
        parsed_list = []
        for i in value:
            if isinstance(i, str):
                parsed = _parse_python_dict_str(i.strip())
                if parsed:
                    parsed_list.append(parsed)
                else:
                    parsed_list.append(i)
            else:
                parsed_list.append(i)
        value = parsed_list

    if isinstance(value, list) and value and all(isinstance(i, dict) and ("point" in i or "text" in i or "title" in i) and "weight" in i for i in value):
        normalized: List[dict] = []
        for i in value:
            point = str(i.get("point") or i.get("text") or i.get("title") or "").strip()
            if not point:
                continue
            try:
                weight = int(i.get("weight"))
            except (TypeError, ValueError):
                weight = 0
            
            entry = {"point": point, "weight": max(1, min(100, weight))}
            if "edited_by_color" in i:
                entry["edited_by_color"] = i["edited_by_color"]
            normalized.append(entry)
        if normalized:
            # Only scale if NOT a competency section (preserve input weights for competencies)
            if not _should_preserve_weights(section):
                ws = [item["weight"] for item in normalized]
                for item, nw in zip(normalized, _proportionally_scale_integer_weights(ws, 100)):
                    item["weight"] = nw
            return normalized
    points = _extract_points(value)
    if not points:
        return []
    base = 100 // len(points)
    rem = 100 % len(points)
    weighted: List[dict] = []
    for idx, point in enumerate(points):
        weighted.append({"point": point, "weight": base + (1 if idx < rem else 0)})
    return weighted


def _normalize_weighted_sections(content: dict) -> dict:
    """Ensures all weighted sections in the content are properly formatted.
    Loops dynamically over stable-keyed sections and normalizes those of type 'points' or 'weighted_list'.
    """
    normalized = dict(content or {})
    if any(k.startswith("section_") for k in normalized.keys()):
        for key, value in list(normalized.items()):
            if key.startswith("section_") and isinstance(value, dict):
                sec_type = value.get("type", "text")
                if sec_type in ("points", "weighted_list"):
                    value["section_data"] = _to_weighted_points(value.get("section_data"), key)
    else:
        for section in WEIGHTED_SECTIONS:
            if section in normalized:
                normalized[section] = _to_weighted_points(normalized.get(section), section)
    return normalized


def _content_word_count(content: dict) -> int:
    """Calculates the total character count for the given job description content."""
    chunks: List[str] = []
    for key, value in (content or {}).items():
        if _is_content_lock_entry(key, value):
            continue
        if key.startswith("section_") and isinstance(value, dict) and "section_data" in value:
            sec_data = value["section_data"]
            sec_type = value.get("type", "text")
            if sec_type in ("points", "weighted_list"):
                for item in _to_weighted_points(sec_data):
                    chunks.append(str(item.get("point", "")))
            elif isinstance(sec_data, list):
                chunks.extend([str(v) for v in sec_data])
            else:
                chunks.append(str(sec_data or ""))
        else:
            if key in WEIGHTED_SECTIONS:
                for item in _to_weighted_points(value):
                    chunks.append(str(item.get("point", "")))
            elif isinstance(value, list):
                chunks.extend([str(v) for v in value])
            else:
                chunks.append(str(value or ""))
    return len(" ".join(chunks))


def _as_text(value: Any) -> str:
    """Converts weighted points or lists into a plain text representation."""
    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            return "; ".join(
                f"{str(i.get('point') or i.get('text') or '').strip()} ({int(i.get('weight', 0))}%)"
                for i in value
                if str(i.get("point") or i.get("text") or "").strip()
            )
        return "; ".join(str(v) for v in value)
    if isinstance(value, dict):
        return str(value)
    return str(value or "")


def _as_markdown_weight_table(value: Any) -> str:
    """Generates a markdown table representing weighted points."""
    rows = _to_weighted_points(value)
    if not rows:
        return ""
    out = ["| Description | Weight |", "|---|---:|"]
    for r in rows:
        out.append(f"| {r.get('point','')} | {r.get('weight', 0)}% |")
    return "\n".join(out)


def _can_access_jd(current_user: User, jd: JobDescription) -> bool:
    """
    Explicit role-based access control for job descriptions.
    Prevents privilege escalation through complex OR conditions.
    """
    if is_super_admin_role(current_user.role):
        return True
    if jd.creator_id == current_user.id:
        return True
    if current_user.org_id != jd.org_id:
        return False
    role_lower = (current_user.role or "").lower()
    if role_lower in {"admin", "manager", "hr"}:
        return True
    else:
        return False


def _can_view_jd(current_user: User | CandidateUser, jd: JobDescription) -> bool:
    """Allow same-org viewing for public_view JDs while preserving restricted access for others."""
    if jd.creator_id == current_user.id:
        return True
    if current_user.org_id != jd.org_id:
        return False
    if jd.status == "public_view":
        return True
    return _can_access_jd(current_user, jd)


def _can_export_jd(current_user: User, jd: JobDescription) -> bool:
    """
    Separate export authorization with stricter access control.
    Export permissions are more restrictive than view permissions.
    """
    if is_super_admin_role(current_user.role):
        return True
    if jd.creator_id == current_user.id:
        return True
    if not current_user.org_id or not jd.org_id or current_user.org_id != jd.org_id:
        return False
    if current_user.role == "Admin":
        return True
    elif current_user.role == "Manager":
        return True
    elif current_user.role == "HR":
        return False
    else:
        return False


async def _get_jd_for_export(db: AsyncSession, jd_id: UUID, current_user: User) -> JobDescription:
    """Resolve a JD for export using the same access model as other JD endpoints."""
    if is_super_admin_role(current_user.role):
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd:
            raise HTTPException(status_code=404, detail="JD not found")
        return jd
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    user_id = None if current_user.role == "Admin" else current_user.id
    jd = await jd_repo.get_jd_by_id_and_org(db, jd_id, current_user.org_id, user_id)
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found")
    if not _can_access_jd(current_user, jd):
        raise HTTPException(status_code=404, detail="JD not found")
    return jd


async def _clear_user_jds_cache(current_user: User):
    """Clear all cached query results for the current user and their org."""
    cache_scope = str(current_user.org_id) if current_user.role == "Admin" else str(current_user.id)
    await cache_service.clear_cache_by_pattern(f"query:jds_{cache_scope}_*")
    await cache_service.clear_cache_by_pattern(f"query:jds_v2_{cache_scope}_*")
    await cache_service.clear_cache_by_pattern(f"query:*{str(current_user.id)}*")
    await cache_service.clear_cache_by_pattern(f"query:*{str(current_user.org_id)}*")


async def _resolve_logo_path_for_export(
    db: AsyncSession,
    image_url: Optional[str],
    org_id: Optional[UUID],
) -> Optional[str]:
    """Resolve stored/API logo URLs to a local absolute path for PDF/Word export."""
    from app.core.file_storage import resolve_image_path_for_export

    if not image_url:
        return None

    resolved_url = image_url
    api_match = re.search(
        r"/organizations/images/([0-9a-f-]{36})/(?:file|download)?",
        image_url,
        re.I,
    )
    if api_match and org_id:
        image_id = UUID(api_match.group(1))
        library_image = await org_img_repo.get_org_image_by_id(db, image_id=image_id, org_id=org_id)
        if library_image and library_image.image_url:
            resolved_url = library_image.image_url

    local_path = resolve_image_path_for_export(resolved_url)
    if local_path:
        return str(local_path)

    # Only pass through external HTTP URLs (not our authenticated API routes).
    if resolved_url.startswith(("http://", "https://")):
        if "/organizations/images/" in resolved_url:
            logger.warning("Export logo unavailable — authenticated API URL cannot be fetched: %s", resolved_url)
            return None
        return resolved_url

    logger.warning("Export logo file not found for URL: %s", resolved_url)
    return None


async def _get_jd_logo_url(db: AsyncSession, jd: JobDescription, org_id: UUID) -> Optional[str]:
    """Resolves logo URL with 3-layer priority: JD -> Org Primary -> Org Library."""
    raw_url: Optional[str] = None
    # 1. Check JD specific image
    if jd.image_url:
        raw_url = jd.image_url
    else:
        # 2. Check Organization primary logo
        org = await org_repo.get_organization_by_id(db, org_id)
        if org and org.image_url:
            raw_url = org.image_url
        else:
            # 3. Check Org Image library (most recent)
            org_images = await org_img_repo.list_org_images(db, org_id)
            if org_images:
                raw_url = org_images[0].get("image_url")

    return await _resolve_logo_path_for_export(db, raw_url, org_id)


def _jd_to_export_payload(jd: JobDescription, image_url: Optional[str]) -> dict:
    """Build export dict from the persisted JD row (PDF/Word meta + content)."""
    return {
        "title": jd.title,
        "company_name": jd.company_name,
        "job_id": jd.job_id,
        "job_family": jd.job_family,
        "job_level": jd.job_level,
        "department": jd.department,
        "location": jd.location,
        "city": jd.city,
        "country_code": jd.country_code,
        "industry": jd.industry,
        "seniority": jd.seniority,
        "employment_type": jd.employment_type or "Full-Time",
        "salary_range": jd.salary_range,
        "salary_symbol": jd.salary_symbol,
        "salary_min_value": jd.salary_min_value,
        "salary_max_value": jd.salary_max_value,
        "salary_period": jd.salary_period,
        "content": jd.content or {},
        "image_url": image_url,
    }


@router.post("/check_job_id", response_model=JobIdCheckResponse)
async def check_job_id_duplicates(payload: JobIdCheckRequest,db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user)):
    """Checks for existing job IDs to prevent duplicate creation."""
    try:
        job_id = payload.job_id.strip()
        matches = await jd_repo.get_jds_by_job_id_for_user(db, job_id, current_user.id)
        return {
            "job_id": job_id,
            "exists": len(matches) > 0,
            "count": len(matches),
            "jd_ids": [jd.id for jd in matches],
            "records": [
                {
                    "jd_id": jd.id,
                    "title": jd.title,
                    "status": jd.status,
                    "created_at": jd.created_at,
                }
                for jd in matches
            ],
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("check_job_id_duplicates failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check job_id duplicates.")


@router.get("/word_limits", response_model=UserWordLimitsResponse)
async def get_word_limits(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Returns the current word count limits for the signed-in user."""
    try:
        row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        return UserWordLimitsResponse(**jd_repo.word_limits_from_model(row))
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("get_word_limits failed", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch word limits")


@router.patch("/word_limits", response_model=UserWordLimitsResponse)
async def patch_word_limits(patch: UserWordLimitsPatch,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Updates the word count limits for the current user."""
    try:
        row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        update_data = {}
        if patch.summary:
            update_data["summary_min"] = patch.summary.min
            update_data["summary_max"] = patch.summary.max
        if patch.key_duties:
            update_data["key_duties_min"] = patch.key_duties.min
            update_data["key_duties_max"] = patch.key_duties.max
        if patch.core_competencies:
            update_data["core_competencies_min"] = patch.core_competencies.min
            update_data["core_competencies_max"] = patch.core_competencies.max
        if patch.functional_competencies:
            update_data["functional_competencies_min"] = patch.functional_competencies.min
            update_data["functional_competencies_max"] = patch.functional_competencies.max
        if patch.qualifications_required:
            update_data["qualifications_required_min"] = patch.qualifications_required.min
            update_data["qualifications_required_max"] = patch.qualifications_required.max
        if patch.qualifications_preferred:
            update_data["qualifications_preferred_min"] = patch.qualifications_preferred.min
            update_data["qualifications_preferred_max"] = patch.qualifications_preferred.max
        if patch.eeo_statement:
            update_data["eeo_statement_min"] = patch.eeo_statement.min
            update_data["eeo_statement_max"] = patch.eeo_statement.max
        row = await jd_repo.update_user_word_limits(db, row, update_data)
        return UserWordLimitsResponse(**jd_repo.word_limits_from_model(row))
    except Exception as exc:
        log_exception_one_line("patch_word_limits failed", exc)
        await jd_repo.rollback_db(db)
        raise HTTPException(status_code=500, detail="Failed to update word limits")


@router.post("/skeleton", response_model=JobDescriptionResponse, summary="Create Skeleton Job Description", description="Creates an empty skeleton Job Description which can be filled in later.")
async def create_skeleton_jd(payload: JobDescriptionSkeletonCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        new_jd = JobDescription(
            title=payload.title,
            org_id=current_user.org_id,
            industry=payload.industry,
            country_code="US",
            input_prompt="Skeleton created manually",
            generation_mode="manual",
            status="draft",
            content={},
            sections_metadata={},
            creator_id=current_user.id,
            is_main=True,
            eeoc_flags=[],
            eeoc_cleared=False
        )
        db.add(new_jd)
        await db.commit()
        await db.refresh(new_jd)
        # Invalidate cache if needed
        await _clear_user_jds_cache(current_user)
        return JobDescriptionResponse.model_validate(new_jd)
    except Exception as exc:
        await db.rollback()
        log_exception_one_line("create_skeleton_jd failed", exc)
        raise HTTPException(status_code=500, detail="Failed to create skeleton job description.")

@router.post("/create_from_template")
async def create_jd_from_template(data: JDCreateFromTemplate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Creates a new job description based on a predefined template."""
    try:
        template_context = f"""\
TEMPLATE INPUT:
- Summary: {data.summary}
- Responsibilities: {', '.join(data.responsibilities or [])}
- Qualifications required: {data.qualifications.get('required', [])}
- Qualifications preferred: {data.qualifications.get('preferred', [])}
- EEO statement: {data.eeo_statement}
- Compliance tag: {data.compliance_tag}
- Additional context: {data.additional_context}

TASK:
Generate detailed content for:
1) essential_duties_and_responsibilities
2) core_competencies
3) functional_competencies
"""
        payload = {
            "title": data.title,
            "company_name": "Our company",
            "job_id": "",
            "job_family": data.department,
            "job_level": data.job_level if data.job_level in ("L1","L2","L3","L4","L5") else None,
            "department": data.department,
            "location": data.location,
            "city": data.city,
            "country_code": "US",
            "seniority": data.seniority,
            "employment_type": data.employment_type,
            "industry": data.industry,
            "key_skills_and_requirements": data.key_skills,
            "core_competencies": "",
            "functional_competencies": "",
            "salary_range": data.salary_range or "",
            "additional_context": template_context,
        }
        word_limits_row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        payload["word_count_limits"] = jd_repo.word_limits_from_model(word_limits_row)
        generated_json = await generate_job_description(payload)
        if "error" in generated_json:
            raise HTTPException(status_code=500, detail=generated_json["error"])
        jd_content = {
            "summary": data.summary,
            "key_duties": data.responsibilities,
            "qualifications_required": data.qualifications.get("required", []),
            "qualifications_preferred": data.qualifications.get("preferred", []),
            "eeo_statement": data.eeo_statement,
            "essential_duties_and_responsibilities": generated_json.get("essential_duties_and_responsibilities")
            or " ".join(data.responsibilities),
            "core_competencies": generated_json.get("core_competencies")
            or f"Strong leadership abilities with excellent decision-making skills for {data.seniority or 'professional'} level roles.",
            "functional_competencies": generated_json.get("functional_competencies")
            or f"Advanced technical expertise in {data.industry} domain with proficiency in modern tools.",
        }
        jd_content = _normalize_weighted_sections(jd_content)
        jd_content = _build_content_with_view_locks(jd_content)
        input_prompt = f"Template: {data.title} | {data.industry}"
        new_jd = JobDescription(
            creator_id=current_user.id,
            org_id=current_user.org_id,
            title=data.title,
            industry=data.industry,
            department=data.department,
            location=data.location,
            city=data.city,
            country_code="US",
            seniority=data.seniority,
            employment_type=data.employment_type,
            salary_range=data.salary_range,
            key_skills=data.key_skills,
            additional_context=data.additional_context,
            core_competencies=json.dumps(jd_content.get("core_competencies")) if jd_content.get("core_competencies") else None,
            functional_competencies=json.dumps(jd_content.get("functional_competencies")) if jd_content.get("functional_competencies") else None,
            input_prompt=input_prompt,
            generation_mode="template",
            content=jd_content,
            eeoc_flags=[],
            eeoc_cleared=False,
            status="draft",
            model_used=settings.default_lexy_model_name,
            word_count=_content_word_count(jd_content),
        )
        new_jd = await jd_repo.create_job_description(db, jd=new_jd)
        await auth_repo.increment_user_stat(db, current_user.id, "jds_created")
        await _clear_user_jds_cache(current_user)
        # Re-fetch with eager-loaded creator to avoid MissingGreenlet error on serialization
        new_jd_loaded = await jd_repo.get_jd_by_id(db, new_jd.id)
        if not new_jd_loaded:
            raise HTTPException(status_code=500, detail="Failed to retrieve created JD")
        return JobDescriptionResponse.model_validate(new_jd_loaded)
    except Exception as exc:
        log_exception_one_line("create_jd_from_template failed", exc)
        raise HTTPException(status_code=500, detail="Failed to create JD from template")


@router.post("/generate", response_model=dict,summary="Generate Comprehensive Job Description",description=("Generates a comprehensive job description using AI with the new template structure. "))
@limiter.limit("30/minute")
async def generate_jd(request: Request, data: JDGenerateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Generates a comprehensive job description using advanced processing."""
    try:
        logger.info(f"Starting JD generation for user {current_user.id} with org_id {current_user.org_id}")
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="User has no company assigned.")
        effective_country_code = data.country_code or "US"
        effective_salary_range = data.salary_range
        if not effective_salary_range:
            if data.salary_symbol and data.salary_min_value and data.salary_max_value:
                unit = str(data.salary_period or "").strip()
                effective_salary_range = f"{data.salary_symbol}{data.salary_min_value}{unit}-{data.salary_symbol}{data.salary_max_value}{unit}"
            elif data.salary_symbol and data.salary_min_value:
                unit = str(data.salary_period or "").strip()
                effective_salary_range = f"{data.salary_symbol}{data.salary_min_value}{unit}+"

        payload = data.model_dump(exclude={"user_sections", "sections_order"})
        payload["country_code"] = effective_country_code
        payload["salary_range"] = effective_salary_range
        word_limits_row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        payload["word_count_limits"] = jd_repo.word_limits_from_model(word_limits_row)

        try:
            lexy_model, provider_model = settings.resolve_generation_model(data.model_name)
        except ValueError as exc:
            raise HTTPException(status_code=400,detail=f"Model '{exc.args[0]}' is not in the allowed list. Available models: {', '.join(settings.available_lexy_models_list[:5])}...")

        try:
            generated_json = await generate_job_description(payload, provider_model)
            logger.info(f"Primary model {provider_model} succeeded (lexy={lexy_model})")
        except Exception as exc:
            if getattr(exc, "status_code", None) == 422:
                logger.warning(f"Guardrail violation: {exc.detail}")
                raise exc

            error_msg = str(exc).lower()
            logger.error(f"Primary model failed with error: {error_msg}")

            if ("temporarily rate-limited upstream" in error_msg or
                "rate limit hit after all retries" in error_msg or
                (hasattr(exc, 'status_code') and exc.status_code == 429 and "temporarily rate-limited upstream" in str(exc.detail)) or
                (hasattr(exc, 'detail') and "temporarily rate-limited upstream" in str(exc.detail))):
                logger.warning(f"Upstream rate limit for {provider_model}, trying fallback model")

                fallback_models = [
                    "mistral-medium-latest",
                    "mistral-tiny-latest",
                    "ministral-8b-latest"
                ]

                generated_json = None
                for fallback_model in fallback_models:
                    try:
                        logger.info(f"Trying fallback model: {fallback_model}")
                        generated_json = await generate_job_description(payload, fallback_model)
                        logger.info(f"Fallback model {fallback_model} succeeded")
                        break
                    except Exception as fallback_exc:
                        logger.warning(f"Fallback model {fallback_model} failed: {fallback_exc}")
                        continue

                if not generated_json:
                    logger.error("All models failed, returning basic JD structure")
                    generated_json = {
                        "summary": f"We are experiencing technical difficulties with AI models. Please try again in a few minutes. Your job for {data.title} has been saved as a draft.",
                        "essential_duties_and_responsibilities": "Due to temporary AI service issues, please regenerate this job description later. The system is working to resolve the problem.",
                        "key_duties": [{"point": "Job responsibilities will be generated", "weight": 100}],
                        "core_competencies": [{"point": "Professional skills required", "weight": 100}],
                        "functional_competencies": [{"point": "Technical skills will be specified", "weight": 100}],
                        "qualifications_required": [{"point": "Requirements will be generated", "weight": 100}],
                        "qualifications_preferred": [{"point": "Preferred qualifications will be generated", "weight": 100}],
                        "eeo_statement": f"{data.company_name or 'Our company'} is an equal opportunity employer.",
                        "eeoc_flags": []
                    }
            else:
                logger.error(f"Non-rate-limit error: {exc}")
                raise HTTPException(status_code=500, detail=f"AI service error: {str(exc)}")

        if not generated_json or "error" in generated_json:
            logger.warning("Generated JSON is invalid, using fallback structure")
            generated_json = {
                "summary": f"Job description for {data.title} has been created. Please review and edit as needed.",
                "essential_duties_and_responsibilities": "Job responsibilities and duties will be added here.",
                "key_duties": [{"point": "Key responsibilities", "weight": 100}],
                "core_competencies": [{"point": "Core competencies", "weight": 100}],
                "functional_competencies": [{"point": "Functional skills", "weight": 100}],
                "qualifications_required": [{"point": "Required qualifications", "weight": 100}],
                "qualifications_preferred": [{"point": "Preferred qualifications", "weight": 100}],
                "eeo_statement": f"{data.company_name or 'Our company'} is an equal opportunity employer.",
                "eeoc_flags": []
            }

        generated_content = {
            "summary": generated_json.get("summary", ""),
            "essential_duties_and_responsibilities": generated_json.get("essential_duties_and_responsibilities", ""),
            "key_duties": generated_json.get("key_duties", []),
            "core_competencies": generated_json.get("core_competencies", ""),
            "functional_competencies": generated_json.get("functional_competencies", ""),
            "qualifications_required": generated_json.get("qualifications_required", []),
            "qualifications_preferred": generated_json.get("qualifications_preferred", []),
            "eeo_statement": generated_json.get("eeo_statement", f"{data.company_name or 'Our company'} is an equal opportunity employer."),
        }

        generated_content = _normalize_weighted_sections(generated_content)
        generated_content = _build_content_with_view_locks(generated_content)

        jd_context = {
            "title": data.title,
            "company_name": data.company_name,
            "job_id": data.job_id,
            "job_family": data.job_family,
            "job_level": data.job_level,
            "department": data.department,
            "location": data.location,
            "city": data.city,
            "country_code": effective_country_code,
            "seniority": data.seniority,
            "employment_type": data.employment_type or "Full-Time",
            "industry": data.industry,
            "salary_range": effective_salary_range,
            "key_skills_and_requirements": data.key_skills_and_requirements,
            "additional_context": data.additional_context,
        }
        generated_content = await _merge_user_sections_into_content(
            generated_content,
            data.user_sections,
            data.sections_order,
            jd_context,
            provider_model,
        )

        pre_stable_metadata = {
            "dynamic_sections": _dynamic_sections_from_user_specs(data.user_sections),
        }
        stable_payload = _enforce_stable_jd_payload(generated_content, pre_stable_metadata)
        generated_content = stable_payload["content"]
        sections_metadata = stable_payload["sections_metadata"]
        eeoc_flags = generated_json.get("eeoc_flags", [])

        input_prompt = f"Title: {data.title} | {data.industry}"

        new_jd = JobDescription(
            creator_id=current_user.id,
            org_id=current_user.org_id,
            title=data.title,
            company_name=data.company_name,
            job_id=data.job_id,
            job_family=data.job_family,
            job_level=data.job_level if data.job_level in ("L1","L2","L3","L4","L5") else None,
            department=data.department,
            location=data.location,
            city=data.city,
            country_code=effective_country_code,
            seniority=data.seniority,
            employment_type=data.employment_type or "Full-Time",
            industry=data.industry,
            salary_range=effective_salary_range,
            salary_symbol=data.salary_symbol,
            salary_min_value=data.salary_min_value,
            salary_max_value=data.salary_max_value,
            salary_period=data.salary_period,
            key_skills=data.key_skills_and_requirements,
            core_competencies=_competency_field_to_stored_text(data.core_competencies),
            functional_competencies=_competency_field_to_stored_text(data.functional_competencies),
            additional_context=data.additional_context,
            input_prompt=input_prompt,
            generation_mode="ai",
            model_used=lexy_model,
            content=generated_content,
            sections_metadata=sections_metadata,
            eeoc_flags=eeoc_flags,
            eeoc_cleared=False,
            status="draft",
            word_count=generated_json.get("word_count") or _content_word_count(generated_content)
        )

        new_jd = await jd_repo.create_job_description(db, jd=new_jd)
        await auth_repo.increment_user_stat(db, current_user.id, "jds_created")
        await _clear_user_jds_cache(current_user)

        return {
            "message": "JD generated successfully",
            "jd_id": str(new_jd.id),
            "input_data": {
                "title": data.title,
                "company_name": data.company_name,
                "job_id": data.job_id,
                "job_family": data.job_family,
                "job_level": data.job_level,
                "industry": data.industry,
                "department": data.department,
                "location": data.location,
                "city": data.city,
                "country_code": effective_country_code,
                "seniority": data.seniority,
                "employment_type": data.employment_type or "Full-Time",
                "salary_range": effective_salary_range,
                "salary_symbol": data.salary_symbol,
                "salary_min_value": data.salary_min_value,
                "salary_max_value": data.salary_max_value,
                "salary_period": data.salary_period,
                "key_skills_and_requirements": data.key_skills_and_requirements,
                "core_competencies": data.core_competencies,
                "functional_competencies": data.functional_competencies,
                "additional_context": data.additional_context,
            },
            "job_description": generated_content,
            "sections_metadata": sections_metadata,
            "eeoc_flags": eeoc_flags,
            "word_count": new_jd.word_count,
        }
    except HTTPException:
        await jd_repo.rollback_db(db)
        raise
    except Exception as exc:
        log_exception_one_line("generate_jd failed", exc)
        await jd_repo.rollback_db(db)
        raise HTTPException(status_code=500, detail=f"Failed to generate job description: {str(exc)}")


@router.post("/create_from_template_with_image",include_in_schema=False)
async def create_jd_from_template_with_image(data: str = Form(...),
    image: UploadFile | None = File(None),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Creates a job description from a template with an optional image upload."""
    try:
        payload = JDCreateFromTemplate.model_validate(json.loads(data))
        jd_image_url = await save_image_to_disk(image=image, kind="job_descriptions")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if jd_image_url is None and current_user.org_id:
        org = await org_repo.get_organization_by_id(db, current_user.org_id)
        jd_image_url = org.image_url if org else None
    resp = await create_jd_from_template(payload, db=db, current_user=current_user)
    await jd_repo.update_jd_image(db, resp.id, jd_image_url, org_id=current_user.org_id)
    return resp


@router.post("/generate_with_image",include_in_schema=False)
async def generate_jd_with_image(data: str = Form(...),
    image: UploadFile | None = File(None),db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user)):
    """Generates a job description with an optional image upload."""
    try:
        payload = JDGenerateRequest.model_validate(json.loads(data))
        jd_image_url = await save_image_to_disk(image=image, kind="job_descriptions")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    result = await generate_jd(payload, db=db, current_user=current_user)
    jd_id = result.get("jd_id")
    if jd_id:
        await jd_repo.update_jd_image(db, UUID(str(jd_id)), jd_image_url, org_id=current_user.org_id)
    result["image_url"] = jd_image_url
    return result

@router.get("/org/list_jd-ids", response_model=List[OrgJdIdResponse])
async def get_org_jd_ids(jd_status: Optional[str] = Query(None, alias="status"),
    employment_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000), 
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Staff with org JD access: Returns jd_id, status, and public/original JD relation IDs for org JDs."""
    if current_user.role not in ORG_JD_ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only Admins, HR, and Managers can access org-wide JD IDs")
    try:
        await jd_repo.sync_successful_csod_push_statuses(db, current_user.org_id)
        jds = await jd_repo.list_jds_for_org(db, current_user.org_id, status=jd_status, employment_type=employment_type, skip=skip, limit=limit)
        await _attach_public_and_original_jd_ids(db, jds)
        return [OrgJdIdResponse(jd_id=str(jd.id), status=jd.status, original_jd_id=jd.original_jd_id, public_jd_id=jd.public_jd_id) for jd in jds]
    except Exception as exc:
        log_exception_one_line("get_org_jd_ids failed", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve JD")




@router.get("/org/public_jds", response_model=List[OrgJdSummaryResponse])
async def get_org_public_jds(
    employment_type: Optional[str] = Query(None),
    status: Optional[str] = Query("public_view", description="Filter by public_view or archive_job"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User | CandidateUser = Depends(get_current_user),
):
    """Return organization job openings (public_view or archive_job)."""
    org_id = getattr(current_user, "org_id", None)
    if org_id is None:
        raise HTTPException(status_code=400, detail="User has no organization assigned")
    resolved_status = status if status in {"public_view", "archive_job"} else "public_view"
    try:
        jds = await jd_repo.list_public_jds_for_org(
            db, org_id, employment_type=employment_type, skip=skip, limit=limit, status=resolved_status
        )
        await _attach_public_and_original_jd_ids(db, jds)
        return [OrgJdSummaryResponse.model_validate(jd) for jd in jds]
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("get_org_public_jds failed", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve public job descriptions")


@router.get("/models/available")
async def get_available_models(current_user: User = Depends(get_current_regular_user)):
    """Return list of available AI models for frontend dropdown (Lexy display names only)."""
    try:
        return {
            "models": settings.available_lexy_models_list,
            "default": settings.default_lexy_model_name,
            "count": len(settings.available_lexy_models_list),
        }
    except Exception:
        logger.exception("Failed to get available models")
        raise HTTPException(status_code=500, detail="Failed to retrieve available models")

@router.get("/", response_model=List[JobDescriptionResponse])
async def get_my_jds(jd_status: Optional[str] = Query(None, alias="status"),
    employment_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest_first"),
    skip: int = Query(0, ge=0), limit: int = Query(1000, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Retrieves a list of job descriptions for the current user or organization."""
    try:
        user_id = None if (current_user.role == "Admin" or is_super_admin_role(current_user.role)) else current_user.id
        order_by = "updated" if sort == "newest_first" else None
        jds = await jd_repo.list_jds_for_org(db, current_user.org_id, user_id=user_id, status=jd_status, search=search, order_by=order_by, employment_type=employment_type, skip=skip, limit=limit)
        await _attach_public_and_original_jd_ids(db, jds)
        jd_responses = [JobDescriptionResponse.model_validate(jd) for jd in jds]
        return jd_responses
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as exc:
        log_exception_one_line("get_my_jds failed", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve job descriptions.")

@router.get("/{jd_id}", response_model=JobDescriptionResponse)
async def get_jd(jd_id: UUID, mode: Optional[str] = Query(None), db: AsyncSession = Depends(get_db), current_user: User | CandidateUser = Depends(get_current_user)):
    """Retrieves detailed information for a specific job description.
    
    **Org-only public_view access:** If JD status is 'public_view', any authenticated member of the same organization may access it.
    **Authenticated access:** For other statuses, only users with explicit JD permissions can access.
    """
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or jd.deleted_at is not None:
            raise HTTPException(status_code=404, detail="JD not found")
        
        if not _can_view_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")

        raw_content = _raw_jd_content(jd)
        sanitized_content, sanitized_meta = _sanitize_stable_content(raw_content, jd.sections_metadata)
        normalized_content = _normalize_content_view_locks(sanitized_content)
        if normalized_content != raw_content or sanitized_meta != (jd.sections_metadata or {}):
            if sanitized_meta != (jd.sections_metadata or {}):
                # Preserve generation_mode when sanitizing metadata
                await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": sanitized_meta})
                await jd_repo.update_job_description(db, jd=jd, update_data={"generation_mode": jd.generation_mode})
            word_count = jd.word_count if jd.word_count is not None else _content_word_count(normalized_content)
            jd = await jd_repo.autosave_jd_content(db, jd=jd, content=normalized_content, word_count=word_count)
        elif normalized_content != raw_content:
            word_count = jd.word_count if jd.word_count is not None else _content_word_count(normalized_content)
            jd = await jd_repo.autosave_jd_content(db, jd=jd, content=normalized_content, word_count=word_count)

        if jd.parent_jd_id is not None:
            jd.original_jd_id = jd.parent_jd_id
            main_version_history = await db.scalar(select(JobDescription.version_history).where(JobDescription.id == jd.parent_jd_id, JobDescription.deleted_at.is_(None)))
            jd.version_history = list(main_version_history) if main_version_history else []
        elif jd.status != "public_view":
            public_clone_id = await db.scalar(select(JobDescription.id).where(JobDescription.parent_jd_id == jd.id,JobDescription.status == "public_view",JobDescription.deleted_at.is_(None)).order_by(desc(JobDescription.updated_at)).limit(1))
            if public_clone_id:
                jd.public_jd_id = public_clone_id

        return JobDescriptionResponse.model_validate(jd)

    except HTTPException:
        # Re-raise HTTP exceptions (like 404) as-is
        raise
    except Exception as exc:
        log_exception_one_line("get_jd failed", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve job description.")


@router.post("/{jd_id}/revert-to-draft", response_model=JobDescriptionResponse)
async def revert_jd_to_draft(
    jd_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | CandidateUser = Depends(get_current_user),
):
    """Revert a finalized JD back to draft status (explicit mutation — never via GET)."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or jd.deleted_at is not None:
            raise HTTPException(status_code=404, detail="JD not found")
        if not _can_view_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        if jd.status != "final":
            raise HTTPException(status_code=400, detail="Only finalized JDs can be reverted to draft.")

        if jd.org_id:
            from app.repository import jd_workflow_repository as wf_repo
            active_run = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=jd.org_id)
            if active_run:
                raise HTTPException(
                    status_code=409,
                    detail="Cannot edit this JD — it is currently under workflow review. The reviewer must approve or decline it first.",
                )

        jd = await jd_repo.revert_jd_to_draft(db, jd=jd)
        await cache_service.invalidate_jd_cache(str(jd_id))
        await _clear_user_jds_cache(current_user)
        return JobDescriptionResponse.model_validate(jd)
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("revert_jd_to_draft failed", exc)
        raise HTTPException(status_code=500, detail="Failed to revert job description.")

@router.delete("/{jd_id}")
async def delete_job_description(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Soft deletes a job description."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or jd.deleted_at is not None or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        await jd_repo.soft_delete_jd(db, jd=jd)
        await cache_service.invalidate_jd_cache(str(jd_id))
        # Comprehensive cache clearing for deleted JD
        await _clear_user_jds_cache(current_user)
        # Also clear any search or filter caches
        await cache_service.clear_cache_by_pattern("search:*")
        await cache_service.clear_cache_by_pattern("filter:*")
        return {"message": "JD deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("delete_job_description failed", exc)
        raise HTTPException(status_code=500, detail="Failed to delete job description.")

@router.patch("/{jd_id}/autosave")
async def autosave_jd(jd_id: UUID, content: JDAutosaveRequest = Body(...), db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user)):
    """Periodically saves the current state of a job description draft."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        # Copy camelCase fields to snake_case if present
        if content.companyName and not content.company_name:
            content.company_name = content.companyName
        if content.jobId and not content.job_id:
            content.job_id = content.jobId
        if content.jobFamily and not content.job_family:
            content.job_family = content.jobFamily
        if content.jobLevel and not content.job_level:
            content.job_level = content.jobLevel
        if content.countryCode and not content.country_code:
            content.country_code = content.countryCode
        if content.skills and not content.key_skills:
            content.key_skills = content.skills
        if content.context and not content.additional_context:
            content.additional_context = content.context
        if content.coreCompetencies and not content.core_competencies:
            content.core_competencies = content.coreCompetencies
        if content.functionalCompetencies and not content.functional_competencies:
            content.functional_competencies = content.functionalCompetencies

        # Extract qualifications
        qual_req = content.qualifications_required
        qual_pref = content.qualifications_preferred
        if content.qualifications:
            if content.qualifications.get("required") is not None:
                qual_req = content.qualifications.get("required")
            if content.qualifications.get("preferred") is not None:
                qual_pref = content.qualifications.get("preferred")

        # Exclude all column fields and custom fields config from content model dump
        exclude_fields = {
            "section_labels", "dynamic_sections", "sections_metadata", "sections_order", "generation_mode",
            "title", "company_name", "companyName", "job_id", "jobId",
            "job_family", "jobFamily", "job_level", "jobLevel", "department",
            "location", "city", "country_code", "countryCode", "seniority",
            "industry", "salary_range", "salary_symbol", "salary_min_value",
            "salary_max_value", "salary_period", "employment_type",
            "key_skills", "skills", "additional_context", "context",
            "qualifications", "coreCompetencies", "functionalCompetencies"
        }
        normalized_content = _normalize_weighted_sections(content.model_dump(exclude_none=True, exclude=exclude_fields))
        
        # Add qualifications to normalized_content if they are present
        if qual_req is not None:
            normalized_content["qualifications_required"] = _to_weighted_points(qual_req)
        if qual_pref is not None:
            normalized_content["qualifications_preferred"] = _to_weighted_points(qual_pref)

        if current_user.id != jd.creator_id:
            color = current_user.color_code or "#000000"
            for key, val in normalized_content.items():
                if isinstance(val, list) and val:
                    if all(isinstance(i, dict) for i in val):
                        for item in val:
                            item["edited_by_color"] = color
        new_content = {**_raw_jd_content(jd), **normalized_content}
        new_content = _normalize_content_view_locks(new_content)
        migrated = _enforce_stable_jd_payload(new_content, jd.sections_metadata)
        new_content = migrated["content"]
        stable_meta = migrated.get("sections_metadata") or dict(jd.sections_metadata or {})
        dump = content.model_dump(exclude_none=True)
        if dump.get("section_labels") is not None:
            labels = dict(stable_meta.get("labels") or {})
            labels.update(dump["section_labels"])
            stable_meta["labels"] = labels
        word_count = _content_word_count(new_content)

        # Collect column updates
        column_updates = {}
        field_mappings = {
            "title": content.title,
            "company_name": content.company_name or content.companyName,
            "job_id": content.job_id or content.jobId,
            "job_family": content.job_family or content.jobFamily,
            "job_level": content.job_level or content.jobLevel,
            "department": content.department,
            "location": content.location,
            "city": content.city,
            "country_code": content.country_code or content.countryCode,
            "seniority": content.seniority,
            "industry": content.industry,
            "salary_range": content.salary_range,
            "salary_symbol": content.salary_symbol,
            "salary_min_value": content.salary_min_value,
            "salary_max_value": content.salary_max_value,
            "salary_period": content.salary_period,
            "employment_type": content.employment_type,
            "key_skills": content.key_skills or content.skills,
            "additional_context": content.additional_context or content.context,
        }
        for db_field, val in field_mappings.items():
            if val is not None:
                if db_field == "job_level" and val not in ("L1","L2","L3","L4","L5"):
                    continue
                column_updates[db_field] = val

        # Handle competencies
        core_comp = content.core_competencies or content.coreCompetencies
        if core_comp is not None:
            column_updates["core_competencies"] = _competency_field_to_stored_text(core_comp)
        func_comp = content.functional_competencies or content.functionalCompetencies
        if func_comp is not None:
            column_updates["functional_competencies"] = _competency_field_to_stored_text(func_comp)

        # Always preserve generation_mode during updates
        if column_updates:
            column_updates["generation_mode"] = jd.generation_mode
            column_updates["sections_metadata"] = stable_meta
            jd = await jd_repo.update_job_description(db, jd=jd, update_data=column_updates)
        else:
            # If no column updates, still preserve generation_mode and update metadata
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": stable_meta, "generation_mode": jd.generation_mode})
        updated = await jd_repo.autosave_jd_content(db, jd=jd, content=new_content, word_count=word_count)
        await cache_service.invalidate_jd_cache(str(jd_id))
        return {"status": "success", "word_count": updated.word_count, "content": new_content, "sections_metadata": stable_meta}
    except Exception as exc:
        log_exception_one_line("autosave failed", exc)
        raise HTTPException(status_code=500, detail="Failed to autosave JD.")


@router.delete("/{jd_id}/section/{section_name}")
async def delete_jd_section(jd_id: UUID, section_name: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Deletes a specific section from a job description content, metadata, and ordering."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
            
        normalized_data = _enforce_stable_jd_payload(_raw_jd_content(jd), jd.sections_metadata)
        new_content = normalized_data["content"]
        new_meta = normalized_data["sections_metadata"]
        
        target_key = None
        if section_name in new_content:
            target_key = section_name
        else:
            for k, v in new_content.items():
                if k.startswith("section_") and isinstance(v, dict):
                    if v.get("name", "").lower().strip() == section_name.lower().strip():
                        target_key = k
                        break
                        
        if target_key:
            reindexed = delete_and_reindex_stable_sections(new_content, new_meta, target_key)
            migrated = migrate_to_stable_format({
                "content": reindexed["content"],
                "sections_metadata": reindexed["sections_metadata"],
                "custom_fields": {},
            })
            new_content = migrated["content"]
            new_meta = migrated["sections_metadata"]
            
        word_count = _content_word_count(new_content)
        
        standard_mapped_name = section_name.lower().strip().replace(" ", "_")
        update_data = {"sections_metadata": new_meta, "generation_mode": jd.generation_mode}
        if standard_mapped_name in ("core_competencies", "functional_competencies") and hasattr(jd, standard_mapped_name):
            update_data[standard_mapped_name] = None

        await jd_repo.update_job_description(db, jd=jd, update_data=update_data)
        await jd_repo.autosave_jd_content(db, jd=jd, content=new_content, word_count=word_count)
        await cache_service.invalidate_jd_cache(str(jd_id))
        return {
            "status": "success",
            "message": f"Section '{section_name}' deleted successfully.",
            "content": new_content,
            "sections_metadata": new_meta,
        }
    except Exception as exc:
        log_exception_one_line("delete_jd_section failed", exc)
        raise HTTPException(status_code=500, detail="Failed to delete section from backend.")


@router.patch("/{jd_id}/update_section")
async def update_jd_section(jd_id: UUID,section: Optional[str] = Query(None, description="Section name to update (e.g. summary, key_duties_view)"),
    payload: JDUpdateSectionRequest = ...,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Updates or adds a specific section of a job description, preserving section order."""
    response_content: Optional[dict] = None
    response_meta: Optional[dict] = None
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        resolved_section = (section or payload.section or "").strip()
        if not resolved_section:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,detail="section is required (query parameter or body.section).")
        top_level_field = _resolve_top_level_field(resolved_section)
        value = payload.value
        if isinstance(value, dict):
            try:
                value = _extract_section_value(value, resolved_section, top_level_field)
            except HTTPException:
                pass
        value, stable_extras = _unwrap_stable_section_payload(value)
        section = resolved_section
        normalized_section = _normalize_section_key(section)
        # Section lock toggle (locked / unlocked) stored in content JSONB
        lock_key = _resolve_section_lock_key(section)
        if lock_key and _is_view_lock_value(value):
            sec_name = lock_key.replace("_view", "")
            new_meta = dict(jd.sections_metadata or {})
            locks = dict(new_meta.get("locks") or {})
            locks[sec_name] = value
            new_meta["locks"] = locks

            raw_content = dict(_raw_jd_content(jd))
            view_match = re.match(r"^section_(\d+)_view$", lock_key or "")
            if view_match:
                base_key = f"section_{view_match.group(1)}"
                if base_key in raw_content and isinstance(raw_content[base_key], dict):
                    sec = dict(raw_content[base_key])
                    sec_meta = dict(sec.get("metadata") or {})
                    sec_meta["view"] = value
                    sec["metadata"] = sec_meta
                    raw_content[base_key] = sec
                raw_content.pop(lock_key, None)
                new_content, new_meta = _sanitize_stable_content(raw_content, new_meta)
            else:
                new_content = _normalize_content_view_locks({**raw_content, lock_key: value})
            # Preserve generation_mode when updating section locks
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": new_meta, "generation_mode": jd.generation_mode})
            word_count = jd.word_count if jd.word_count is not None else _content_word_count(new_content)
            await jd_repo.autosave_jd_content(db, jd=jd, content=new_content, word_count=word_count)
            await cache_service.invalidate_jd_cache(str(jd_id))
            return {
                "status": "success",
                "message": f"Section lock '{lock_key}' updated",
                "section": lock_key,
                "value": value,
            }
        if normalized_section in ("_section_order", "section_order", "sections_order") and isinstance(value, list):
            new_content, new_meta = _apply_sections_order_update(jd, value)
            # Preserve generation_mode when updating section order
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": new_meta, "generation_mode": jd.generation_mode})
            word_count = jd.word_count if jd.word_count is not None else _content_word_count(new_content)
            await jd_repo.autosave_jd_content(db, jd=jd, content=new_content, word_count=word_count)
            await cache_service.invalidate_jd_cache(str(jd_id))
            return {
                "status": "success",
                "message": "Section order updated",
                "section": "sections_order",
                "value": value,
                "content": new_content,
                "sections_metadata": new_meta,
            }
        elif normalized_section == "sections_metadata" and isinstance(value, dict):
            new_meta = dict(jd.sections_metadata or {})
            new_meta.update(value)
            # Preserve generation_mode when updating sections_metadata
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": new_meta, "generation_mode": jd.generation_mode})
            return {
                "status": "success",
                "message": "Sections metadata updated",
                "section": "sections_metadata"
            }
        elif normalized_section == "section_labels" and isinstance(value, dict):
            new_meta = dict(jd.sections_metadata or {})
            meta_labels = dict(new_meta.get("labels") or {})
            meta_labels.update(value)
            new_meta["labels"] = meta_labels
            # Preserve generation_mode when updating section labels
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": new_meta, "generation_mode": jd.generation_mode})
            await cache_service.invalidate_jd_cache(str(jd_id))
            return {
                "status": "success",
                "message": "Section labels updated",
                "section": "section_labels",
                "sections_metadata": new_meta,
            }
        elif normalized_section in ("dynamic_sections", "custom_fields"):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="custom_fields has been removed; use sections_metadata and stable content sections instead.",
            )
        if normalized_section.endswith("_view"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,detail="View lock value must be 'locked' or 'unlocked'.")

        # Determine if it's a top-level field or a content section
        if top_level_field:
            # Sanitize job_level to match DB constraint
            if top_level_field == "job_level" and value not in ("L1","L2","L3","L4","L5"):
                value = None
            await jd_repo.update_job_description(db, jd=jd, update_data={top_level_field: value})
        else:
            content_section = normalized_section
            
            migrated = _enforce_stable_jd_payload(_raw_jd_content(jd), jd.sections_metadata)
            existing_content = migrated["content"]
            new_meta = migrated["sections_metadata"]
            
            target_key = None
            if content_section in existing_content:
                target_key = content_section
            else:
                for k, v in existing_content.items():
                    if k.startswith("section_") and isinstance(v, dict):
                        sec_name = str(v.get("name", "")).lower().strip().replace(" ", "_")
                        req_name = section.lower().strip().replace(" ", "_")
                        if sec_name == req_name or v.get("name", "").lower().strip() == section.lower().strip():
                            target_key = k
                            break

            sections_order = existing_content.get("sections_order") or []
            labels = dict(new_meta.get("labels") or {})
            if not target_key:
                if len(sections_order) >= settings.max_sections_limit:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Maximum sections limit ({settings.max_sections_limit}) reached.")
                counter = 1
                while f"section_{counter}" in existing_content:
                    counter += 1
                target_key = f"section_{counter}"
                
                sec_type = stable_extras.get("type") or ("points" if isinstance(value, list) else "text")
                
                normalized_val = _to_weighted_points(value, target_key) if sec_type in ("points", "weighted_list") else value
                existing_content[target_key] = {
                    "name": stable_extras.get("name") or _stable_section_display_name(target_key, section, labels),
                    "type": sec_type,
                    "section_data": normalized_val,
                    "metadata": {
                        **({"view": "unlocked", "push_to_csod": True}),
                        **(stable_extras.get("metadata") or {}),
                    }
                }
                sections_order.append(target_key)
                existing_content["sections_order"] = sections_order
            else:
                sec_obj = existing_content[target_key]
                if not isinstance(sec_obj, dict):
                    sec_type = stable_extras.get("type") or ("points" if isinstance(sec_obj, list) else "text")
                    sec_obj = {
                        "name": stable_extras.get("name") or _stable_section_display_name(target_key, section, labels),
                        "type": sec_type,
                        "section_data": sec_obj,
                        "metadata": {"view": "unlocked", "push_to_csod": True},
                    }
                    existing_content[target_key] = sec_obj
                sec_type = stable_extras.get("type") or sec_obj.get("type") or "text"
                is_weighted = sec_type in ("points", "weighted_list")
                normalized_val = _to_weighted_points(value, target_key) if is_weighted else value
                sec_obj["section_data"] = normalized_val
                sec_obj["type"] = sec_type
                if stable_extras.get("name"):
                    sec_obj["name"] = stable_extras["name"]
                elif not sec_obj.get("name") or str(sec_obj.get("name")).startswith("section_"):
                    sec_obj["name"] = _stable_section_display_name(
                        target_key, section, labels, sec_obj.get("name")
                    )
                if stable_extras.get("metadata"):
                    sec_obj["metadata"] = {
                        **(sec_obj.get("metadata") if isinstance(sec_obj.get("metadata"), dict) else {}),
                        **stable_extras["metadata"],
                    }
                existing_content[target_key] = sec_obj

            new_meta["order"] = sections_order
            locks = dict(new_meta.get("locks") or {})
            labels = dict(new_meta.get("labels") or {})
            
            for k in sections_order:
                sec_obj = existing_content.get(k)
                if not isinstance(sec_obj, dict):
                    locks[k] = "unlocked"
                    labels[k] = k.replace("_", " ").title()
                    continue
                locks[k] = sec_obj.get("metadata", {}).get("view", "unlocked")
                labels[k] = sec_obj.get("name", k)
                
            new_meta["locks"] = locks
            new_meta["labels"] = labels
            
            final_migrated = _enforce_stable_jd_payload(existing_content, new_meta)
            existing_content = final_migrated["content"]
            new_meta = final_migrated["sections_metadata"]
            
            word_count = _content_word_count(existing_content)
            
            standard_mapped_name = section.lower().strip().replace(" ", "_")
            if standard_mapped_name in ("core_competencies", "functional_competencies"):
                # Preserve generation_mode when updating competencies
                await jd_repo.update_job_description(db, jd=jd, update_data={standard_mapped_name: _competency_field_to_stored_text(normalized_val), "generation_mode": jd.generation_mode})
            
            # Preserve generation_mode when updating sections_metadata
            await jd_repo.update_job_description(db, jd=jd, update_data={"sections_metadata": new_meta, "generation_mode": jd.generation_mode})
            await jd_repo.autosave_jd_content(db, jd=jd, content=existing_content, word_count=word_count)
            response_content = existing_content
            response_meta = new_meta
        await cache_service.invalidate_jd_cache(str(jd_id))
        result = {"status": "success", "message": f"Section '{section}' updated"}
        if response_content is not None:
            result["content"] = response_content
        if response_meta is not None:
            result["sections_metadata"] = response_meta
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("update_section failed", exc)
        raise HTTPException(status_code=500, detail="Failed to update section")


@router.patch("/{jd_id}/finalize")
async def finalize_jd(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Marks a job description as final and ready for publication."""
    try:
        # Pass for_update=True to lock the row during workflow checks
        jd = await jd_repo.get_jd_by_id(db, jd_id, for_update=True)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        # Block finalize if a workflow is active on this JD
        if jd.org_id:
            from app.repository import jd_workflow_repository as wf_repo
            active_run = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=jd.org_id)
            if active_run:
                raise HTTPException(status_code=409, detail="Cannot finalize this JD — it is currently under workflow review. The reviewer must approve or decline it first.")
        # Delete all related workflow runs when finalizing
        if jd.org_id:
            await wf_repo.delete_workflow_runs_for_jd(db, jd_id=jd_id, org_id=jd.org_id)
        finalized = await jd_repo.finalize_jd(db, jd=jd)
        await cache_service.invalidate_jd_cache(str(jd_id))
        await _clear_user_jds_cache(current_user)
        return {"status": "success", "message": "JD finalized", "finalized_at": finalized.finalized_at}
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("finalize_jd failed", exc)
        raise HTTPException(status_code=500, detail="Failed to finalize JD")


@router.patch("/{jd_id}/archive")
async def archive_jd(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Marks a job description as archived."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        archived = await jd_repo.archive_jd(db, jd=jd)
        await cache_service.invalidate_jd_cache(str(jd_id))
        await _clear_user_jds_cache(current_user)
        return {"status": "success", "message": "JD archived"}
    except Exception as exc:
        log_exception_one_line("archive_jd failed", exc)
        raise HTTPException(status_code=500, detail="Failed to archive JD")


@router.patch("/bulk/status")
async def bulk_update_jd_status(payload: JDBulkStatusUpdateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Bulk updates the status of job descriptions from a specific current status to a new status.
    Validates that:
    1. The to_status or from_status is not 'in_review'.
    2. The user has access to each JD.
    3. The JDs are currently in the expected 'from_status'.
    4. Only Admin and Manager can approve JDs.
    5. Only Admin can publish JDs for public view.
    """
    if payload.from_status == "in_review" or payload.to_status == "in_review":
        if payload.to_status != "clone":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bulk updates to or from 'in_review' status are not supported.")

    if payload.to_status == "approved" and current_user.role not in ["Admin", "Manager"] and not is_super_admin_role(current_user.role):
        raise HTTPException(status_code=403, detail="Only Admins and Managers can approve JDs")
    
    if payload.to_status == "public_view":
        if current_user.role != "Admin" and not is_super_admin_role(current_user.role):
            raise HTTPException(status_code=403, detail="Only Admin can publish JDs for public view")
        if payload.from_status not in {"final", "approved", "archive", "archive_job"}:
            raise HTTPException(status_code=400, detail="JDs can only be moved to public_view from final, approved, archive, or archive_job status")

    try:
        from app.repository import jd_workflow_repository as wf_repo

        # Fetch the requested JDs
        jds = await jd_repo.get_jds_by_ids(db, payload.jd_ids)

        
        found_ids = {jd.id for jd in jds}
        missing_ids = [str(jid) for jid in payload.jd_ids if jid not in found_ids]
        
        if missing_ids:
            raise HTTPException(status_code=404, detail=f"The following JDs were not found: {', '.join(missing_ids)}")

        # Validate access and current status
        mismatched_status = []
        no_access = []
        under_workflow = []
        
        for jd in jds:
            if not _can_access_jd(current_user, jd):
                no_access.append(str(jd.id))
            elif jd.status != payload.from_status:
                mismatched_status.append(f"{jd.id} (current status: {jd.status})")
            
            # Check for active workflow if status changes manually
            if payload.to_status != "clone" and jd.org_id:
                active_run = await wf_repo.get_active_run_for_jd(db, jd_id=jd.id, org_id=jd.org_id)
                if active_run:
                    under_workflow.append(str(jd.id))

        if no_access:
            raise HTTPException(status_code=403, detail=f"Permission denied for JDs: {', '.join(no_access)}")
        if mismatched_status:
            raise HTTPException(status_code=400, detail=f"The following JDs are not in the expected '{payload.from_status}' status: {', '.join(mismatched_status)}")
        if under_workflow:
            raise HTTPException(status_code=409, detail=f"Cannot change status — the following JDs are currently under workflow review: {', '.join(under_workflow)}")

        updated_ids = []
        public_jd_mappings = []
        clone_jd_mappings = []

        # Perform the status updates
        for jd in jds:
            if payload.to_status == "clone":
                cloned_jd = await jd_repo.clone_jd(db,main_jd=jd,creator_id=current_user.id,commit=False)
                await cache_service.invalidate_jd_cache(str(cloned_jd.id))
                clone_jd_mappings.append({
                    "original_jd_id": str(jd.id),
                    "cloned_jd_id": str(cloned_jd.id),
                    "original_status": jd.status,
                    "new_status": "clone",
                })
            elif payload.to_status == "public_view" and payload.from_status in {"final", "approved"}:
                # Only clone for the approved/final -> public_view path.
                duplicate_jd = await jd_repo.clone_jd_for_public_view(db, jd)
                await cache_service.invalidate_jd_cache(str(duplicate_jd.id))
                public_jd_mappings.append({
                    "original_jd_id": str(jd.id),
                    "public_jd_id": str(duplicate_jd.id)
                })
            else:
                # If moving to final, delete workflow runs
                if payload.to_status == "final" and jd.org_id:
                    await wf_repo.delete_workflow_runs_for_jd(db, jd_id=jd.id, org_id=jd.org_id)
                
                # Update status in place for archived/public transitions.
                await jd_repo.update_job_description(db, jd=jd, update_data={"status": payload.to_status})
            
            await cache_service.invalidate_jd_cache(str(jd.id))
            updated_ids.append(str(jd.id))

        if clone_jd_mappings:
            await db.commit()
            for mapping in clone_jd_mappings:
                cloned = await jd_repo.get_jd_by_id(db, UUID(mapping["cloned_jd_id"]))
                if cloned:
                    await db.refresh(cloned)

        await _clear_user_jds_cache(current_user)

        response = {
            "status": "success",
            "message": (
                f"Successfully cloned {len(clone_jd_mappings)} JD(s)"
                if payload.to_status == "clone"
                else f"Successfully updated {len(updated_ids)} JDs to '{payload.to_status}'"
            ),
            "updated_jd_ids": updated_ids,
        }
        if clone_jd_mappings:
            response["clone_jd_mappings"] = clone_jd_mappings
        if public_jd_mappings:
            response["public_jd_mappings"] = public_jd_mappings
        return response

    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("bulk_update_jd_status failed", exc)
        raise HTTPException(status_code=500, detail="Failed to bulk update JDs status")


@router.patch("/{jd_id}/status")
async def update_jd_status(jd_id: UUID, payload: JDStatusUpdateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Updates the status of a job description."""
    try:
        from app.repository import jd_workflow_repository as wf_repo

        # Pass for_update=True to lock the row during workflow checks
        jd = await jd_repo.get_jd_by_id(db, jd_id, for_update=True)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        # Only Admin and Manager can approve JDs
        if payload.status == "approved" and current_user.role not in ["Admin", "Manager"] and not is_super_admin_role(current_user.role):
            raise HTTPException(status_code=403, detail="Only Admins and Managers can approve JDs")
        if payload.status == "public_view":
            if current_user.role != "Admin" and not is_super_admin_role(current_user.role):
                raise HTTPException(status_code=403, detail="Only Admin can publish JDs for public view")
            if jd.status not in {"final", "approved", "archive", "archive_job"}:
                raise HTTPException(status_code=400, detail="JD can only be moved to public_view from final, approved, archive, or archive_job status")
        if payload.status == "clone":
            cloned_jd = await jd_repo.clone_jd(db,main_jd=jd,creator_id=current_user.id)
            await cache_service.invalidate_jd_cache(str(cloned_jd.id))
            await _clear_user_jds_cache(current_user)
            return {
                "status": "success",
                "message": "JD cloned successfully",
                "original_jd_id": str(jd_id),
                "cloned_jd_id": str(cloned_jd.id),
                "original_status": jd.status,
                "new_status": "clone",
            }
        # Block manual status changes while a workflow is active on this JD
        if jd.org_id:
            active_run = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=jd.org_id)
            if active_run:
                raise HTTPException(status_code=409, detail="Cannot change status — this JD is currently under workflow review. The reviewer must approve or decline it first.")
        # Delete all related workflow runs when status becomes final
        if payload.status == "final" and jd.org_id:
            await wf_repo.delete_workflow_runs_for_jd(db, jd_id=jd_id, org_id=jd.org_id)
        if payload.status == "public_view" and jd.status in {"final", "approved"}:
            duplicate_jd = await jd_repo.clone_jd_for_public_view(db, jd)
            await cache_service.invalidate_jd_cache(str(duplicate_jd.id))
            await _clear_user_jds_cache(current_user)
            return {
                "status": "success",
                "message": "JD duplicated and published for public view",
                "original_jd_id": str(jd_id),
                "public_jd_id": str(duplicate_jd.id),
                "new_status": "public_view"
            }
        # Update JD status in place, including transitions for existing clone records.
        await jd_repo.update_job_description(db, jd=jd, update_data={"status": payload.status})
        await cache_service.invalidate_jd_cache(str(jd_id))
        await _clear_user_jds_cache(current_user)
        return {
            "status": "success",
            "message": f"JD status updated to {payload.status}",
            "jd_id": str(jd_id),
            "new_status": payload.status
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("update_jd_status failed", exc)
        raise HTTPException(status_code=500, detail="Failed to update JD status")

@router.patch("/{jd_id}/push-to-csod", summary="Mark JD for pushing to CSOD", description="Directly updates the JD status to 'push_to_csod' regardless of previous state.")
async def mark_jd_for_push(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Manually marks a JD as ready to be pushed to CSOD."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")

        # Update status to push_to_csod
        await jd_repo.update_job_description(db, jd=jd, update_data={
            "status": "push_to_csod"
        })
        await cache_service.invalidate_jd_cache(str(jd_id))
        await _clear_user_jds_cache(current_user)
        return {"status": "success", "message": "JD marked for pushing to CSOD", "jd_id": str(jd_id)}
    except Exception as exc:
        log_exception_one_line("mark_jd_for_push failed", exc)
        raise HTTPException(status_code=500, detail="Failed to update JD status")


@router.post("/{jd_id}/clone", response_model=JobDescriptionResponse, summary="Clone an existing JD and put aside with 'clone' status")
async def clone_job_description(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Clones an existing job description and saves the copy with status 'clone'."""
    try:
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or not _can_access_jd(current_user, jd):
            raise HTTPException(status_code=404, detail="JD not found")
        cloned_jd = await jd_repo.clone_jd(db, main_jd=jd, creator_id=current_user.id)
        await cache_service.invalidate_jd_cache(str(cloned_jd.id))
        await _clear_user_jds_cache(current_user)
        return cloned_jd
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("clone_job_description failed", exc)
        raise HTTPException(status_code=500, detail="Failed to clone job description")



@router.post("/{jd_id}/export/pdf")
async def export_jd_pdf(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    try:
        jd = await _get_jd_for_export(db, jd_id, current_user)
        if not _can_export_jd(current_user, jd):
            raise HTTPException(status_code=403, detail="Insufficient permissions for export operation")

        org_id = jd.org_id or current_user.org_id
        image_url = await _get_jd_logo_url(db, jd, org_id) if org_id else None
        jd_data = _prepare_jd_export_payload(jd, image_url)

        exclude_terms = current_user.role in ["Admin", "HR", "Manager"] or is_super_admin_role(current_user.role)
        pdf_response = await pdf_generator.generate_pdf_stream(jd_data, jd.title, exclude_terms=exclude_terms)
        await jd_repo.create_export_log(db, jd_id=jd_id, user_id=current_user.id, org_id=org_id, export_type='pdf')
        await auth_repo.increment_user_stat(db, current_user.id, "jds_exported")

        return pdf_response
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("PDF export failed", exc, jd_id=str(jd_id))
        raise HTTPException(status_code=500, detail="Failed to generate PDF")


@router.post("/{jd_id}/export/word")
async def export_jd_word(jd_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    try:
        jd = await _get_jd_for_export(db, jd_id, current_user)
        if not _can_export_jd(current_user, jd):
            raise HTTPException(status_code=403, detail="Insufficient permissions for export operation")

        org_id = jd.org_id or current_user.org_id
        image_url = await _get_jd_logo_url(db, jd, org_id) if org_id else None
        jd_data = _prepare_jd_export_payload(jd, image_url)
        exclude_terms = current_user.role in ["Admin", "HR", "Manager"] or is_super_admin_role(current_user.role)
        word_response = await pdf_generator.generate_word_stream(jd_data, jd.title, exclude_terms=exclude_terms)
        await jd_repo.create_export_log(db, jd_id=jd_id, user_id=current_user.id, org_id=org_id, export_type='txt')
        await auth_repo.increment_user_stat(db, current_user.id, "jds_exported")

        return word_response
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("Word export failed", exc, jd_id=str(jd_id))
        raise HTTPException(status_code=500, detail="Failed to generate word file")


#This endpoint is to save the data to clipboard
@router.post("/{jd_id}/export/clipboard")
async def export_jd_clipboard(jd_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """ Formats a job description as plain text and logs the clipboard export event. """
    try:
        jd = await _get_jd_for_export(db, jd_id, current_user)
        if not _can_export_jd(current_user, jd):
            raise HTTPException(status_code=403, detail="Insufficient permissions for export operation")

        export_content = _prepare_jd_export_payload(jd, None)["content"]
        text = _build_clipboard_export_text(jd, export_content)

        org_id = jd.org_id or current_user.org_id
        await jd_repo.create_export_log(db, jd_id=jd_id, user_id=current_user.id, org_id=org_id, export_type='clipboard')

        # Track JD export
        await auth_repo.increment_user_stat(db, current_user.id, "jds_exported")

        return {"text": text, "message": "Logged clipboard export"}

    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("Clipboard export failed", exc, jd_id=jd_id)
        raise HTTPException(status_code=500, detail="Failed to process clipboard export")

@router.post("/regenerate_section",response_model=StandaloneRegenerateSectionResponse,
    summary="Regenerate a JD section (no saved JD required)",
    description=(
        "Regenerates a single section using the content the frontend already has. "
        "Pass the section name, its current content, and what you want changed. "
        "No jd_id needed — nothing is saved to the database."))
async def standalone_regenerate_section(req: StandaloneRegenerateRequest,
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """ Regenerates a job description section independently without requiring a saved record. """
    try:
        word_limits_row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        
        # Parse existing_data if it arrives as a JSON-encoded string
        import json as _json
        parsed_existing = req.existing_data
        if isinstance(parsed_existing, str):
            try:
                parsed_existing = _json.loads(parsed_existing)
            except (ValueError, TypeError):
                pass  # keep as plain string if not valid JSON
        if isinstance(parsed_existing, dict) and "section_data" in parsed_existing:
            if not req.section_type:
                req.section_type = parsed_existing.get("type")
            parsed_existing = parsed_existing.get("section_data")
        
        jd_data = {
            "title": req.title or "Position",
            "department": req.department or "",
            "industry": req.industry or "General",
            "seniority": req.seniority or "Mid",
            "location": req.location or "",
            "country_code": req.country_code or "US",
            "salary_range": req.salary_range or "",
            "content": {req.section_name: parsed_existing if parsed_existing is not None else ([] if req.section_type in ("points", "weighted_list") else "")},
            "word_count_limits": jd_repo.word_limits_from_model(word_limits_row),
        }

        expansion_instruction = (
            f"The user wants the following change to the '{req.section_label or req.section_name}' section: "
            f"{req.modification_request}. "
            f"Apply the requested modification while keeping the section professional, "
            f"detailed, and publication-ready. "
            f"IMPORTANT: Preserve ALL data values present in the original content (numbers, salary, grades, codes). "
            f"Do NOT return the section heading or job title as the generated content."
        )

        result = await regenerate_section(jd_data, req.section_name, expansion_instruction, settings.ai_model,section_label=req.section_label, section_type=req.section_type,)

        new_val = result.get(req.section_name, result)
        word_count = result.get("word_count", len(str(new_val)))

        return StandaloneRegenerateSectionResponse(section=req.section_name,new_content=new_val,word_count=word_count)

    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("standalone_regenerate_section failed", exc)
        raise HTTPException(status_code=500, detail="Failed to regenerate section content")


@router.post("/regenerate_point",response_model=StandaloneRegeneratePointResponse,
    summary="Regenerate a single point in a JD section",
    description=("Regenerates a single point without altering the rest of the section. "))
async def standalone_regenerate_point(req: StandaloneRegeneratePointRequest,
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """ Regenerates a single point in a job description independently. """
    try:
        jd_data = {
            "title": req.title or "Position",
            "department": req.department or "",
            "industry": req.industry or "General",
            "seniority": req.seniority or "Mid",
            "location": req.location or "",
            "country_code": req.country_code or "US",
            "salary_range": req.salary_range or "",
        }

        expansion_instruction = (f"The user wants the following change to this point: "f"{req.modification_request}. "f"Apply the requested modification while keeping it professional.")

        result = await regenerate_point(jd_data, req.section_name, req.existing_data, expansion_instruction, settings.ai_model)

        return StandaloneRegeneratePointResponse(section=req.section_name,new_point=result.get("new_point"))

    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("standalone_regenerate_point failed", exc)
        raise HTTPException(status_code=500, detail="Failed to regenerate point")


@router.post("/dei-scan",response_model=DEIScanResponse,summary="Scan JD text for DEI (Diversity, Equity & Inclusion) issues",description="Analyzes the provided job description text for non-inclusive language "
                "(gender-biased terms, ageist phrases, coded language like 'rockstar' or 'ninja') "
                "and returns an inclusivity score with one-click rephrasing suggestions.")
async def dei_scan(req: DEIScanRequest,current_user: User = Depends(get_current_regular_user)):
    """DEI Inclusive Language Scanner."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")
    result = await analyze_dei(req.text)
    return result


@router.post("/compliance-scan",response_model=ComplianceScanResponse,summary="Scan JD text for EEO & labor law compliance",description="Analyzes the provided job description text against regional labor laws "
                "(e.g., ADA, wage transparency, Equality Act 2010, POSH Act 2013) "
                "based on the specified country code and returns compliance findings with fixes.")
async def compliance_scan(req: ComplianceScanRequest,current_user: User = Depends(get_current_regular_user)):
    """EEO & Legal Compliance Checker."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")
    result = await analyze_compliance(req.text, req.country_code)
    return result


@router.post("/{jd_id}/translate",response_model=JDTranslateResponse,summary="Translate JD content into target language",description="Translates the Job Description content JSON into a target language, preserving JSON keys and structure.")
async def translate_job_description(jd_id: UUID,req: JDTranslateRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Translate Job Description to a target language."""
    jd = await jd_repo.get_jd_by_id(db, jd_id)
    if not jd or jd.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="JD not found")
    
    if not _can_view_jd(current_user, jd):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this Job Description")
    
    translated_content = await translate_jd(jd.content, req.target_language)
    return JDTranslateResponse(jd_id=jd.id,target_language=req.target_language,translated_content=translated_content)

