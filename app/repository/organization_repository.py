from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Organization, User

async def get_organization_by_name(db: AsyncSession, name: str) -> Optional[Organization]:
    res = await db.execute(select(Organization).where(Organization.name == name))
    return res.scalar_one_or_none()


async def get_organization_by_id(db: AsyncSession, org_id: uuid.UUID) -> Optional[Organization]:
    res = await db.execute(select(Organization).where(Organization.id == org_id))
    return res.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str, org_id: uuid.UUID) -> Optional[User]:
    """Get user by email within specific organization"""
    res = await db.execute(select(User).where(User.email == email, User.org_id == org_id))
    return res.scalar_one_or_none()


async def create_organization(db: AsyncSession, *, name: str, industry: Optional[str] = None,
    image_url: Optional[str] = None) -> Organization:
    now = datetime.now(timezone.utc)
    org = Organization(name=name, industry=(industry or None), image_url=image_url, created_at=now, updated_at=now)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


async def update_organization(db: AsyncSession, *, org: Organization, update_data: dict) -> Organization:
    for key, value in update_data.items():
        setattr(org, key, value)
    org.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    return org


async def delete_organization(db: AsyncSession, *, org: Organization) -> None:
    await db.delete(org)
    await db.commit()


async def list_organizations(db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[Organization]:
    res = await db.execute(select(Organization).offset(skip).limit(limit).order_by(desc(Organization.created_at)))
    return list(res.scalars().all())


async def assign_organization_to_user(db: AsyncSession, *, user_id: uuid.UUID, org_id: uuid.UUID) -> None:
    await db.execute(update(User).where(User.id == user_id).values(org_id=org_id, updated_at=datetime.now(timezone.utc)))
    await db.commit()
    # Invalidate user cache so any cached session or permission data is refreshed
    try:
        from app.services.cache_service import cache_service
        await cache_service.invalidate_user_cache(str(user_id))
        await cache_service.invalidate_permissions(str(user_id))
    except Exception:
        # Don't block the flow if cache invalidation fails
        pass


async def get_user_organization(db: AsyncSession, user_id: uuid.UUID) -> Optional[Organization]:
    res = await db.execute(select(Organization).join(User, Organization.id == User.org_id).where(User.id == user_id))
    return res.scalar_one_or_none()


async def get_org_members(db: AsyncSession, org_id: uuid.UUID) -> list[User]:
    res = await db.execute(select(User).where(User.org_id == org_id, User.deleted_at.is_(None)))
    return list(res.scalars().all())


async def get_org_users_count(db: AsyncSession, org_id: uuid.UUID) -> int:
    """Get count of active users in an organization."""
    res = await db.execute(select(User).where(User.org_id == org_id, User.deleted_at.is_(None)))
    return len(res.scalars().all())
