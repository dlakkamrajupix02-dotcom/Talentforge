from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import SabaJobDescription
import uuid
from typing import List, Optional

class SabaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_saba_jd(self, jd_data: SabaJobDescription) -> SabaJobDescription:
        self.db.add(jd_data)
        await self.db.flush()
        return jd_data

    async def get_saba_jds_by_org(self, org_id: uuid.UUID) -> List[SabaJobDescription]:
        result = await self.db.execute(select(SabaJobDescription).where(SabaJobDescription.org_id == org_id))
        return list(result.scalars().all())

    async def get_saba_jd_by_id(self, jd_id: uuid.UUID) -> Optional[SabaJobDescription]:
        result = await self.db.execute(select(SabaJobDescription).where(SabaJobDescription.id == jd_id))
        return result.scalar_one_or_none()

    async def get_saba_jd_by_job_id(self, job_id: str, org_id: uuid.UUID) -> Optional[SabaJobDescription]:
        result = await self.db.execute(select(SabaJobDescription).where(SabaJobDescription.job_id == job_id,SabaJobDescription.org_id == org_id))
        return result.scalar_one_or_none()

    async def delete_saba_jd(self, jd: SabaJobDescription) -> None:
        await self.db.delete(jd)
        await self.db.flush()
