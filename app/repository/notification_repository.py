from __future__ import annotations
from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Optional, List
from sqlalchemy import select, update, delete, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Notification


async def create_notification_db(db: AsyncSession,*,user_id: UUID,org_id: UUID,type: str,title: str,message: str,sender_id: Optional[UUID] = None,link: Optional[str] = None) -> tuple[Notification, bool]:
    """
    Create a new notification for a user in the database.

    Returns a tuple of (notification, was_newly_created).

    Deduplication: if an identical notification (same user_id + type + link)
    was already created within the last 10 seconds, return that existing record
    with was_newly_created=False instead of inserting a second one.
    This prevents double-fires when two backend code paths both call
    send_notification for the same event.
    """
    ten_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=10)

    # Build duplicate-check conditions
    dup_conditions = [
        Notification.user_id == user_id,
        Notification.type == type,
        Notification.created_at >= ten_seconds_ago,
    ]
    # Match on link when present (most specific signal)
    if link:
        dup_conditions.append(Notification.link == link)
    else:
        dup_conditions.append(Notification.title == title)

    existing_stmt = select(Notification).where(and_(*dup_conditions)).limit(1)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Return the already-existing notification with was_newly_created=False
        return existing, False

    # No duplicate found — safe to insert
    notification = Notification(user_id=user_id,org_id=org_id,sender_id=sender_id,type=type,title=title,message=message,link=link)
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification, True


async def list_user_notifications(db: AsyncSession,*,user_id: UUID,limit: int = 50,offset: int = 0,unread_only: bool = False) -> List[Notification]:
    """List notifications for a specific user."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    stmt = stmt.order_by(desc(Notification.created_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_unread_count(db: AsyncSession, *, user_id: UUID) -> int:
    """Count unread notifications for a user."""
    stmt = select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.is_read == False)
    res = await db.execute(stmt)
    return res.scalar() or 0


async def mark_as_read(db: AsyncSession, *, notification_id: UUID, user_id: UUID) -> bool:
    """Mark a specific notification as read."""
    stmt = (update(Notification).where(Notification.id == notification_id, Notification.user_id == user_id).values(is_read=True))
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount > 0


async def mark_all_as_read(db: AsyncSession, *, user_id: UUID) -> int:
    """Mark all notifications for a user as read."""
    stmt = (update(Notification).where(Notification.user_id == user_id, Notification.is_read == False).values(is_read=True))
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount


async def delete_all_notifications(db: AsyncSession, *, user_id: UUID) -> int:
    """Delete all notifications for a user."""
    stmt = delete(Notification).where(Notification.user_id == user_id)
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount
