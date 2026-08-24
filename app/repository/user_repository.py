from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.models.models import User, EmailVerification
from app.core.client_ip import normalize_country_value


def active_users_filter():
    """Base filter that excludes soft-deleted users."""
    return User.deleted_at.is_(None)

async def get_user_by_email(db: AsyncSession, email: str, org_id: Optional[uuid.UUID] = None) -> Optional[User]:
    """Get user by email. If org_id provided, restrict to that organization."""
    query = select(User).where(User.email == email, active_users_filter())
    if org_id:
        query = query.where(User.org_id == org_id)
    res = await db.execute(query)
    return res.scalar_one_or_none()

async def get_user_by_email_including_deleted(db: AsyncSession, email: str) -> Optional[User]:
    """Check if email exists including soft-deleted users"""
    res = await db.execute(select(User).where(User.email == email))
    return res.scalar_one_or_none()

async def get_user_by_full_name(db: AsyncSession, full_name: str) -> Optional[User]:
    res = await db.execute(select(User).where(User.full_name == full_name, active_users_filter()))
    return res.scalar_one_or_none()

async def get_user_by_login_identifier(db: AsyncSession, identifier: str) -> Optional[User]:
    res = await db.execute(select(User).where(or_(User.email == identifier, User.full_name == identifier),active_users_filter()))
    return res.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID, org_id: Optional[uuid.UUID] = None) -> Optional[User]:
    """Get user by ID. If org_id provided, restrict to that organization."""
    query = select(User).where(User.id == user_id, active_users_filter())
    if org_id:
        query = query.where(User.org_id == org_id)
    res = await db.execute(query)
    return res.scalar_one_or_none()


async def list_users_by_org(db: AsyncSession, org_id: uuid.UUID) -> list[User]:
    from sqlalchemy import update, or_, and_
    from datetime import datetime, timezone, timedelta
    threshold = datetime.now(timezone.utc) - timedelta(days=10)
    await db.execute(update(User).where(User.org_id == org_id, User.status == "active").where(or_(User.last_login_at < threshold, and_(User.last_login_at.is_(None), User.created_at < threshold))).values(status="inactive"))
    await db.commit()
    # Clear any cached user lists for this organisation so subsequent reads reflect status changes
    try:
        from app.services.cache_service import cache_service
        await cache_service.clear_cache_by_pattern(f"query:*{str(org_id)}*")
    except Exception:
        pass
    res = await db.execute(select(User).where(User.org_id == org_id, active_users_filter()))
    return list(res.scalars().all())


async def create_user(db: AsyncSession,*,user_id: uuid.UUID,full_name: str,email: str,hashed_password: str,role: str,
    region: Optional[str],org_id: uuid.UUID, color_code: Optional[str] = None, created_by: Optional[uuid.UUID] = None, creator_name: Optional[str] = None) -> User:
    
    if not color_code:
        palette = [
            "#E57373", "#81C784", "#64B5F6", "#FFD54F", "#BA68C8", "#4DB6AC", "#FF8A65", "#A1887F", "#90A4AE", "#9575CD",
            "#EF5350", "#66BB6A", "#42A5F5", "#FFCA28", "#AB47BC", "#26A69A", "#FF7043", "#8D6E63", "#78909C", "#7E57C2",
            "#F44336", "#4CAF50", "#2196F3", "#FFC107", "#9C27B0", "#009688", "#FF5722", "#795548", "#607D8B", "#673AB7",
            "#D32F2F", "#388E3C", "#1976D2", "#FFA000", "#7B1FA2", "#00796B", "#E64A19", "#5D4037", "#455A64", "#512DA8",
            "#C62828", "#2E7D32", "#1565C0", "#FF8F00", "#6A1B9A", "#00695C", "#D84315", "#4E342E", "#37474F", "#4527A0",
            "#B71C1C", "#1B5E20", "#0D47A1", "#FF6F00", "#4A148C", "#004D40", "#BF360C", "#3E2723", "#263238", "#311B92",
            "#FFAB91", "#C5E1A5", "#90CAF9", "#FFF59D", "#E1BEE7", "#B2DFDB", "#FFCCBC", "#D7CCC8", "#CFD8DC", "#D1C4E9",
            "#FF8A80", "#B9F6CA", "#80D8FF", "#FFFF8D", "#EA80FC", "#A7FFEB", "#FF9E80", "#BCAAA4", "#B0BEC5", "#B39DDB",
            "#FF5252", "#69F0AE", "#40C4FF", "#FFFF00", "#E040FB", "#64FFDA", "#FF6E40", "#A1887F", "#90A4AE", "#9575CD",
            "#D50000", "#00E676", "#00B0FF", "#FFEA00", "#D500F9", "#1DE9B6", "#FF3D00", "#8D6E63", "#78909C", "#7E57C2",
            "#F06292", "#AED581", "#4FC3F7", "#FFF176", "#CE93D8", "#80CBC4", "#FFAB91", "#BCAAA4", "#B0BEC5", "#B39DDB",
            "#EC407A", "#9CCC65", "#29B6F6", "#FFEE58", "#D1C4E9", "#4DB6AC", "#FF8A65", "#A1887F", "#90A4AE", "#9575CD",
            "#E91E63", "#8BC34A", "#03A9F4", "#FDD835", "#C5CAE9", "#009688", "#FF5722", "#795548", "#607D8B", "#673AB7",
            "#D81B60", "#7CB342", "#039BE5", "#FBC02D", "#BBDEFB", "#00897B", "#F4511E", "#6D4C41", "#546E7A", "#5E35B1",
            "#C2185B", "#689F38", "#0288D1", "#F9A825", "#B3E5FC", "#00796B", "#E64A19", "#5D4037", "#455A64", "#512DA8",
            "#AD1457", "#558B2F", "#0277BD", "#F57F17", "#B2EBF2", "#00695C", "#D84315", "#4E342E", "#37474F", "#4527A0",
            "#880E4F", "#33691E", "#01579B", "#E65100", "#80DEEA", "#004D40", "#BF360C", "#3E2723", "#263238", "#311B92",
            "#F8BBD0", "#DCEDC8", "#B3E5FC", "#FFF9C4", "#D1C4E9", "#B2DFDB", "#FFCCBC", "#D7CCC8", "#CFD8DC", "#D1C4E9",
            "#F48FB1", "#C5E1A5", "#81D4FA", "#FFF59D", "#B39DDB", "#80CBC4", "#FFAB91", "#BCAAA4", "#B0BEC5", "#B39DDB",
            "#F06292", "#AED581", "#4FC3F7", "#FFF176", "#9575CD", "#4DB6AC", "#FF8A65", "#A1887F", "#90A4AE", "#9575CD"
        ]
        color_code = random.choice(palette)
        
    normalized_region = normalize_country_value(region)
    user = User(id=user_id,full_name=full_name,email=email,hashed_password=hashed_password,role=role,
        region=normalized_region,org_id=org_id,created_at=datetime.now(timezone.utc), color_code=color_code,
        mfa_enabled=False, mfa_verified=False, mfa_required=False, created_by=created_by, creator_name=creator_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_region(db: AsyncSession, user: User, region: str) -> User:
    user.region = normalize_country_value(region)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(db: AsyncSession, user: User, hashed_password: str) -> User:
    """Update user hashed password and persist."""
    user.hashed_password = hashed_password
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_last_login(db: AsyncSession, user: User, *, status: str | None = None) -> User:
    """Persist user last login timestamp and optional status."""
    user.last_login_at = datetime.now(timezone.utc)
    if status is not None:
        user.status = status
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_profile(db: AsyncSession,user: User,*,
    full_name: str | None = None,email: str | None = None) -> User:
    """Update mutable profile fields and persist."""
    if full_name is not None:
        user.full_name = full_name
    if email is not None:
        user.email = email
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_mfa_state(db: AsyncSession, user: User, *, enabled: bool | None = None, verified: bool | None = None, secret: str | None = None, backup_codes: str | None = None, required: bool | None = None) -> User:
    if enabled is not None:
        user.mfa_enabled = enabled
    if verified is not None:
        user.mfa_verified = verified
    if secret is not None:
        user.mfa_secret = secret
    if backup_codes is not None:
        user.backup_codes = backup_codes
    if required is not None:
        user.mfa_required = required
    await db.commit()
    await db.refresh(user)
    return user


async def soft_delete_user(db: AsyncSession, user: User) -> None:
    """
    Soft-delete: stamps deleted_at so the row is invisible to all normal
    queries but the audit trail (UserSession rows, JD creator_id links) is
    preserved.  Email is modified to allow reuse of the original address.
    """
    user.deleted_at = datetime.now(timezone.utc)
    # We are appending timestamp to email to allow reuse of original email
    timestamp_suffix = f"_deleted_{int(user.deleted_at.timestamp())}"
    user.email = f"{user.email}{timestamp_suffix}"
    await db.commit()


async def delete_email_verification(db: AsyncSession, verification: EmailVerification) -> None:
    await db.delete(verification)
    await db.commit()
