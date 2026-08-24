from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import UserSession, User


async def get_active_user_sessions(db: AsyncSession, user_id: UUID) -> list[UserSession]:
    """Get all active (not logged out) sessions for a user."""
    result = await db.execute(select(UserSession).where(UserSession.user_id == user_id, UserSession.login_status == "success", UserSession.logout_at.is_(None)))
    return list(result.scalars().all())


async def get_session_by_id(db: AsyncSession, session_id: UUID) -> Optional[UserSession]:
    """Get session by ID."""
    result = await db.execute(select(UserSession).where(UserSession.id == session_id))
    return result.scalar_one_or_none()


async def create_user_session(db: AsyncSession, *, session: UserSession) -> UserSession:
    """Persist a new user session row."""
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def update_session_logout(db: AsyncSession, session: UserSession) -> UserSession:
    """Stamp logout_at and compute session_duration_sec."""
    now = datetime.now(timezone.utc)
    session.logout_at = now
    session.last_activity_at = now
    delta = now.replace(tzinfo=None) - session.logged_in_at.replace(tzinfo=None)
    session.session_duration_sec = int(delta.total_seconds())
    await db.commit()
    await db.refresh(session)
    return session


async def close_previous_sessions(db: AsyncSession, sessions: list[UserSession]) -> None:
    """Bulk-close a list of active sessions (set logout_at and session_duration_sec)."""
    now = datetime.now(timezone.utc)
    for session in sessions:
        session.logout_at = now
        session.last_activity_at = now
        delta = now.replace(tzinfo=None) - session.logged_in_at.replace(tzinfo=None)
        session.session_duration_sec = int(delta.total_seconds())
    await db.commit()


async def increment_user_stat(db: AsyncSession, user_id: UUID, stat_field: str) -> None:
    """Increment a user's tracking statistic."""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            current_value = getattr(user, stat_field, 0)
            setattr(user, stat_field, current_value + 1)
            await db.commit()
    except Exception as e:
        # If session is already committed/closed, start a new transaction
        from sqlalchemy.exc import InvalidRequestError
        if "not active" in str(e).lower() or isinstance(e, InvalidRequestError):
            async with db.begin():
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    current_value = getattr(user, stat_field, 0)
                    setattr(user, stat_field, current_value + 1)
        else:
            raise


async def rollback_db(db: AsyncSession) -> None:
    """Rollback database transaction."""
    await db.rollback()
