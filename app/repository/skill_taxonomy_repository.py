from __future__ import annotations
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import TalentForgeJobSet, TalentForgeSkillSet, OrganizationType
from app.schemas.schemas import TalentForgeJobSetCreate, TalentForgeSkillSetCreate, OrganizationTypeCreate

async def list_organization_types(db: AsyncSession, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[OrganizationType]:
    query = select(OrganizationType)
    if search:
        query = query.where(OrganizationType.organization_type_name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_organization_type_by_id(db: AsyncSession, organization_type_id: str) -> Optional[OrganizationType]:
    result = await db.execute(select(OrganizationType).where(OrganizationType.organization_type_id == organization_type_id))
    return result.scalar_one_or_none()


async def create_organization_type(db: AsyncSession, org_type: OrganizationTypeCreate) -> OrganizationType:
    new_org_type = OrganizationType(**org_type.model_dump(exclude_none=True))
    db.add(new_org_type)
    try:
        await db.commit()
        await db.refresh(new_org_type)
        return new_org_type
    except Exception:
        await db.rollback()
        raise


async def list_job_sets(db: AsyncSession,search: Optional[str] = None,organization_type_id: Optional[str] = None,skip: int = 0,limit: int = 100) -> List[TalentForgeJobSet]:
    query = select(TalentForgeJobSet)
    if search:
        query = query.where(TalentForgeJobSet.name.ilike(f"%{search}%"))
    if organization_type_id:
        query = query.where(TalentForgeJobSet.organization_type_id == organization_type_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_job_set_by_id(db: AsyncSession, talentforge_job_title_id: str) -> Optional[TalentForgeJobSet]:
    result = await db.execute(select(TalentForgeJobSet).where(TalentForgeJobSet.talentforge_job_title_id == talentforge_job_title_id))
    return result.scalar_one_or_none()


async def create_job_set(db: AsyncSession, job_set: TalentForgeJobSetCreate) -> TalentForgeJobSet:
    new_job_set = TalentForgeJobSet(**job_set.model_dump(exclude_none=True))
    db.add(new_job_set)
    try:
        await db.commit()
        await db.refresh(new_job_set)
        return new_job_set
    except Exception:
        await db.rollback()
        raise


async def list_skill_sets(db: AsyncSession,search: Optional[str] = None,talentforge_job_set_id: Optional[str] = None,organization_type_id: Optional[str] = None,skip: int = 0,limit: int = 100) -> List[TalentForgeSkillSet]:
    query = select(TalentForgeSkillSet)
    if search:
        query = query.where(TalentForgeSkillSet.name.ilike(f"%{search}%"))
    if talentforge_job_set_id:
        query = query.where(TalentForgeSkillSet.talentforge_job_set_id == talentforge_job_set_id)
    if organization_type_id:
        query = query.join(TalentForgeSkillSet.talentforge_job_set).where(TalentForgeJobSet.organization_type_id == organization_type_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_skill_set_by_id(db: AsyncSession, talentforge_skill_id: str) -> Optional[TalentForgeSkillSet]:
    result = await db.execute(select(TalentForgeSkillSet).where(TalentForgeSkillSet.talentforge_skill_id == talentforge_skill_id))
    return result.scalar_one_or_none()


async def create_skill_set(db: AsyncSession, skill_set: TalentForgeSkillSetCreate) -> TalentForgeSkillSet:
    new_skill_set = TalentForgeSkillSet(**skill_set.model_dump(exclude_none=True))
    db.add(new_skill_set)
    try:
        await db.commit()
        await db.refresh(new_skill_set)
        return new_skill_set
    except Exception:
        await db.rollback()
        raise
