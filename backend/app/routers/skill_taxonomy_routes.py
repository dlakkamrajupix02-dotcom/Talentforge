from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.logging import log_exception_one_line
from app.models.models import User
from app.schemas.schemas import (TalentForgeJobSetCreate,TalentForgeJobSetResponse,TalentForgeSkillSetCreate,TalentForgeSkillSetResponse,OrganizationTypeCreate,OrganizationTypeResponse)
from app.services.dependencies import get_current_regular_user
from app.services.skill_taxonomy_service import skill_taxonomy_service

logger = get_logger()

router = APIRouter(prefix="/skill-taxonomy",tags=["Skill Taxonomy"],dependencies=[Depends(get_current_regular_user)],include_in_schema=False)


@router.get("/get-organization-types", response_model=List[OrganizationTypeResponse])
async def get_organization_types(search: Optional[str] = Query(None, description="Search by organization type name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        org_types = await skill_taxonomy_service.get_all_organization_types(db, search, skip, limit)
        logger.info("Retrieved %s organization types for user %s", len(org_types), current_user.id)
        return org_types
    except Exception as exc:
        log_exception_one_line("get_organization_types failed", exc)
        raise HTTPException( status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve organization types.")


@router.get("/get-organization-type-by-id/{organization_type_id}", response_model=OrganizationTypeResponse)
async def get_organization_type_by_id(organization_type_id: str = Path(..., description="The ID of the organization type"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        org_type = await skill_taxonomy_service.get_organization_type_by_id(db, organization_type_id)
        if not org_type:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization type not found")
        return org_type
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("get_organization_type_by_id failed", exc, organization_type_id=organization_type_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve organization type.")


@router.post("/create-organization-type", response_model=OrganizationTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_organization_type(org_type: OrganizationTypeCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        new_org_type = await skill_taxonomy_service.create_organization_type(db, org_type)
        logger.info("User %s created organization type: %s", current_user.id, new_org_type.organization_type_id)
        return new_org_type
    except Exception as exc:
        log_exception_one_line("create_organization_type failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to create organization type. Please try again.")


@router.get("/get-job-sets", response_model=List[TalentForgeJobSetResponse])
async def get_job_sets(search: Optional[str] = Query(None, description="Search by job set name"),organization_type_id: Optional[str] = Query(None, description="Filter by organization type ID"),skip: int = Query(0, ge=0),limit: int = Query(100, ge=1, le=500),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        job_sets = await skill_taxonomy_service.get_all_job_sets(db, search, organization_type_id, skip, limit)
        logger.info("Retrieved %s job sets for user %s", len(job_sets), current_user.id)
        return job_sets
    except Exception as exc:
        log_exception_one_line("get_job_sets failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve job sets.",)


@router.get("/get-job-set-by-id/{talentforge_job_title_id}", response_model=TalentForgeJobSetResponse)
async def get_job_set_by_id(talentforge_job_title_id: str = Path(..., description="The ID of the job set"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        job_set = await skill_taxonomy_service.get_job_set_by_id(db, talentforge_job_title_id)
        if not job_set:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job set not found")
        return job_set
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("get_job_set_by_id failed", exc, talentforge_job_title_id=talentforge_job_title_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve job set.",)


@router.post("/create-job-set", response_model=TalentForgeJobSetResponse, status_code=status.HTTP_201_CREATED)
async def create_job_set(job_set: TalentForgeJobSetCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        new_job_set = await skill_taxonomy_service.create_job_set(db, job_set)
        logger.info("User %s created job set: %s", current_user.id, new_job_set.talentforge_job_title_id)
        return new_job_set
    except Exception as exc:
        log_exception_one_line("create_job_set failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to create job set. Please try again.",)


@router.get("/get-skill-sets", response_model=List[TalentForgeSkillSetResponse])
async def get_skill_sets(search: Optional[str] = Query(None, description="Search by skill name"),talentforge_job_set_id: Optional[str] = Query(None, description="Filter by job set ID"),organization_type_id: Optional[str] = Query(None, description="Filter by organization type ID"),skip: int = Query(0, ge=0),limit: int = Query(100, ge=1, le=500),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        skill_sets = await skill_taxonomy_service.get_all_skill_sets(db, search, talentforge_job_set_id, organization_type_id, skip, limit)
        logger.info("Retrieved %s skill sets for user %s", len(skill_sets), current_user.id)
        return skill_sets
    except Exception as exc:
        log_exception_one_line("get_skill_sets failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve skill sets.")


@router.get("/get-skill-set-by-id/{talentforge_skill_id}", response_model=TalentForgeSkillSetResponse)
async def get_skill_set_by_id(talentforge_skill_id: str = Path(..., description="The ID of the skill set"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        skill_set = await skill_taxonomy_service.get_skill_set_by_id(db, talentforge_skill_id)
        if not skill_set:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill set not found")
        return skill_set
    except HTTPException:
        raise
    except Exception as exc:
        log_exception_one_line("get_skill_set_by_id failed", exc, talentforge_skill_id=talentforge_skill_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve skill set.",)


@router.post("/create-skill-set", response_model=TalentForgeSkillSetResponse, status_code=status.HTTP_201_CREATED)
async def create_skill_set(skill_set: TalentForgeSkillSetCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    try:
        new_skill_set = await skill_taxonomy_service.create_skill_set(db, skill_set)
        logger.info("User %s created skill set: %s", current_user.id, new_skill_set.talentforge_skill_id)
        return new_skill_set
    except Exception as exc:
        log_exception_one_line("create_skill_set failed", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to create skill set. Please try again.")
