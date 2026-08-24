from __future__ import annotations
from typing import Optional
from uuid import UUID
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import UserSession


async def get_user_sessions(db: AsyncSession,*,user_id: UUID,limit: int = 30) -> list[UserSession]:
    """Get session history for a specific user."""
    result = await db.execute(select(UserSession).where(UserSession.user_id == user_id).order_by(desc(UserSession.logged_in_at)).limit(limit))
    return list(result.scalars().all())


async def get_active_sessions(db: AsyncSession,*,org_id: UUID,limit: int = 50) -> list[UserSession]:
    """Get active (not logged out) successful sessions for one organization."""
    result = await db.execute(select(UserSession).where(UserSession.org_id == org_id,UserSession.logout_at.is_(None),UserSession.login_status == "success").order_by(desc(UserSession.logged_in_at)).limit(limit))
    return list(result.scalars().all())


async def get_all_sessions(db: AsyncSession, *,org_id: UUID,login_status: Optional[str] = None,ip_address: Optional[str] = None,limit: int = 100) -> list[UserSession]:
    """Get session audit log for one organization with optional filters."""
    query = (select(UserSession).where(UserSession.org_id == org_id).order_by(desc(UserSession.logged_in_at)).limit(limit))

    if login_status:
        query = query.where(UserSession.login_status == login_status)
    if ip_address:
        query = query.where(UserSession.ip_address == ip_address)

    result = await db.execute(query)
    return list(result.scalars().all())


async def is_session_valid_db(db: AsyncSession, session_id: UUID) -> bool:
    """
    Check if a session is still active (not logged out) in the database.
    Used as a fallback when Redis is unavailable.
    """
    try:
        stmt = select(UserSession).where(UserSession.id == session_id,UserSession.logout_at.is_(None),UserSession.login_status == "success")
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()
        return session is not None
    except Exception:
        return False
