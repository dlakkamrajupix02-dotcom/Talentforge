from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import EmailVerification, User


async def email_exists(db: AsyncSession, email: str) -> bool:
    res = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    return res.scalar_one_or_none() is not None


async def delete_otps_for_email(db: AsyncSession, email: str) -> None:
    await db.execute(delete(EmailVerification).where(EmailVerification.email == email))
    await db.commit()


async def create_otp_record(db: AsyncSession, *, email: str, otp_code: str, expires_at: datetime) -> EmailVerification:
    row = EmailVerification(email=email,otp_code=otp_code,expires_at=expires_at,attempts=0,verified_status=False)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_active_otp(db: AsyncSession, email: str) -> Optional[EmailVerification]:
    res = await db.execute(select(EmailVerification).where(EmailVerification.email == email,EmailVerification.verified_status.is_(False), EmailVerification.expires_at > datetime.now(timezone.utc))
        .order_by(EmailVerification.created_at.desc()))
    return res.scalar_one_or_none()


async def get_latest_otp_any_status(db: AsyncSession, email: str) -> Optional[EmailVerification]:
    res = await db.execute(select(EmailVerification).where(EmailVerification.email == email).order_by(EmailVerification.created_at.desc()))
    return res.scalar_one_or_none()


async def increment_attempts(db: AsyncSession, otp_record: EmailVerification) -> None:
    otp_record.attempts += 1
    await db.commit()


async def mark_verified(db: AsyncSession, otp_record: EmailVerification) -> None:
    otp_record.verified_status = True
    await db.commit()


async def get_verified_email_verification(db: AsyncSession, email: str) -> Optional[EmailVerification]:
    """Return the most recent verified (and not yet expired) OTP record for an email."""
    res = await db.execute(select(EmailVerification).where(EmailVerification.email == email,
            EmailVerification.verified_status.is_(True),EmailVerification.expires_at > datetime.now(timezone.utc)).order_by(desc(EmailVerification.created_at)))
    return res.scalar_one_or_none()
