from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import TalentForgeJobSet, TalentForgeSkillSet, OrganizationType
from app.repository import skill_taxonomy_repository as taxonomy_repo
from app.schemas.schemas import TalentForgeJobSetCreate, TalentForgeSkillSetCreate, OrganizationTypeCreate


class SkillTaxonomyService:
    async def get_all_organization_types(self, db: AsyncSession, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[OrganizationType]:
        return await taxonomy_repo.list_organization_types(db, search, skip, limit)

    async def get_organization_type_by_id(self, db: AsyncSession, organization_type_id: str) -> Optional[OrganizationType]:
        return await taxonomy_repo.get_organization_type_by_id(db, organization_type_id)

    async def create_organization_type(self, db: AsyncSession, org_type: OrganizationTypeCreate) -> OrganizationType:
        return await taxonomy_repo.create_organization_type(db, org_type)

    async def get_all_job_sets(self,db: AsyncSession,search: Optional[str] = None,organization_type_id: Optional[str] = None,
        skip: int = 0,limit: int = 100,) -> List[TalentForgeJobSet]:
        return await taxonomy_repo.list_job_sets(db, search, organization_type_id, skip, limit)

    async def get_job_set_by_id(self, db: AsyncSession, talentforge_job_title_id: str) -> Optional[TalentForgeJobSet]:
        return await taxonomy_repo.get_job_set_by_id(db, talentforge_job_title_id)

    async def create_job_set(self, db: AsyncSession, job_set: TalentForgeJobSetCreate) -> TalentForgeJobSet:
        return await taxonomy_repo.create_job_set(db, job_set)

    async def get_all_skill_sets(self,db: AsyncSession,search: Optional[str] = None,talentforge_job_set_id: Optional[str] = None,
        organization_type_id: Optional[str] = None,skip: int = 0,limit: int = 100,) -> List[TalentForgeSkillSet]:
        return await taxonomy_repo.list_skill_sets(db, search, talentforge_job_set_id, organization_type_id, skip, limit)

    async def get_skill_set_by_id(self, db: AsyncSession, talentforge_skill_id: str) -> Optional[TalentForgeSkillSet]:
        return await taxonomy_repo.get_skill_set_by_id(db, talentforge_skill_id)

    async def create_skill_set(self, db: AsyncSession, skill_set: TalentForgeSkillSetCreate) -> TalentForgeSkillSet:
        return await taxonomy_repo.create_skill_set(db, skill_set)


skill_taxonomy_service = SkillTaxonomyService()
