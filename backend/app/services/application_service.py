from __future__ import annotations
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repository.application_repository import create_job_application,get_job_application_by_id,list_job_applications,get_public_view_jd,get_original_jd,update_job_application
from app.models.models import User


class JobApplicationService:
    async def submit_application(self,db: AsyncSession,org_id: UUID,public_jd_id: UUID,original_jd_id: UUID,applicant_name: str,applicant_email: str,applicant_phone: str | None = None,source: str | None = None,metadata: dict | None = None):
        public_jd = await get_public_view_jd(db, public_jd_id)
        if not public_jd or public_jd.org_id != org_id:
            raise ValueError("Public view JD not found or access denied")
        original_jd = await get_original_jd(db, original_jd_id, org_id)
        if not original_jd:
            raise ValueError("Original JD not found or access denied")
        if public_jd.parent_jd_id is not None and public_jd.parent_jd_id != original_jd_id:
            raise ValueError("Original JD does not match public view JD")
        application_data = {
            "org_id": org_id,
            "public_jd_id": public_jd_id,
            "original_jd_id": original_jd_id,
            "applicant_name": applicant_name,
            "applicant_email": applicant_email,
            "applicant_phone": applicant_phone,
            "source": source or "TalentForge",
            "status": "applied",
            "application_metadata": metadata or {},
        }
        return await create_job_application(db, application_data)


    async def list_applications(self,db: AsyncSession,org_id: UUID,public_jd_id: UUID | None = None,status: str | None = None,applicant_email: str | None = None):
        return await list_job_applications(db, org_id, public_jd_id=public_jd_id, status=status, applicant_email=applicant_email)
    

    async def get_application(self, db: AsyncSession, application_id: UUID, org_id: UUID):
        return await get_job_application_by_id(db, application_id, org_id)
    

    async def update_application(self, db: AsyncSession, application_id: UUID, org_id: UUID, update_data: dict):
        return await update_job_application(db, application_id, org_id, update_data)


job_application_service = JobApplicationService()
