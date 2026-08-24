from __future__ import annotations
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Competency, User
from app.repository import competency_repository as comp_repo
from app.schemas.schemas import CompetencyCreate, CompetencyUpdate
from app.core.logging import get_logger

logger = get_logger()

async def add_competency(db: AsyncSession, data: CompetencyCreate, current_user: User, org_id: UUID) -> Competency:
    """Add a new competency with audit fields. Uses org_id from current_user for security."""
    new_competency = Competency(competency_name=data.competencyName,category_name=data.categoryName,
        org_id=org_id,  # Security: Use org_id from current_user, not from request body
        description=data.description,created_by=current_user.id,updated_by=current_user.id)
    
    try:
        return await comp_repo.create_competency(db, new_competency)
    except Exception as e:
        logger.error(f"Failed to create competency: {e}")
        # Check for unique constraint violation (if any) or other DB errors
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create competency. It might already exist or there was a database error.")

async def get_competencies(db: AsyncSession, category_name: Optional[str] = None, org_id: Optional[UUID] = None) -> List[Competency]:
    """Retrieve competencies with optional filtering."""
    return await comp_repo.get_competencies(db, category_name=category_name, org_id=org_id)

_COMPETENCY_UPDATE_FIELDS = {
    "competencyName": "competency_name",
    "categoryName": "category_name",
    "description": "description",
}


async def update_competency(db: AsyncSession,competency_id: UUID,data: CompetencyUpdate,current_user: User,user_org_id: UUID) -> Competency:
    """Update a competency after verifying org ownership."""
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,detail="At least one field must be provided")
    competency = await comp_repo.get_competency_by_id(db, competency_id)
    if not competency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency not found")
    if competency.org_id != user_org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Cannot update competency from another organization")
    for key, value in updates.items():
        setattr(competency, _COMPETENCY_UPDATE_FIELDS[key], value)
    competency.updated_by = current_user.id
    try:
        return await comp_repo.update_competency(db, competency)
    except Exception as e:
        logger.error(f"Failed to update competency: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Failed to update competency. It might already exist or there was a database error.")


async def delete_competency(db: AsyncSession, competency_id: UUID, user_org_id: UUID) -> bool:
    """Delete a competency after verifying org ownership. Return success status."""
    competency = await comp_repo.get_competency_by_id(db, competency_id)
    if not competency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency not found")
    # Security: Verify competency belongs to user's org
    if competency.org_id != user_org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete competency from another organization")
    return await comp_repo.delete_competency(db, competency_id)

