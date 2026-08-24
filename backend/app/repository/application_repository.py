from __future__ import annotations
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import JobApplication, JobDescription


async def get_public_view_jd(db: AsyncSession, public_jd_id: UUID) -> JobDescription | None:
    query = select(JobDescription).where(and_(JobDescription.id == public_jd_id,JobDescription.status == "public_view",JobDescription.deleted_at.is_(None)))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_original_jd(db: AsyncSession, original_jd_id: UUID, org_id: UUID) -> JobDescription | None:
    query = select(JobDescription).where(and_(JobDescription.id == original_jd_id,JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None)))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_job_application(db: AsyncSession, application_data: dict) -> JobApplication:
    application = JobApplication(**application_data)
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application


async def list_job_applications(db: AsyncSession,org_id: UUID,public_jd_id: Optional[UUID] = None,status: Optional[str] = None,applicant_email: Optional[str] = None) -> List[JobApplication]:
    query = select(JobApplication).where(JobApplication.org_id == org_id)
    if public_jd_id:
        query = query.where(JobApplication.public_jd_id == public_jd_id)
    if status:
        query = query.where(JobApplication.status == status)
    if applicant_email:
        query = query.where(JobApplication.applicant_email == applicant_email)
    query = query.order_by(JobApplication.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_job_application_by_id(db: AsyncSession, application_id: UUID, org_id: UUID) -> Optional[JobApplication]:
    query = select(JobApplication).where(and_(JobApplication.id == application_id,JobApplication.org_id == org_id))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_job_application(db: AsyncSession, application_id: UUID, org_id: UUID, update_data: dict) -> Optional[JobApplication]:
    query = select(JobApplication).where(and_(JobApplication.id == application_id,JobApplication.org_id == org_id))
    result = await db.execute(query)
    application = result.scalar_one_or_none()
    if application is None:
        return None
    for key, value in update_data.items():
        if hasattr(application, key):
            setattr(application, key, value)
    await db.commit()
    await db.refresh(application)
    return application
