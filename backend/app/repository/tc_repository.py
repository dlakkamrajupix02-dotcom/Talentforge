from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import TermsAndConditions

async def create_tc(db: AsyncSession, org_id: UUID, content: str, is_active: bool = True) -> TermsAndConditions:
    """Create a new terms and conditions record."""
    tc = TermsAndConditions(org_id=org_id, content=content, is_active=is_active)
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc

async def deactivate_others(db: AsyncSession, org_id: UUID, current_tc_id: UUID) -> None:
    """Deactivate all other terms and conditions records for the organization."""
    from sqlalchemy import update
    await db.execute(update(TermsAndConditions).where(TermsAndConditions.org_id == org_id, TermsAndConditions.id != current_tc_id)
        .values(is_active=False))
    await db.commit()

async def get_tc_by_id(db: AsyncSession, tc_id: UUID) -> Optional[TermsAndConditions]:
    """Get terms and conditions by ID."""
    result = await db.execute(select(TermsAndConditions).where(TermsAndConditions.id == tc_id))
    return result.scalar_one_or_none()

async def list_tc_by_org(db: AsyncSession, org_id: UUID) -> List[TermsAndConditions]:
    """List all terms and conditions for an organization."""
    result = await db.execute(select(TermsAndConditions).where(TermsAndConditions.org_id == org_id).order_by(TermsAndConditions.created_at.desc()))
    return list(result.scalars().all())

async def get_active_tc_by_org(db: AsyncSession, org_id: UUID) -> Optional[TermsAndConditions]:
    """Get the active terms and conditions for an organization."""
    result = await db.execute(select(TermsAndConditions).where(TermsAndConditions.org_id == org_id, TermsAndConditions.is_active == True).order_by(TermsAndConditions.created_at.desc()))
    return result.scalars().first()

async def update_tc(db: AsyncSession, tc: TermsAndConditions, content: Optional[str] = None, is_active: Optional[bool] = None) -> TermsAndConditions:
    """Update an existing terms and conditions record."""
    if content is not None:
        tc.content = content
    if is_active is not None:
        tc.is_active = is_active
    await db.commit()
    await db.refresh(tc)
    return tc

async def delete_tc(db: AsyncSession, tc: TermsAndConditions) -> None:
    """Delete a terms and conditions record."""
    await db.delete(tc)
    await db.commit()
