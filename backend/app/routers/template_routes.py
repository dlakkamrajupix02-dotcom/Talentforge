from app.core.logging import get_logger
from app.core.logging import log_exception_one_line
import re
import ast
import json
import pandas as pd
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.models import User, Template, JobDescription
from app.services.dependencies import get_current_regular_user, CSOD_STAFF_ROLES, require_admin, require_csod_staff
from app.services.cache_service import cache_service
from app.services.enhanced_ai_service import regenerate_section
from app.services import template_parser_service as parser_svc
from app.repository import jd_repository as jd_repo
from app.repository import template_repository as template_repo
from app.repository import auth_repository as auth_repo
from app.schemas.schemas import (TemplateStandaloneRegenerateRequest,TemplateStandaloneRegenerateSectionResponse,
    PublicTemplateCreate,PublicTemplateResponse,PublicTemplateUpdate,WeightedItem,
    BulkImportResult,BulkImportSummary,JobDescriptionResponse)
from app.routers.Jd_routes import (
    _to_weighted_points,
    WEIGHTED_SECTIONS,
    _content_word_count,
    _build_content_with_view_locks,
    _enforce_stable_jd_payload,
    _normalize_weighted_sections,
)
from app.schemas.validators import validate_seniority, validate_job_level, validate_salary_range

logger = get_logger()

router = APIRouter(prefix="/templates",tags=["Templates"],dependencies=[Depends(get_current_regular_user)])

_MAX_BULK_FILES = 50
_ALLOWED_EXTENSIONS = (".docx", ".doc", ".pdf")

def _make_public_template_response(t: Template) -> PublicTemplateResponse:
    content = t.content or {}
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}
    if not isinstance(content, dict):
        content = {}
    return PublicTemplateResponse(
        id=t.id,
        template_code=t.template_code,
        job_title=t.title,
        company=t.company,
        job_id=content.get("job_id"),
        job_family=content.get("job_family"),
        job_level=content.get("job_level"),
        department=t.department,
        location=t.location,
        city=content.get("city"),
        country_code=content.get("country_code"),
        seniority=content.get("seniority"),
        salary_range=content.get("salary_range"),
        salary_symbol=content.get("salary_symbol"),
        salary_min_value=content.get("salary_min_value"),
        salary_max_value=content.get("salary_max_value"),
        salary_period=content.get("salary_period"),
        industry=t.industry,
        employment_type=t.employment_type,
        professional_summary=t.professional_summary,
        responsibilities_overview=t.responsibilities_overview,
        key_duties=[WeightedItem(**i) for i in content.get("key_duties", [])],
        core_competencies=[WeightedItem(**i) for i in content.get("core_competencies", [])],
        functional_competencies=[WeightedItem(**i) for i in content.get("functional_competencies", [])],
        qualifications_required=[WeightedItem(**i) for i in content.get("qualifications_required", [])],
        qualifications_preferred=[WeightedItem(**i) for i in content.get("qualifications_preferred", [])],
        required_licenses_certifications=content.get("required_licenses_certifications", []),
        compliance_requirements=content.get("compliance_requirements", []),
        tools_technologies=content.get("tools_technologies", []),
        equal_opportunity_statement=t.eeo_statement,
        is_active=t.is_active,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def _serialize_template(t: Template) -> dict:
    def safe_parse_json(val):
        if not val:
            return []
        if isinstance(val, list):
            return val
        try:
            return json.loads(val)
        except Exception:
            return [val]
    content_val = t.content
    if isinstance(content_val, str):
        try:
            content_val = json.loads(content_val)
        except Exception:
            pass

    return {
        "id": t.id,
        "template_code": t.template_code,
        "title": t.title,
        "industry": t.industry,
        "compliance_tag": t.compliance_tag,
        "is_active": t.is_active,
        "company": t.company,
        "department": t.department,
        "location": t.location,
        "employment_type": t.employment_type,
        "professional_summary": t.professional_summary,
        "responsibilities_overview": t.responsibilities_overview,
        "licenses_and_certifications": safe_parse_json(t.licenses_and_certifications),
        "compliance_requirements": safe_parse_json(t.compliance_requirements),
        "tools_technologies": safe_parse_json(t.tools_technologies),
        "eeo_statement": t.eeo_statement,
        "country_code": t.country_code,
        "creator_id": t.creator_id,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "content": content_val,
    }


_COUNTRY_REGION_FILTER_RE = re.compile(r"^[A-Za-z]{2,10}$")
_MAX_TEMPLATE_LIST_OFFSET = 100_000


def _validate_comma_separated_codes(param: Optional[str], field_name: str) -> Optional[str]:
    """Reject empty or malformed country/region filter values (ZAP path-traversal false positive)."""
    if param is None:
        return None
    stripped = param.strip()
    if not stripped:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"{field_name} must not be empty.")
    if stripped.lower() == "all":
        return stripped
    codes = [part.strip() for part in stripped.split(",") if part.strip()]
    if not codes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Invalid {field_name}.")
    for code in codes:
        if not _COUNTRY_REGION_FILTER_RE.match(code):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Invalid {field_name} value: {code}")
    return stripped


# This route is for global level templates so anyone using our website can use them with industry filter
@router.get("/")
async def list_templates(
    search: Optional[str] = Query(None, description="Global search across title, code, industry, department, and content"),
    title: Optional[str] = Query(None, description="Filter by title"),
    industry: Optional[str] = Query(None, description="Filter by industry (comma-separated for multi-select)"),
    department: Optional[str] = Query(None, description="Filter by department (comma-separated for multi-select)"),
    job_family: Optional[str] = Query(None, description="Filter by job family (comma-separated for multi-select)"),
    seniority: Optional[str] = Query(None, description="Filter by seniority (comma-separated for multi-select)"),
    job_level: Optional[str] = Query(None, description="Filter by job level (comma-separated for multi-select)"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type (comma-separated for multi-select)"),
    template_code: Optional[str] = Query(None, description="Filter by exact template code"),
    region: Optional[str] = Query(None, description="Filter by region/country code (comma-separated)"),
    country_code: Optional[str] = Query(None, description="Filter by specific country code (comma-separated)"),
    sort_by: Optional[str] = Query("created_at", description="Sort by column: title, industry, created_at"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, le=20000, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user),
):
    """List all active system templates with pagination, search, sorting, and advanced filtering."""
    try:
        region = _validate_comma_separated_codes(region, "region")
        country_code = _validate_comma_separated_codes(country_code, "country_code")
        skip = (page - 1) * limit
        if skip > _MAX_TEMPLATE_LIST_OFFSET:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Page number is too large.")
        
        if sort_by and sort_by not in ["title", "industry", "created_at"]:
            raise HTTPException(status_code=400, detail="Invalid sort_by field. Allowed fields: title, industry, created_at.")
        if sort_order and sort_order.lower() not in ["asc", "desc"]:
            raise HTTPException(status_code=400, detail="Invalid sort_order. Allowed values: asc, desc.")
        
        # Run both queries
        templates_task = template_repo.list_system_templates(
            db, search=search, industry=industry, department=department, job_family=job_family, 
            seniority=seniority, job_level=job_level, employment_type=employment_type, 
            template_code=template_code, region=region, country_code=country_code, 
            title=title, sort_by=sort_by, sort_order=sort_order, skip=skip, limit=limit
        )
        total_task = template_repo.count_system_templates(
            db, search=search, industry=industry, department=department, job_family=job_family, 
            seniority=seniority, job_level=job_level, employment_type=employment_type, 
            template_code=template_code, region=region, country_code=country_code, title=title
        )
        
        import asyncio
        templates, total = await asyncio.gather(templates_task, total_task)
        
        logger.info("Retrieved %s templates (page %s, total %s, region %s, country_code %s) for user %s", len(templates), page, total, region, country_code, current_user.id)
        
        return {
            "templates": [_serialize_template(t) for t in templates],
            "total": total,
            "page": page,
            "limit": limit
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_templates failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve templates.")


# This route is used to get all the distinct industries
@router.get("/industries")
async def list_template_industries(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Return a list of distinct industries that have templates."""
    try:
        industries = await template_repo.get_template_industries(db)
        return industries
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_template_industries failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve template industries.")


# This route returns a lightweight summary of all templates
@router.get("/template_details")
async def list_template_summaries(skip: int = 0, limit: int = 1000, db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Return only title, id, job_id, template_code, department, country_code,seniority,job_level for all templates."""
    try:
        summaries = await template_repo.get_all_template_summaries(db, skip=skip, limit=limit)
        return summaries
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_template_summaries failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve template summaries.")


# This route is used to get the template with it's template id
@router.get("/{template_id}")
async def get_template(template_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get a single template by ID."""
    try:
        template = await template_repo.get_template_by_id(db, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return _serialize_template(template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_template failed for template_id=%s", template_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve template.")


def _parse_template_stored_json(value) -> list | str | None:
    """Parse list/json values stored on Template columns or in content blobs."""
    if value is None:
        return None
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            parsed = json.loads(stripped)
            return parsed if isinstance(parsed, list) else stripped
        except json.JSONDecodeError:
            return stripped
    return value


def _list_items_to_weighted(items) -> list[dict]:
    """Convert plain string lists (e.g. licenses) into weighted JD points."""
    if not items:
        return []
    if isinstance(items, str):
        items = [part.strip() for part in items.replace(";", "\n").split("\n") if part.strip()]
    if not isinstance(items, list):
        items = [items]
    points: list[dict] = []
    for item in items:
        if isinstance(item, dict):
            point = str(item.get("point") or item.get("text") or "").strip()
            if point:
                points.append({"point": point, "weight": int(item.get("weight") or 0)})
        elif item is not None:
            point = str(item).strip()
            if point:
                points.append({"point": point, "weight": 0})
    return _to_weighted_points(points) if points else []


def _tools_technologies_to_text(value) -> str:
    if isinstance(value, list):
        return ", ".join(str(item).strip() for item in value if str(item).strip())
    if value is None:
        return ""
    return str(value).strip()


def _compliance_to_text(value) -> str:
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    if value is None:
        return ""
    return str(value).strip()


def _build_template_salary_range(content: dict) -> str | None:
    salary_range = str(content.get("salary_range") or "").strip()
    if salary_range:
        return salary_range
    symbol = str(content.get("salary_symbol") or "").strip()
    min_val = str(content.get("salary_min_value") or "").strip()
    max_val = str(content.get("salary_max_value") or "").strip()
    period = str(content.get("salary_period") or "").strip()
    if symbol and min_val and max_val:
        return f"{symbol}{min_val}{period} - {symbol}{max_val}{period}"
    if symbol and min_val:
        return f"{symbol}{min_val}{period}+"
    return None


async def _create_jd_from_template(db: AsyncSession, template: Template, current_user: User) -> JobDescription:
    """Create a draft JD from a template (shared by /use)."""
    if not current_user.org_id:
        raise ValueError("User has no company assigned")

    template_content = template.content or {}
    content = template_content.get("content") if isinstance(template_content.get("content"), dict) else template_content
    if not isinstance(content, dict):
        content = {}

    licenses_raw = content.get("required_licenses_certifications")
    if not licenses_raw:
        licenses_raw = _parse_template_stored_json(template.licenses_and_certifications)

    compliance_raw = content.get("compliance_requirements")
    if not compliance_raw:
        compliance_raw = _parse_template_stored_json(template.compliance_requirements)

    tools_raw = content.get("tools_technologies")
    if not tools_raw:
        tools_raw = _parse_template_stored_json(template.tools_technologies)

    tools_technologies = _tools_technologies_to_text(tools_raw)

    qualifications_required = content.get("qualifications_required") or []
    if qualifications_required and not any(isinstance(item, dict) for item in qualifications_required):
        qualifications_required = _list_items_to_weighted(qualifications_required)
    elif not qualifications_required and licenses_raw:
        qualifications_required = _list_items_to_weighted(licenses_raw)

    qualifications_preferred = content.get("qualifications_preferred") or []
    if qualifications_preferred and not any(isinstance(item, dict) for item in qualifications_preferred):
        qualifications_preferred = _list_items_to_weighted(qualifications_preferred)

    jd_content = {
        "summary": template.professional_summary or content.get("summary") or content.get("professional_summary") or "",
        "essential_duties_and_responsibilities": template.responsibilities_overview or content.get("essential_duties_and_responsibilities") or content.get("responsibilities_overview") or "",
        "key_duties": content.get("key_duties") or [],
        "core_competencies": content.get("core_competencies") or [],
        "functional_competencies": content.get("functional_competencies") or [],
        "qualifications_required": qualifications_required,
        "qualifications_preferred": qualifications_preferred,
        "eeo_statement": template.eeo_statement or content.get("eeo_statement") or content.get("equal_opportunity_statement") or "",
    }

    jd_content = _normalize_weighted_sections(jd_content)
    jd_content = _build_content_with_view_locks(jd_content)
    core_competencies_stored = json.dumps(jd_content.get("core_competencies")) if jd_content.get("core_competencies") else None
    functional_competencies_stored = json.dumps(jd_content.get("functional_competencies")) if jd_content.get("functional_competencies") else None
    stable_payload = _enforce_stable_jd_payload(jd_content, {})
    jd_content = stable_payload["content"]
    sections_metadata = stable_payload["sections_metadata"]

    seniority = content.get("seniority")
    if seniority:
        seniority = str(seniority).strip()

    job_level = content.get("job_level")
    job_level = job_level if job_level in ("L1", "L2", "L3", "L4", "L5") else None

    salary_range = _build_template_salary_range(content)
    salary_symbol = str(content.get("salary_symbol") or "").strip() or None
    salary_min_value = str(content.get("salary_min_value") or "").strip() or None
    salary_max_value = str(content.get("salary_max_value") or "").strip() or None
    salary_period = str(content.get("salary_period") or "").strip() or None

    additional_context = _compliance_to_text(compliance_raw) or _compliance_to_text(template.compliance_requirements)

    input_prompt = f"Template: {template.title} | {template.industry}"

    new_jd = JobDescription(
        creator_id=current_user.id,
        org_id=current_user.org_id,
        template_id=template.id,
        title=template.title,
        company_name=template.company,
        job_id=str(content.get("job_id") or "").strip(),
        job_family=str(content.get("job_family") or "").strip() or None,
        job_level=job_level,
        department=template.department,
        location=template.location,
        city=str(content.get("city") or "").strip() or None,
        country_code=str(content.get("country_code") or template.country_code or "US").strip(),
        seniority=seniority,
        industry=template.industry,
        employment_type=template.employment_type,
        salary_range=salary_range,
        salary_symbol=salary_symbol,
        salary_min_value=salary_min_value,
        salary_max_value=salary_max_value,
        salary_period=salary_period,
        key_skills=tools_technologies or None,
        core_competencies=core_competencies_stored,
        functional_competencies=functional_competencies_stored,
        additional_context=additional_context or None,
        input_prompt=input_prompt,
        generation_mode="template",
        model_used=None,
        content=jd_content,
        sections_metadata=sections_metadata,
        eeoc_flags=[],
        eeoc_cleared=False,
        status="draft",
        word_count=_content_word_count(jd_content),
    )

    new_jd = await jd_repo.create_job_description(db, jd=new_jd)
    await auth_repo.increment_user_stat(db, current_user.id, "jds_created")
    await cache_service.clear_cache_by_pattern(f"query:jds_{current_user.id}_*")
    return new_jd


@router.post("/public/{template_id}/use", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED)
async def use_public_template(template_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Instantiate a JD directly from public template content (no AI generation)."""
    try:
        template = await template_repo.get_public_template_by_id(db, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no company assigned")

        new_jd = await _create_jd_from_template(db, template, current_user)
        logger.info("Public template %s used to create JD %s by user %s", template_id, new_jd.id, current_user.id)

        new_jd_loaded = await jd_repo.get_jd_by_id(db, new_jd.id)
        if not new_jd_loaded:
            raise HTTPException(status_code=500, detail="Failed to retrieve created JD")

        return JobDescriptionResponse.model_validate(new_jd_loaded)

    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("use_public_template failed", exc)
        await jd_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to create JD from template",)


@router.post("/regenerate_section",response_model=TemplateStandaloneRegenerateSectionResponse,summary="Regenerate a Template section (no saved template required)",description=("Regenerates a single template section using the content that frontend already has. "
        "Pass the section name, its current content, and what you want changed."))
async def standalone_regenerate_template_section(req: TemplateStandaloneRegenerateRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Uses the signed-in user's JD word limits from talentforge_user_word_limits."""
    try:
        word_limits_row = await jd_repo.get_or_create_user_word_limits(db, current_user.id)
        template_data = {
            "title": "Template",
            "industry": "General",
            "content": {req.section_name: req.existing_data},
            "word_count_limits": jd_repo.word_limits_from_model(word_limits_row),
        }

        expansion_instruction = (
            f"The user wants the following change to the '{req.section_name}' template section: "
            f"{req.modification_request}. "
            f"Apply the requested modification while keeping the section professional, "
            f"detailed, and publication-ready. For summary and eeo_statement sections, return as paragraphs. "
            f"For responsibilities and qualifications sections, return as bullet points with appropriate weights."
        )

        result = await regenerate_section(template_data, req.section_name, expansion_instruction)
        new_val = result.get(req.section_name, result)

        is_weighted = False
        sec_obj = template_data.get(req.section_name)
        if isinstance(sec_obj, dict):
            is_weighted = sec_obj.get("type") in ("points", "weighted_list")

        if req.section_name in WEIGHTED_SECTIONS or is_weighted:
            new_val = _to_weighted_points(new_val, req.section_name)

        word_count = result.get("word_count", len(str(new_val)))

        return TemplateStandaloneRegenerateSectionResponse(section=req.section_name,new_content=new_val,word_count=word_count)
    except HTTPException:
        raise
    except Exception:
        logger.exception("standalone_regenerate_template_section failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to regenerate template section. Please try again.")


@router.post("/public/create", response_model=PublicTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_public_template(data: PublicTemplateCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create a system-level template with creator_id=None."""
    require_admin(current_user)
    try:
        content = {
            "job_id": data.job_id,
            "job_family": data.job_family,
            "job_level": data.job_level,
            "city": data.city,
            "country_code": data.country_code,
            "seniority": data.seniority,
            "salary_range": data.salary_range,
            "salary_symbol": data.salary_symbol,
            "salary_min_value": data.salary_min_value,
            "salary_max_value": data.salary_max_value,
            "salary_period": data.salary_period,
            "key_duties": [i.model_dump() for i in data.key_duties],
            "core_competencies": [i.model_dump() for i in data.core_competencies],
            "functional_competencies": [i.model_dump() for i in data.functional_competencies],
            "qualifications_required": [i.model_dump() for i in data.qualifications_required],
            "qualifications_preferred": [i.model_dump() for i in data.qualifications_preferred],
            "required_licenses_certifications": data.required_licenses_certifications,
            "compliance_requirements": data.compliance_requirements,
            "tools_technologies": data.tools_technologies,
        }

        new_template = Template(
            template_code=data.template_code,
            title=data.job_title,
            company=data.company,
            department=data.department,
            location=data.location,
            industry=data.industry,
            employment_type=data.employment_type,
            professional_summary=data.professional_summary,
            responsibilities_overview=data.responsibilities_overview,
            licenses_and_certifications=json.dumps(data.required_licenses_certifications),
            compliance_requirements=json.dumps(data.compliance_requirements),
            tools_technologies=json.dumps(data.tools_technologies),
            eeo_statement=data.equal_opportunity_statement,
            content=content,
            creator_id=None,
            is_active=True,
        )
        db.add(new_template)
        await db.commit()
        await db.refresh(new_template)
        logger.info("create_public_template succeeded: code=%s user=%s", data.template_code, current_user.id)
        return _make_public_template_response(new_template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("create_public_template failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create public template")


@router.get("/public/{template_id}", response_model=PublicTemplateResponse)
async def get_public_template(template_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Fetch a public template for editing."""
    try:
        template = await template_repo.get_template_by_id(db, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return _make_public_template_response(template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_public_template failed for %s", template_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve template")


@router.patch("/public/{template_id}", response_model=PublicTemplateResponse)
async def update_public_template(template_id: UUID,data: PublicTemplateUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update an existing public template."""
    require_admin(current_user)
    try:
        template = await template_repo.get_template_by_id(db, template_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # Update top-level fields
        if data.job_title is not None:
            template.title = data.job_title
        if data.company is not None:
            template.company = data.company
        if data.department is not None:
            template.department = data.department
        if data.location is not None:
            template.location = data.location
        if data.industry is not None:
            template.industry = data.industry
        if data.employment_type is not None:
            template.employment_type = data.employment_type
        if data.professional_summary is not None:
            template.professional_summary = data.professional_summary
        if data.responsibilities_overview is not None:
            template.responsibilities_overview = data.responsibilities_overview
        if data.equal_opportunity_statement is not None:
            template.eeo_statement = data.equal_opportunity_statement
        if data.is_active is not None:
            template.is_active = data.is_active

        # Update content JSONB for lists
        content = dict(template.content or {})
        if data.job_id is not None:
            content["job_id"] = data.job_id
        if data.job_family is not None:
            content["job_family"] = data.job_family
        if data.job_level is not None:
            content["job_level"] = data.job_level
        if data.city is not None:
            content["city"] = data.city
        if data.country_code is not None:
            content["country_code"] = data.country_code
        if data.seniority is not None:
            content["seniority"] = data.seniority
        if data.salary_range is not None:
            content["salary_range"] = data.salary_range
        if data.salary_symbol is not None:
            content["salary_symbol"] = data.salary_symbol
        if data.salary_min_value is not None:
            content["salary_min_value"] = data.salary_min_value
        if data.salary_max_value is not None:
            content["salary_max_value"] = data.salary_max_value
        if data.salary_period is not None:
            content["salary_period"] = data.salary_period
        if data.key_duties is not None:
            content["key_duties"] = [i.model_dump() for i in data.key_duties]
        if data.core_competencies is not None:
            content["core_competencies"] = [i.model_dump() for i in data.core_competencies]
        if data.functional_competencies is not None:
            content["functional_competencies"] = [i.model_dump() for i in data.functional_competencies]
        if data.qualifications_required is not None:
            content["qualifications_required"] = [i.model_dump() for i in data.qualifications_required]
        if data.qualifications_preferred is not None:
            content["qualifications_preferred"] = [i.model_dump() for i in data.qualifications_preferred]
        if data.required_licenses_certifications is not None:
            content["required_licenses_certifications"] = data.required_licenses_certifications
            template.licenses_and_certifications = json.dumps(data.required_licenses_certifications)
        if data.compliance_requirements is not None:
            content["compliance_requirements"] = data.compliance_requirements
            template.compliance_requirements = json.dumps(data.compliance_requirements)
        if data.tools_technologies is not None:
            content["tools_technologies"] = data.tools_technologies
            template.tools_technologies = json.dumps(data.tools_technologies)

        template.content = content

        await db.commit()
        await db.refresh(template)
        logger.info("update_public_template succeeded: id=%s user=%s", template_id, current_user.id)
        return _make_public_template_response(template)
    except HTTPException:
        raise
    except Exception:
        logger.exception("update_public_template failed for %s", template_id)
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update template")


@router.post("/public/bulk-import",response_model=BulkImportSummary,status_code=status.HTTP_200_OK,summary="Bulk-import system templates from Word / PDF files",description=(
        "Upload one or more `.docx` or `.pdf` files (up to 50 per request). "
        "Each file may contain multiple templates separated by a line of `---` or `===`. "
        "Required fields per template: **Template Code**, **Job Title**, **Industry**. "
        "Duplicate `template_code` values are skipped gracefully. "
        "Returns a per-file breakdown with created / skipped / failed counts."
    ),
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "format": "binary",
                                },
                                "description": "One or more .docx or .pdf template files",
                            }
                        },
                        "required": ["files"],
                    }
                }
            },
        }
    },
)
async def bulk_import_templates(files: List[UploadFile] = File(..., description="One or more .docx or .pdf template files"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Parses each uploaded file, extracts all templates found within it, and
    inserts them as system-level templates (creator_id=NULL, is_active=TRUE).
    Duplicate template_code values are skipped without failing the entire batch.
    Requires a valid Bearer token (inherited from router-level dependency).
    """
    require_admin(current_user)
    if len(files) > _MAX_BULK_FILES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Too many files. Maximum {_MAX_BULK_FILES} per request.")

    overall_created = 0
    overall_skipped = 0
    overall_failed = 0
    file_results: List[BulkImportResult] = []

    for upload in files:
        fname = upload.filename or "unknown"
        result = BulkImportResult(filename=fname)
        lower = fname.lower()

        # Validate extension
        if not lower.endswith(_ALLOWED_EXTENSIONS):
            result.failed += 1
            result.errors.append("Unsupported file type. Only .docx and .pdf are accepted.")
            file_results.append(result)
            overall_failed += 1
            continue

        # Read file bytes
        try:
            file_bytes = await upload.read()
        except Exception as exc:
            result.failed += 1
            result.errors.append(f"Could not read file: {exc}")
            file_results.append(result)
            overall_failed += 1
            continue

        # Parse file into template dicts
        try:
            if lower.endswith(".pdf"):
                parsed_list = parser_svc.parse_pdf_bytes(file_bytes, fname)
            else:
                parsed_list = parser_svc.parse_word_bytes(file_bytes, fname)
        except Exception as exc:
            result.failed += 1
            result.errors.append(f"Parse error: {exc}")
            file_results.append(result)
            overall_failed += 1
            continue

        if not parsed_list:
            result.skipped += 1
            result.errors.append("No parseable templates found in file.")
            file_results.append(result)
            overall_skipped += 1
            continue

        # Validate and insert each parsed template
        for idx, tdata in enumerate(parsed_list, start=1):
            label = f"Template #{idx} (code={tdata.get('template_code', 'N/A')})"

            if not tdata.get("template_code"):
                result.failed += 1
                result.errors.append(f"{label}: missing template_code")
                overall_failed += 1
                continue
            if not tdata.get("job_title"):
                result.failed += 1
                result.errors.append(f"{label}: missing job_title")
                overall_failed += 1
                continue
            # if not tdata.get("industry"):
            #     result.failed += 1
            #     result.errors.append(f"{label}: missing industry")
            #     overall_failed += 1
            #     continue

            lic = tdata.get("required_licenses_certifications", [])
            comp = tdata.get("compliance_requirements", [])
            tools = tdata.get("tools_technologies", [])

            content_blob = {
                "job_id": tdata.get("job_id"),
                "job_family": tdata.get("job_family"),
                "job_level": tdata.get("job_level"),
                "city": tdata.get("city"),
                "country_code": tdata.get("country_code"),
                "seniority": tdata.get("seniority"),
                "salary_range": tdata.get("salary_range"),
                "salary_symbol": tdata.get("salary_symbol"),
                "salary_min_value": tdata.get("salary_min_value"),
                "salary_max_value": tdata.get("salary_max_value"),
                "salary_period": tdata.get("salary_period"),
                "key_duties": tdata.get("key_duties", []),
                "core_competencies": tdata.get("core_competencies", []),
                "functional_competencies": tdata.get("functional_competencies", []),
                "qualifications_required": tdata.get("qualifications_required", []),
                "qualifications_preferred": tdata.get("qualifications_preferred", []),
                "required_licenses_certifications": lic,
                "compliance_requirements": comp,
                "tools_technologies": tools,
            }

            new_template = Template(
                template_code=tdata["template_code"],
                title=tdata["job_title"],
                company=tdata.get("company"),
                department=tdata.get("department"),
                location=tdata.get("location"),
                industry=tdata["industry"],
                employment_type=tdata.get("employment_type"),
                professional_summary=tdata.get("professional_summary"),
                responsibilities_overview=tdata.get("responsibilities_overview"),
                licenses_and_certifications=json.dumps(lic),
                compliance_requirements=json.dumps(comp),
                tools_technologies=json.dumps(tools),
                eeo_statement=tdata.get("equal_opportunity_statement"),
                content=content_blob,
                creator_id=None,
                is_active=True,
            )

            try:
                db.add(new_template)
                await db.flush()  # surface duplicate key before commit
                await db.refresh(new_template)
                result.created += 1
                result.created_ids.append(new_template.id)
                overall_created += 1
            except IntegrityError:
                await db.rollback()
                result.skipped += 1
                result.errors.append(f"{label}: template_code already exists — skipped.")
                overall_skipped += 1
            except Exception as exc:
                await db.rollback()
                result.failed += 1
                result.errors.append(f"{label}: DB error — {exc}")
                overall_failed += 1

        # Commit all successful inserts for this file
        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            result.errors.append(f"Commit failed: {exc}")
            logger.exception("bulk_import_templates commit failed for %s", fname)

        logger.info("bulk_import_templates file=%s created=%s skipped=%s failed=%s user=%s",fname, result.created, result.skipped, result.failed, current_user.id)
        file_results.append(result)

    return BulkImportSummary(total_files=len(files),total_created=overall_created,total_skipped=overall_skipped,total_failed=overall_failed,results=file_results)


def _parse_list_column(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, dict)):
        if not value:
            return []
    elif isinstance(value, pd.Series):
        if value.empty:
            return []
    elif pd.isna(value):
        return []
    
    def extract_item_text(item):
        if not item:
            return ""
        if isinstance(item, dict):
            return str(item.get("point") or item.get("text") or "").strip()
        if isinstance(item, str):
            item_str = item.strip()
            if (item_str.startswith('{') and item_str.endswith('}')) or (item_str.startswith('[') and item_str.endswith(']')):
                try:
                    parsed = json.loads(item_str)
                    return extract_item_text(parsed)
                except:
                    try:
                        parsed = ast.literal_eval(item_str)
                        return extract_item_text(parsed)
                    except:
                        pass
            return item_str
        return str(item).strip()

    raw_items = []
    if isinstance(value, str):
        val_str = value.strip()
        if val_str.startswith('[') and val_str.endswith(']'):
            try:
                parsed = json.loads(val_str)
                if isinstance(parsed, list):
                    raw_items = parsed
            except:
                try:
                    parsed = ast.literal_eval(val_str)
                    if isinstance(parsed, list):
                        raw_items = parsed
                except:
                    pass
        if not raw_items:
            parts = re.split(r'[\n;]+', val_str)
            if len(parts) == 1 and ',' in val_str:
                if not ('{' in val_str or '[' in val_str):
                    parts = val_str.split(',')
            raw_items = [p.strip() for p in parts if p.strip()]
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = [value]
        
    result_list = []
    for item in raw_items:
        txt = extract_item_text(item)
        if txt:
            txt = re.sub(r'^(?:[•\-\*]|\d+\.)\s*', '', txt).strip()
            if txt:
                result_list.append(txt)
    return result_list


def _parse_weighted_column(value) -> List[dict]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, dict)):
        if not value:
            return []
    elif isinstance(value, pd.Series):
        if value.empty:
            return []
    elif pd.isna(value):
        return []
    
    def extract_weighted_items(val) -> List[dict]:
        if not val:
            return []
        
        if isinstance(val, dict):
            pt = str(val.get("point") or val.get("text") or "").strip()
            pt = re.sub(r'^(?:[•\-\*]|\d+\.)\s*', '', pt).strip()
            
            if (pt.startswith('{') and pt.endswith('}')) or (pt.startswith('[') and pt.endswith(']')):
                try:
                    nested = json.loads(pt)
                    return extract_weighted_items(nested)
                except:
                    try:
                        nested = ast.literal_eval(pt)
                        return extract_weighted_items(nested)
                    except:
                        pass
            
            try:
                wt = int(float(val.get("weight") or 0))
            except:
                wt = 0
            if pt:
                return [{"point": pt, "weight": wt}]
            return []
            
        if isinstance(val, str):
            val_str = val.strip()
            if (val_str.startswith('[') and val_str.endswith(']')) or (val_str.startswith('{') and val_str.endswith('}')):
                try:
                    parsed = json.loads(val_str)
                    return extract_weighted_items(parsed)
                except:
                    try:
                        parsed = ast.literal_eval(val_str)
                        return extract_weighted_items(parsed)
                    except:
                        pass
            
            lines = []
            if '\n' in val_str:
                lines = val_str.split('\n')
            elif ';' in val_str:
                lines = val_str.split(';')
            else:
                lines = [val_str]
                
            items = []
            for line in lines:
                line_str = line.strip()
                if not line_str:
                    continue
                if (line_str.startswith('{') and line_str.endswith('}')) or (line_str.startswith('[') and line_str.endswith(']')):
                    try:
                        parsed = json.loads(line_str)
                        items.extend(extract_weighted_items(parsed))
                        continue
                    except:
                        try:
                            parsed = ast.literal_eval(line_str)
                            items.extend(extract_weighted_items(parsed))
                            continue
                        except:
                            pass
                pt = re.sub(r'^(?:[•\-\*]|\d+\.)\s*', '', line_str).strip()
                if pt:
                    items.append({"point": pt, "weight": 0})
            return items

        if isinstance(val, list):
            items = []
            for elem in val:
                items.extend(extract_weighted_items(elem))
            return items
            
        pt = re.sub(r'^(?:[•\-\*]|\d+\.)\s*', '', str(val)).strip()
        if pt:
            return [{"point": pt, "weight": 0}]
        return []

    normalized = extract_weighted_items(value)
    
    if not normalized:
        return []
        
    total_weight = sum(item["weight"] for item in normalized)
    n = len(normalized)
    
    if total_weight == 0:
        base_wt = 100 // n
        rem = 100 % n
        for idx_item, item in enumerate(normalized):
            item["weight"] = base_wt + (1 if idx_item < rem else 0)
    elif total_weight != 100:
        factor = 100 / total_weight
        scaled_total = 0
        for item in normalized:
            item["weight"] = max(1, int(item["weight"] * factor))
            scaled_total += item["weight"]
        diff = 100 - scaled_total
        if diff > 0:
            for idx_item in range(diff):
                normalized[idx_item % n]["weight"] += 1
        elif diff < 0:
            for idx_item in range(abs(diff)):
                j = idx_item % n
                if normalized[j]["weight"] > 1:
                    normalized[j]["weight"] -= 1
    
    return normalized



@router.post("/excel-import",response_model=BulkImportSummary,status_code=status.HTTP_200_OK,summary="Import templates from Excel file",description=(
        "Upload an Excel file (.xlsx or .xls) containing template data. "
        "Expected columns: template_code, job_title, industry, company, department, location, "
        "employment_type, professional_summary, responsibilities_overview, "
        "key_duties, core_competencies, functional_competencies, "
        "required_licenses_certifications, compliance_requirements, tools_technologies, "
        "equal_opportunity_statement. "
        "Creates system templates only. Use POST /templates/public/{template_id}/use to create JDs. "
        "Duplicate template_code values are skipped gracefully. "
        "Returns a breakdown with created / skipped / failed counts."))
async def excel_import_templates(file: UploadFile = File(..., description="Excel file containing template data"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Parses an Excel file, extracts template data from each row, and inserts them as
    system-level templates (creator_id=NULL, is_active=TRUE).
    JDs are created separately via POST /templates/public/{template_id}/use.
    """
    require_csod_staff(current_user, detail="Only Admin, HR, and Manager can import templates from Excel")

    user_id = str(current_user.id)

    if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Only Excel files (.xlsx, .xls) are accepted.")

    overall_created = 0
    overall_skipped = 0
    overall_failed = 0
    file_results: List[BulkImportResult] = []

    fname = file.filename or "unknown"
    result = BulkImportResult(filename=fname)

    try:
        # Read Excel file
        file_bytes = await file.read()
        from io import BytesIO
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=0)
        
        # Required columns
        required_columns = ['template_code', 'job_title', 'industry']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=f"Missing required columns: {', '.join(missing_columns)}")

        # Process each row
        for idx, row in df.iterrows():
            label = f"Row #{idx + 2} (code={row.get('template_code', 'N/A')})"

            # Validate required fields
            if pd.isna(row.get('template_code')) or not str(row.get('template_code')).strip():
                result.failed += 1
                result.errors.append(f"{label}: missing template_code")
                overall_failed += 1
                continue
                
            if pd.isna(row.get('job_title')) or not str(row.get('job_title')).strip():
                result.failed += 1
                result.errors.append(f"{label}: missing job_title")
                overall_failed += 1
                continue

            if pd.isna(row.get('industry')) or not str(row.get('industry')).strip():
                result.failed += 1
                result.errors.append(f"{label}: missing industry")
                overall_failed += 1
                continue

            # Validate seniority if provided
            seniority_val = ""
            if not pd.isna(row.get('seniority')) and str(row.get('seniority')).strip():
                try:
                    seniority_val = validate_seniority(str(row.get('seniority')))
                except ValueError as e:
                    result.failed += 1
                    result.errors.append(f"{label}: {str(e)}")
                    overall_failed += 1
                    continue

            # Validate job_level if provided
            job_level_val = ""
            if not pd.isna(row.get('job_level')) and str(row.get('job_level')).strip():
                try:
                    job_level_val = validate_job_level(str(row.get('job_level')).strip())
                except ValueError as e:
                    result.failed += 1
                    result.errors.append(f"{label}: {str(e)}")
                    overall_failed += 1
                    continue

            # Validate salary range if min/max are provided
            salary_min = None
            if not pd.isna(row.get('salary_min_value')) and str(row.get('salary_min_value')).strip():
                salary_min = str(row.get('salary_min_value')).strip()
            
            salary_max = None
            if not pd.isna(row.get('salary_max_value')) and str(row.get('salary_max_value')).strip():
                salary_max = str(row.get('salary_max_value')).strip()

            if salary_min or salary_max:
                try:
                    validate_salary_range(salary_min, salary_max)
                except ValueError as e:
                    result.failed += 1
                    result.errors.append(f"{label}: {str(e)}")
                    overall_failed += 1
                    continue

            # Prepare template data
            template_data = {
                "template_code": str(row['template_code']).strip(),
                "job_title": str(row['job_title']).strip(),
                "company": str(row.get('company', '')).strip() if not pd.isna(row.get('company')) else '',
                "job_id": str(row.get('job_id', '')).strip() if not pd.isna(row.get('job_id')) else '',
                "job_family": str(row.get('job_family', '')).strip() if not pd.isna(row.get('job_family')) else '',
                "job_level": job_level_val,
                "department": str(row.get('department', '')).strip() if not pd.isna(row.get('department')) else '',
                "location": str(row.get('location', '')).strip() if not pd.isna(row.get('location')) else '',
                "city": str(row.get('city', '')).strip() if not pd.isna(row.get('city')) else '',
                "country_code": str(row.get('country_code', '')).strip() if not pd.isna(row.get('country_code')) else '',
                "seniority": seniority_val,
                "salary_range": str(row.get('salary_range', '')).strip() if not pd.isna(row.get('salary_range')) else '',
                "salary_symbol": str(row.get('salary_symbol', '')).strip() if not pd.isna(row.get('salary_symbol')) else '',
                "salary_min_value": salary_min if salary_min is not None else '',
                "salary_max_value": salary_max if salary_max is not None else '',
                "salary_period": str(row.get('salary_period', '')).strip() if not pd.isna(row.get('salary_period')) else '',
                "industry": str(row['industry']).strip(),
                "employment_type": str(row.get('employment_type', '')).strip() if not pd.isna(row.get('employment_type')) else '',
                "professional_summary": str(row.get('professional_summary', '')).strip() if not pd.isna(row.get('professional_summary')) else '',
                "responsibilities_overview": str(row.get('responsibilities_overview', '')).strip() if not pd.isna(row.get('responsibilities_overview')) else '',
                "key_duties": _parse_weighted_column(row.get('key_duties')),
                "core_competencies": _parse_weighted_column(row.get('core_competencies')),
                "functional_competencies": _parse_weighted_column(row.get('functional_competencies')),
                "qualifications_required": _parse_weighted_column(row.get('qualifications_required')),
                "qualifications_preferred": _parse_weighted_column(row.get('qualifications_preferred')),
                "required_licenses_certifications": _parse_list_column(row.get('required_licenses_certifications')),
                "compliance_requirements": _parse_list_column(row.get('compliance_requirements')),
                "tools_technologies": _parse_list_column(row.get('tools_technologies')),
                "equal_opportunity_statement": str(row.get('equal_opportunity_statement', '')).strip() if not pd.isna(row.get('equal_opportunity_statement')) else '',
            }

            # Create content blob
            content_blob = {
                "job_id": template_data["job_id"],
                "job_family": template_data["job_family"],
                "job_level": template_data["job_level"],
                "city": template_data["city"],
                "country_code": template_data["country_code"],
                "seniority": template_data["seniority"],
                "salary_range": template_data["salary_range"],
                "salary_symbol": template_data["salary_symbol"],
                "salary_min_value": template_data["salary_min_value"],
                "salary_max_value": template_data["salary_max_value"],
                "salary_period": template_data["salary_period"],
                "key_duties": template_data["key_duties"],
                "core_competencies": template_data["core_competencies"],
                "functional_competencies": template_data["functional_competencies"],
                "qualifications_required": template_data["qualifications_required"],
                "qualifications_preferred": template_data["qualifications_preferred"],
                "required_licenses_certifications": template_data["required_licenses_certifications"],
                "compliance_requirements": template_data["compliance_requirements"],
                "tools_technologies": template_data["tools_technologies"],
            }

            template_code = str(row['template_code']).strip()
            existing_template = await template_repo.get_template_by_code(db, template_code)

            if existing_template:
                result.skipped += 1
                result.errors.append(f"{label}: template_code already exists — skipped.")
                overall_skipped += 1
                continue

            new_template = Template(
                template_code=template_data["template_code"],
                title=template_data["job_title"],
                company=template_data["company"],
                department=template_data["department"],
                location=template_data["location"],
                country_code=template_data["country_code"],
                industry=template_data["industry"],
                employment_type=template_data["employment_type"],
                professional_summary=template_data["professional_summary"],
                responsibilities_overview=template_data["responsibilities_overview"],
                licenses_and_certifications=json.dumps(template_data["required_licenses_certifications"]),
                compliance_requirements=json.dumps(template_data["compliance_requirements"]),
                tools_technologies=json.dumps(template_data["tools_technologies"]),
                eeo_statement=template_data["equal_opportunity_statement"],
                content=content_blob,
                creator_id=None,
                is_active=True,
            )

            try:
                async with db.begin_nested():
                    db.add(new_template)
                    await db.flush()
                    await db.refresh(new_template)
                result.created += 1
                result.created_ids.append(new_template.id)
                overall_created += 1
            except IntegrityError:
                result.skipped += 1
                result.errors.append(f"{label}: template_code already exists — skipped.")
                overall_skipped += 1
            except Exception as exc:
                result.failed += 1
                result.errors.append(f"{label}: DB error — {exc}")
                overall_failed += 1

        # Commit all successful inserts
        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            result.errors.append(f"Commit failed: {exc}")
            logger.exception("excel_import_templates commit failed for %s", fname)

        logger.info("excel_import_templates file=%s created=%s skipped=%s failed=%s user=%s",fname, result.created, result.skipped, result.failed, user_id)
        file_results.append(result)

    except HTTPException:
        raise
    except Exception as exc:
        result.failed += 1
        result.errors.append(f"Excel processing error: {exc}")
        file_results.append(result)
        overall_failed += 1
        logger.exception("excel_import_templates failed for %s", fname)

    return BulkImportSummary(total_files=1,total_created=overall_created,total_skipped=overall_skipped,total_failed=overall_failed,results=file_results)
