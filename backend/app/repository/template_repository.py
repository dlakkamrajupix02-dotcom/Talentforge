from __future__ import annotations
from typing import Optional
from uuid import UUID
from sqlalchemy import  select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Template


def _parse_multi_select(param: Optional[str]) -> list[str]:
    if not param or param.lower() == "all":
        return []
    return [p.strip() for p in param.split(",") if p.strip()]

async def list_system_templates(db: AsyncSession, *, search: Optional[str] = None,industry: Optional[str] = None, department: Optional[str] = None,
    job_family: Optional[str] = None,seniority: Optional[str] = None,job_level: Optional[str] = None,employment_type: Optional[str] = None,
    template_code: Optional[str] = None,
    region: Optional[str] = None, 
    country_code: Optional[str] = None, 
    title: Optional[str] = None, sort_by: Optional[str] = None,sort_order: Optional[str] = "desc",skip: int = 0, limit: int = 50) -> list[Template]:
    """List all active system templates with advanced filtering, search, and sorting."""
    from sqlalchemy import or_, and_, asc, desc
    
    query = select(Template).where(Template.is_active, Template.deleted_at.is_(None), Template.creator_id.is_(None))
    
    industries = _parse_multi_select(industry)
    if industries:
        query = query.where(Template.industry.in_(industries))
        
    departments = _parse_multi_select(department)
    if departments:
        query = query.where(Template.department.in_(departments))
        
    job_families = _parse_multi_select(job_family)
    if job_families:
        query = query.where(Template.content["job_family"].astext.in_(job_families))
        
    seniorities = _parse_multi_select(seniority)
    if seniorities:
        query = query.where(Template.content["seniority"].astext.in_(seniorities))
        
    job_levels = _parse_multi_select(job_level)
    if job_levels:
        query = query.where(Template.content["job_level"].astext.in_(job_levels))
        
    employment_types = _parse_multi_select(employment_type)
    if employment_types:
        query = query.where(Template.employment_type.in_(employment_types))
        
    regions = _parse_multi_select(region)
    if regions:
        query = query.where(or_(Template.location.in_(regions),Template.content["country_code"].astext.in_(regions),Template.content["region"].astext.in_(regions)))
        
    country_codes = _parse_multi_select(country_code)
    if country_codes:
        query = query.where(Template.country_code.in_(country_codes))
        
    if template_code:
        query = query.where(Template.template_code == template_code)
        
    if title and title.lower() != "all":
        query = query.where(Template.title.ilike(f"%{title}%"))

    if search:
        search_term = f"%{search.replace(' ', '%')}%"
        query = query.where(
            or_(
                Template.title.ilike(search_term),
                Template.template_code.ilike(search_term),
                Template.industry.ilike(search_term),
                Template.department.ilike(search_term),
                Template.professional_summary.ilike(search_term),
                Template.responsibilities_overview.ilike(search_term),
                Template.content["job_family"].astext.ilike(search_term)
            )
        )

    sort_column = Template.created_at
    if sort_by == "title":
        sort_column = Template.title
    elif sort_by == "industry":
        sort_column = Template.industry

    if sort_order and sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def count_system_templates(
    db: AsyncSession, *, 
    search: Optional[str] = None,
    industry: Optional[str] = None, 
    department: Optional[str] = None,
    job_family: Optional[str] = None,
    seniority: Optional[str] = None,
    job_level: Optional[str] = None,
    employment_type: Optional[str] = None,
    template_code: Optional[str] = None,
    region: Optional[str] = None, 
    country_code: Optional[str] = None, 
    title: Optional[str] = None
) -> int:
    """Count total active system templates with advanced filtering and search."""
    from sqlalchemy import func, or_, and_
    
    query = select(func.count(Template.id)).where(Template.is_active, Template.deleted_at.is_(None), Template.creator_id.is_(None))
    
    industries = _parse_multi_select(industry)
    if industries:
        query = query.where(Template.industry.in_(industries))
        
    departments = _parse_multi_select(department)
    if departments:
        query = query.where(Template.department.in_(departments))
        
    job_families = _parse_multi_select(job_family)
    if job_families:
        query = query.where(Template.content["job_family"].astext.in_(job_families))
        
    seniorities = _parse_multi_select(seniority)
    if seniorities:
        query = query.where(Template.content["seniority"].astext.in_(seniorities))
        
    job_levels = _parse_multi_select(job_level)
    if job_levels:
        query = query.where(Template.content["job_level"].astext.in_(job_levels))
        
    employment_types = _parse_multi_select(employment_type)
    if employment_types:
        query = query.where(Template.employment_type.in_(employment_types))
        
    regions = _parse_multi_select(region)
    if regions:
        query = query.where(
            or_(
                Template.location.in_(regions),
                Template.content["country_code"].astext.in_(regions),
                Template.content["region"].astext.in_(regions)
            )
        )
        
    country_codes = _parse_multi_select(country_code)
    if country_codes:
        query = query.where(Template.country_code.in_(country_codes))
        
    if template_code:
        query = query.where(Template.template_code == template_code)
        
    if title and title.lower() != "all":
        query = query.where(Template.title.ilike(f"%{title}%"))

    if search:
        search_term = f"%{search.replace(' ', '%')}%"
        query = query.where(
            or_(
                Template.title.ilike(search_term),
                Template.template_code.ilike(search_term),
                Template.industry.ilike(search_term),
                Template.department.ilike(search_term),
                Template.professional_summary.ilike(search_term),
                Template.responsibilities_overview.ilike(search_term),
                Template.content["job_family"].astext.ilike(search_term)
            )
        )
        
    result = await db.execute(query)
    return result.scalar() or 0


async def get_template_industries(db: AsyncSession) -> list[str]:
    """Return a list of distinct industries that have system templates."""
    result = await db.execute(select(Template.industry).where(Template.is_active, Template.deleted_at.is_(None), Template.creator_id.is_(None)).distinct())
    return [row[0] for row in result.all()]


async def get_template_by_id(db: AsyncSession, template_id: UUID) -> Optional[Template]:
    """Get a single template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    return result.scalar_one_or_none()


async def get_system_template_by_id(db: AsyncSession, template_id: UUID) -> Optional[Template]:
    """Get a single active system template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id,Template.creator_id.is_(None),Template.deleted_at.is_(None),Template.is_active.is_(True)))
    return result.scalar_one_or_none()


async def get_public_template_by_id(db: AsyncSession, template_id: UUID) -> Optional[Template]:
    """Get a single active public template by ID (system or user-created)."""
    result = await db.execute(select(Template).where(Template.id == template_id, Template.deleted_at.is_(None), Template.is_active.is_(True)))
    return result.scalar_one_or_none()


async def get_template_by_code(db: AsyncSession, template_code: str) -> Optional[Template]:
    """Get a template by its template_code (case-insensitive)."""
    result = await db.execute(select(Template).where(Template.template_code.ilike(template_code)))
    return result.scalar_one_or_none()


async def get_all_template_summaries(db: AsyncSession, skip: int = 0, limit: int = 1000) -> list[dict]:
    """Get summarized details for all active system templates."""
    query = select(Template.id,Template.title,Template.template_code,Template.department,Template.country_code,
        Template.content["job_id"].astext.label("job_id"),
        Template.content["job_level"].astext.label("job_level"),
        Template.content["seniority"].astext.label("seniority"),
    ).where(Template.is_active.is_(True),Template.deleted_at.is_(None),Template.creator_id.is_(None)).offset(skip).limit(limit)
    result = await db.execute(query)
    summaries = []
    for row in result.all():
        summaries.append({
            "id": row.id,
            "title": row.title,
            "template_code": row.template_code,
            "department": row.department,
            "country_code": row.country_code,
            "job_id": row.job_id,
            "job_level": row.job_level,
            "seniority": row.seniority
        })
    return summaries
