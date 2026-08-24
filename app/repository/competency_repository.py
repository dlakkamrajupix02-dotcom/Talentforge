from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Competency

async def create_competency(db: AsyncSession, competency: Competency) -> Competency:
    """Create a new competency."""
    db.add(competency)
    await db.commit()
    await db.refresh(competency)
    return competency

async def get_competencies(
    db: AsyncSession, 
    category_name: Optional[str] = None, 
    org_id: Optional[UUID] = None
) -> List[Competency]:
    """Get competencies with optional filtering."""
    query = select(Competency)
    if category_name:
        query = query.where(Competency.category_name == category_name)
    if org_id:
        query = query.where(Competency.org_id == org_id)
    
    result = await db.execute(query)
    return list(result.scalars().all())

async def delete_competency(db: AsyncSession, competency_id: UUID) -> bool:
    """Delete a competency by ID."""
    stmt = delete(Competency).where(Competency.competency_id == competency_id)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def get_competency_by_id(db: AsyncSession, competency_id: UUID) -> Optional[Competency]:
    """Get competency by ID."""
    result = await db.execute(select(Competency).where(Competency.competency_id == competency_id))
    return result.scalar_one_or_none()


async def update_competency(db: AsyncSession, competency: Competency) -> Competency:
    """Persist competency field updates."""
    await db.commit()
    await db.refresh(competency)
    return competency
