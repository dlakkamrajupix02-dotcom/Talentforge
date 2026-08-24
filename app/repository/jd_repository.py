from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select,  or_, desc, update, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
import re

from app.models.models import JobDescription, UserWordLimits, JDExportLog, CSODPipelinePush, CandidateJDAssignment


def _copy_jd_content(jd: JobDescription) -> dict:
    """Copy persisted JSONB content without the legacy content getter transform."""
    raw = getattr(jd, "_content", None)
    if isinstance(raw, dict):
        return dict(raw)
    legacy = getattr(jd, "content", None)
    return dict(legacy) if isinstance(legacy, dict) else {}


def _copy_sections_metadata(jd: JobDescription) -> dict:
    meta = getattr(jd, "sections_metadata", None)
    return dict(meta) if isinstance(meta, dict) else {}


async def rollback_db(db: AsyncSession) -> None:
    """Rollback database transaction safely."""
    try:
        await db.rollback()
    except Exception as e:
        # Log rollback failure but don't raise to avoid masking original errors
        from app.core.logging import get_logger
        logger = get_logger()
        logger.error("Database rollback failed: %s", e)


async def get_user_word_limits(db: AsyncSession, user_id) -> Optional[UserWordLimits]:
    """Get user word limits settings."""
    result = await db.execute(select(UserWordLimits).where(UserWordLimits.user_id == user_id))
    return result.scalar_one_or_none()


async def get_or_create_user_word_limits(db: AsyncSession, user_id) -> UserWordLimits:
    """Get existing user word limits or create default ones."""
    row = await get_user_word_limits(db, user_id)
    if row:
        return row
    return await create_user_word_limits(db, user_id)


def word_limits_from_model(model: UserWordLimits) -> dict:
    """Convert UserWordLimits model to dictionary format for AI service."""
    return {
        "summary": {"min": model.summary_min, "max": model.summary_max},
        "key_duties": {"min": model.key_duties_min, "max": model.key_duties_max},
        "core_competencies": {
            "min": model.core_competencies_min,
            "max": model.core_competencies_max,
        },
        "functional_competencies": {
            "min": model.functional_competencies_min,
            "max": model.functional_competencies_max,
        },
        "qualifications_required": {
            "min": model.qualifications_required_min,
            "max": model.qualifications_required_max,
        },
        "qualifications_preferred": {
            "min": model.qualifications_preferred_min,
            "max": model.qualifications_preferred_max,
        },
        "eeo_statement": {"min": model.eeo_statement_min, "max": model.eeo_statement_max},
    }


async def create_user_word_limits(db: AsyncSession, user_id) -> UserWordLimits:
    """Create default word limits for a user."""
    row = UserWordLimits(user_id=user_id)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def update_user_word_limits(db: AsyncSession, row: UserWordLimits, patch_data: dict) -> UserWordLimits:
    """Update user word limits."""
    for key, value in patch_data.items():
        if value is not None and hasattr(row, key):
            setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


async def _resolve_jd_id(db: AsyncSession, jd_id: UUID) -> UUID:
    stmt = select(CandidateJDAssignment.jd_id).where(CandidateJDAssignment.id == jd_id)
    res = await db.execute(stmt)
    resolved_id = res.scalar_one_or_none()
    return resolved_id if resolved_id else jd_id


async def get_jd_by_id(db: AsyncSession, jd_id: UUID, for_update: bool = False) -> Optional[JobDescription]:
    """Get job description by ID."""
    effective_id = await _resolve_jd_id(db, jd_id)
    query = select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.id == effective_id, JobDescription.deleted_at.is_(None))
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_jd_for_user(db: AsyncSession, jd_id: UUID, user_id: UUID) -> Optional[JobDescription]:
    """Get job description by ID for a specific user (creator)."""
    effective_id = await _resolve_jd_id(db, jd_id)
    result = await db.execute(select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.id == effective_id, JobDescription.creator_id == user_id, JobDescription.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_jd_for_user_with_status(db: AsyncSession, jd_id: UUID, user_id: UUID, status: Optional[str] = None) -> Optional[JobDescription]:
    """Get job description for user with optional status filter."""
    effective_id = await _resolve_jd_id(db, jd_id)
    query = (select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.id == effective_id, JobDescription.creator_id == user_id, JobDescription.deleted_at.is_(None)))
    if status:
        query = query.where(JobDescription.status == status)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_job_description(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    """Create a new job description."""
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


MOD_METADATA_STRIP_STATUSES = frozenset({"approved", "final", "draft","push_to_csod"})

_MOD_OPEN_TAG_RE = re.compile(r"\[\[mod:[^\]]*\]\]")
_MOD_CLOSE_TAG_RE = re.compile(r"\[\[/mod\]\]")


def strip_mod_metadata_from_text(text: str) -> str:
    """Remove [[mod:...]] and [[/mod]] tags while preserving inner content."""
    if not isinstance(text, str) or not text:
        return text
    text = _MOD_OPEN_TAG_RE.sub("", text)
    return _MOD_CLOSE_TAG_RE.sub("", text)


def should_strip_mod_metadata(status: str | None) -> bool:
    return status in MOD_METADATA_STRIP_STATUSES


def _clean_jd_watermarks(jd: JobDescription):
    """
    Strips watermark metadata tags [[mod:...]] and [[/mod]] from all relevant
    text fields and JSONB payloads on a Job Description.
    """
    def clean_text(text):
        if not isinstance(text, str):
            return text
        return strip_mod_metadata_from_text(text)

    # List of top-level string attributes to clean
    text_fields = [
        "title", "company_name", "job_id", "job_family", "department",
        "location", "city", "industry", "salary_range", "key_skills",
        "core_competencies", "functional_competencies", "additional_context",
        "input_prompt", "employment_type", "seniority", "job_level",
        "salary_symbol", "salary_period",
    ]

    for field in text_fields:
        val = getattr(jd, field, None)
        if val and isinstance(val, str):
            cleaned = clean_text(val)
            if cleaned != val:
                setattr(jd, field, cleaned)

    def clean_recursive(data):
        if isinstance(data, str):
            return clean_text(data)
        elif isinstance(data, dict):
            return {k: clean_recursive(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [clean_recursive(item) for item in data]
        return data

    # Clean persisted JSONB directly — avoid the legacy content getter which drops stable section_* keys
    raw_content = getattr(jd, "_content", None)
    if raw_content and isinstance(raw_content, dict):
        cleaned_content = clean_recursive(raw_content)
        if cleaned_content != raw_content:
            jd._content = cleaned_content
            flag_modified(jd, "_content")

    sections_metadata = getattr(jd, "sections_metadata", None)
    if sections_metadata and isinstance(sections_metadata, dict):
        cleaned_meta = clean_recursive(sections_metadata)
        if cleaned_meta != sections_metadata:
            jd.sections_metadata = cleaned_meta
            flag_modified(jd, "sections_metadata")

    version_history = getattr(jd, "version_history", None)
    if version_history and isinstance(version_history, list):
        cleaned_history = clean_recursive(version_history)
        if cleaned_history != version_history:
            jd.version_history = cleaned_history
            flag_modified(jd, "version_history")

    eeoc_flags = getattr(jd, "eeoc_flags", None)
    if eeoc_flags and isinstance(eeoc_flags, list):
        cleaned_flags = clean_recursive(eeoc_flags)
        if cleaned_flags != eeoc_flags:
            jd.eeoc_flags = cleaned_flags
            flag_modified(jd, "eeoc_flags")


async def update_job_description(db: AsyncSession, *, jd: JobDescription, update_data: dict) -> JobDescription:
    """Update job description with provided data."""
    for key, value in update_data.items():
        if hasattr(jd, key):
            setattr(jd, key, value)
    
    if "content" in update_data:
        flag_modified(jd, "_content")
    
    # Strip mod metadata when the JD reaches a published/review-complete status.
    new_status = update_data.get("status", jd.status)
    if should_strip_mod_metadata(new_status):
        _clean_jd_watermarks(jd)
        
    # If the JD is finalized, clear version history clones
    if update_data.get("status") == "final":
        await clear_version_history_for_jd(db, jd)
    jd.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(jd)
    return jd


async def autosave_jd_content(db: AsyncSession, *, jd: JobDescription, content: dict, word_count: int) -> JobDescription:
    """Autosave JD content."""
    jd._content = content
    jd.word_count = word_count
    jd.updated_at = datetime.now(timezone.utc)
    flag_modified(jd, "_content")
    await db.commit()
    await db.refresh(jd)
    return jd


async def update_jd_section(db: AsyncSession, *, jd: JobDescription, section: str, value: any, word_count: int) -> JobDescription:
    """Update a specific section of JD content."""
    jd.word_count = word_count
    jd.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(jd)
    return jd


async def finalize_jd(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    """Mark JD as finalized."""
    jd.status = "final"
    jd.finalized_at = datetime.now(timezone.utc)
    jd.updated_at = datetime.now(timezone.utc)
    _clean_jd_watermarks(jd)
    await clear_version_history_for_jd(db, jd)
    await db.commit()
    await db.refresh(jd)
    return jd


async def archive_jd(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    """Mark JD as archived."""
    jd.status = "archive"
    jd.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(jd)
    return jd


async def revert_jd_to_draft(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    """Revert JD from final to draft status."""
    jd.status = "draft"
    jd.updated_at = datetime.now(timezone.utc)
    _clean_jd_watermarks(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


def _parse_multi_select(param: Optional[str]) -> list[str]:
    """Helper to parse comma-separated strings into a list."""
    if not param:
        return []
    return [p.strip() for p in param.split(",") if p.strip()]


async def list_user_jds(db: AsyncSession,*,user_id: UUID,status: Optional[str] = None,search: Optional[str] = None,
    employment_type: Optional[str] = None,
    order_by: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[JobDescription]:
    """List job descriptions for a user with optional filters."""
    query = select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.creator_id == user_id,JobDescription.deleted_at.is_(None))

    if status:
        query = query.where(JobDescription.status == status)
    if search:
        search_filter = or_(JobDescription.title.ilike(f"%{search}%"),JobDescription.job_id.ilike(f"%{search}%"),
            JobDescription.department.ilike(f"%{search}%"))
        query = query.where(search_filter)
    
    if employment_type:
        et_list = _parse_multi_select(employment_type)
        if et_list:
            query = query.where(JobDescription.employment_type.in_(et_list))
            
    if order_by == "updated":
        query = query.order_by(desc(JobDescription.updated_at))
    else:
        query = query.order_by(JobDescription.created_at)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def check_duplicate_job_id(db: AsyncSession, job_id: str, creator_id: UUID) -> bool:
    """Check if a job ID already exists for a user."""
    result = await db.execute(select(JobDescription).where(JobDescription.job_id == job_id,JobDescription.creator_id == creator_id,
            JobDescription.deleted_at.is_(None)))
    return result.scalar_one_or_none() is not None


async def create_export_log(db: AsyncSession,*,jd_id: UUID,user_id: UUID,org_id: Optional[UUID],export_type: str) -> JDExportLog:
    """Create an export log entry."""
    export_log = JDExportLog(jd_id=jd_id,user_id=user_id,export_type=export_type)
    db.add(export_log)
    await db.commit()
    return export_log


async def get_jd_by_id_and_org(db: AsyncSession, jd_id: UUID, org_id: UUID, user_id: Optional[UUID] = None) -> Optional[JobDescription]:
    """Get JD by ID within organization. If user_id provided, restrict to user's JDs."""
    effective_id = await _resolve_jd_id(db, jd_id)
    query = select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.id == effective_id, JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None))
    if user_id:
        query = query.where(JobDescription.creator_id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def list_jds_for_org(db: AsyncSession, org_id: UUID, user_id: Optional[UUID] = None, status: Optional[str] = None, search: Optional[str] = None, employment_type: Optional[str] = None, order_by: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[JobDescription]:
    """List JDs for organization with optional filters."""

    query = select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None), JobDescription.is_main == True)
    if user_id:
        query = query.where(JobDescription.creator_id == user_id)
    if status:
        query = query.where(JobDescription.status == status)
    if search:
        search_filter = or_(JobDescription.title.ilike(f"%{search}%"),JobDescription.job_id.ilike(f"%{search}%"),JobDescription.department.ilike(f"%{search}%"))
        query = query.where(search_filter)
        
    if employment_type:
        et_list = _parse_multi_select(employment_type)
        if et_list:
            query = query.where(JobDescription.employment_type.in_(et_list))
    
    if order_by == "updated":
        query = query.order_by(desc(JobDescription.updated_at))
    else:
        query = query.order_by(JobDescription.created_at)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_jds_by_job_id_for_user(db: AsyncSession, job_id: str, creator_id: UUID) -> List[JobDescription]:
    """Get all JDs matching a job_id for a creator."""
    result = await db.execute(select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.creator_id == creator_id, JobDescription.deleted_at.is_(None), JobDescription.is_main == True, JobDescription.job_id == job_id).order_by(desc(JobDescription.created_at)))
    return list(result.scalars().all())


async def soft_delete_jd(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    """Soft delete JD by setting deleted_at."""
    jd.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(jd)
    return jd


async def update_jd_image(db: AsyncSession, jd_id: UUID, image_url: str, org_id: Optional[UUID] = None) -> Optional[JobDescription]:
    """Update JD image URL."""
    query = select(JobDescription).where(JobDescription.id == jd_id)
    if org_id is not None:
        query = query.where(JobDescription.org_id == org_id)
    result = await db.execute(query)
    jd = result.scalar_one_or_none()
    if jd:
        jd.image_url = image_url
        await db.commit()
        await db.refresh(jd)
    return jd


async def update_jd_status_and_content(db: AsyncSession, jd: JobDescription) -> JobDescription:
    """Update JD status and content, then commit."""
    if should_strip_mod_metadata(jd.status):
        _clean_jd_watermarks(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


async def update_jd_status(db: AsyncSession, jd_id: UUID, status: str, org_id: Optional[UUID] = None) -> None:
    """Update JD status directly."""
    stmt = update(JobDescription).where(JobDescription.id == jd_id)
    if org_id is not None:
        stmt = stmt.where(JobDescription.org_id == org_id)
    stmt = stmt.values(status=status)
    await db.execute(stmt)
    await db.commit()


async def sync_successful_csod_push_statuses(db: AsyncSession, org_id: UUID) -> int:
    """
    Reconcile stale JD statuses from successful CSOD push audit rows.

    Some older push paths wrote a successful CSODPipelinePush row but left the
    JobDescription status as push_to_csod. This keeps status-based JD lists
    aligned with the source of truth used by /foundation/push-records.
    """
    latest_success_at = (select(func.max(CSODPipelinePush.pushed_at)).where(CSODPipelinePush.org_id == org_id,CSODPipelinePush.jd_id == JobDescription.id,CSODPipelinePush.status == "success").correlate(JobDescription).scalar_subquery())
    successful_jd_ids = (select(CSODPipelinePush.jd_id).where(CSODPipelinePush.org_id == org_id,CSODPipelinePush.status == "success"))
    stmt = (update(JobDescription).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.status == "push_to_csod",JobDescription.id.in_(successful_jd_ids)).values(status="pushed_to_csod",csod_pushed_at=func.coalesce(JobDescription.csod_pushed_at, latest_success_at),updated_at=datetime.now(timezone.utc)))
    result = await db.execute(stmt)
    changed = result.rowcount or 0
    if changed:
        await db.commit()
    return changed


async def get_pending_assignment_count(db: AsyncSession, jd_id: UUID) -> int:
    """Count pending assignments for a JD."""
    from app.models.models import CandidateJDAssignment
    result = await db.execute(select(func.count(CandidateJDAssignment.id)).where(CandidateJDAssignment.jd_id == jd_id).where(CandidateJDAssignment.status == "waiting_for_approval").where(CandidateJDAssignment.assigned_user_id.isnot(None)))  # Only user-to-user assignments
    return result.scalar() or 0

async def clone_jd_for_versioning(db: AsyncSession, main_jd: JobDescription, user_id: UUID) -> JobDescription:
    """Creates a clone of a JD for a specific user in a workflow."""
    clone = JobDescription(
        org_id=main_jd.org_id,
        creator_id=user_id,
        template_id=main_jd.template_id,
        title=main_jd.title,
        company_name=main_jd.company_name,
        job_id=main_jd.job_id,
        job_family=main_jd.job_family,
        job_level=main_jd.job_level,
        department=main_jd.department,
        location=main_jd.location,
        city=main_jd.city,
        country_code=main_jd.country_code,
        seniority=main_jd.seniority,
        industry=main_jd.industry,
        salary_range=main_jd.salary_range,
        salary_symbol=main_jd.salary_symbol,
        salary_min_value=main_jd.salary_min_value,
        salary_max_value=main_jd.salary_max_value,
        salary_period=main_jd.salary_period,
        key_skills=main_jd.key_skills,
        core_competencies=main_jd.core_competencies,
        functional_competencies=main_jd.functional_competencies,
        additional_context=main_jd.additional_context,
        image_url=main_jd.image_url,
        input_prompt=main_jd.input_prompt,
        generation_mode=main_jd.generation_mode,
        model_used=main_jd.model_used,
        content=_copy_jd_content(main_jd),
        sections_metadata=_copy_sections_metadata(main_jd),
        eeoc_flags=main_jd.eeoc_flags.copy() if main_jd.eeoc_flags else [],
        eeoc_cleared=main_jd.eeoc_cleared,
        status=main_jd.status,
        word_count=main_jd.word_count,
        parent_jd_id=main_jd.parent_jd_id or main_jd.id,
        is_main=False,
        version_history=list(main_jd.version_history) if main_jd.version_history else [])
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    return clone


async def clone_jd_for_public_view(db: AsyncSession, main_jd: JobDescription) -> JobDescription:
    """Duplicate a JD for public_view without changing the original."""
    clone = JobDescription(
        org_id=main_jd.org_id,
        creator_id=main_jd.creator_id,
        template_id=main_jd.template_id,
        title=main_jd.title,
        company_name=main_jd.company_name,
        job_id=main_jd.job_id,
        job_family=main_jd.job_family,
        job_level=main_jd.job_level,
        department=main_jd.department,
        location=main_jd.location,
        city=main_jd.city,
        country_code=main_jd.country_code,
        seniority=main_jd.seniority,
        industry=main_jd.industry,
        salary_range=main_jd.salary_range,
        salary_symbol=main_jd.salary_symbol,
        salary_min_value=main_jd.salary_min_value,
        salary_max_value=main_jd.salary_max_value,
        salary_period=main_jd.salary_period,
        key_skills=main_jd.key_skills,
        core_competencies=main_jd.core_competencies,
        functional_competencies=main_jd.functional_competencies,
        additional_context=main_jd.additional_context,
        image_url=main_jd.image_url,
        input_prompt=main_jd.input_prompt,
        generation_mode=main_jd.generation_mode,
        model_used=main_jd.model_used,
        content=_copy_jd_content(main_jd),
        sections_metadata=_copy_sections_metadata(main_jd),
        eeoc_flags=main_jd.eeoc_flags.copy() if main_jd.eeoc_flags else [],
        eeoc_cleared=main_jd.eeoc_cleared,
        status="public_view",
        word_count=main_jd.word_count,
        parent_jd_id=main_jd.parent_jd_id or main_jd.id,
        is_main=True,
        version_history=list(main_jd.version_history) if main_jd.version_history else [])
    _clean_jd_watermarks(clone)
    db.add(clone)
    await db.flush()
    main_jd.public_jd_id = clone.id
    await db.commit()
    await db.refresh(clone)
    await db.refresh(main_jd)
    return clone


async def clone_jd(db: AsyncSession,main_jd: JobDescription,creator_id: Optional[UUID] = None,*,commit: bool = True) -> JobDescription:
    """Creates a copy of an existing JD with status set to 'clone' without modifying the source JD."""
    clone = JobDescription(
        org_id=main_jd.org_id,
        creator_id=creator_id or main_jd.creator_id,
        template_id=main_jd.template_id,
        title=main_jd.title,
        company_name=main_jd.company_name,
        job_id=main_jd.job_id,
        job_family=main_jd.job_family,
        job_level=main_jd.job_level,
        department=main_jd.department,
        location=main_jd.location,
        city=main_jd.city,
        country_code=main_jd.country_code,
        seniority=main_jd.seniority,
        industry=main_jd.industry,
        salary_range=main_jd.salary_range,
        salary_symbol=main_jd.salary_symbol,
        salary_min_value=main_jd.salary_min_value,
        salary_max_value=main_jd.salary_max_value,
        salary_period=main_jd.salary_period,
        key_skills=main_jd.key_skills,
        core_competencies=main_jd.core_competencies,
        functional_competencies=main_jd.functional_competencies,
        additional_context=main_jd.additional_context,
        image_url=main_jd.image_url,
        input_prompt=main_jd.input_prompt,
        generation_mode=main_jd.generation_mode,
        model_used=main_jd.model_used,
        content=_copy_jd_content(main_jd),
        sections_metadata=_copy_sections_metadata(main_jd),
        eeoc_flags=main_jd.eeoc_flags.copy() if main_jd.eeoc_flags else [],
        eeoc_cleared=main_jd.eeoc_cleared,
        status="clone",
        word_count=main_jd.word_count,
        finalized_at=main_jd.finalized_at,
        parent_jd_id=main_jd.parent_jd_id or main_jd.id,
        is_main=True,
        version_history=list(main_jd.version_history) if main_jd.version_history else [])
    db.add(clone)
    if commit:
        await db.commit()
        await db.refresh(clone)
    else:
        await db.flush()
    return clone



async def clear_version_history_for_jd(db: AsyncSession, jd: JobDescription) -> None:
    """Delete all version history clone JDs and clear the version_history field."""
    if not jd.version_history:
        return
        
    clone_ids = []
    for entry in jd.version_history:
        jd_id_str = entry.get("jd_id")
        if jd_id_str:
            try:
                clone_ids.append(UUID(jd_id_str))
            except ValueError:
                pass
                
    if clone_ids:
        stmt = delete(JobDescription).where(JobDescription.id.in_(clone_ids))
        await db.execute(stmt)
        
    jd.version_history = []
    flag_modified(jd, "version_history")


async def list_public_jds_for_org(db: AsyncSession,org_id: UUID,employment_type: Optional[str] = None,skip: int = 0,limit: int = 1000,status: str = "public_view",) -> List[JobDescription]:
    """Return org job openings filtered by status (public_view or archive_job)."""
    allowed_statuses = {"public_view", "archive_job"}
    resolved_status = status if status in allowed_statuses else "public_view"
    query = (select(JobDescription).options(selectinload(JobDescription.creator)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status == resolved_status,))
    if employment_type:
        et_list = [et.strip() for et in employment_type.split(",") if et.strip()]
        if et_list:
            query = query.where(JobDescription.employment_type.in_(et_list))
    query = query.order_by(desc(JobDescription.updated_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_jds_by_ids(db: AsyncSession, jd_ids: list) -> list[JobDescription]:
    """Fetch multiple JDs by their IDs in a single query."""
    from sqlalchemy import select
    stmt = select(JobDescription).where(JobDescription.id.in_(jd_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_public_clone_map_for_jds(db: AsyncSession, jd_ids: list) -> dict:
    """Return a mapping of parent_jd_id -> clone_id for public_view clones of the given JD IDs."""
    if not jd_ids:
        return {}
    stmt = (select(JobDescription.parent_jd_id, JobDescription.id).where(JobDescription.parent_jd_id.in_(jd_ids),JobDescription.status == "public_view",JobDescription.deleted_at.is_(None),))
    result = await db.execute(stmt)
    return {parent: clone_id for parent, clone_id in result.all()}


