from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import CSODConnection, JobDescription


async def get_csod_connection(db: AsyncSession, org_id: UUID) -> Optional[CSODConnection]:
    """Get CSOD connection record for an organisation."""
    result = await db.execute(select(CSODConnection).where(CSODConnection.org_id == org_id))
    return result.scalar_one_or_none()


async def upsert_csod_connection(db: AsyncSession,org_id: UUID,portal_url: str,client_id: str,client_secret: str,
    default_openings: int = 1,default_expiry_days: int = 90,default_country: str = "US") -> CSODConnection:
    """Create or update the CSOD connection for an organisation."""
    conn = await get_csod_connection(db, org_id)
    if conn:
        conn.portal_url = portal_url
        conn.client_id = client_id
        conn.client_secret = client_secret
        conn.default_openings = default_openings
        conn.default_expiry_days = default_expiry_days
        conn.default_country = default_country
        conn.status = "pending"
        conn.updated_at = datetime.now(timezone.utc)
    else:
        conn = CSODConnection(
            org_id=org_id,
            portal_url=portal_url,
            client_id=client_id,
            client_secret=client_secret,
            default_openings=default_openings,
            default_expiry_days=default_expiry_days,
            default_country=default_country,
            status="pending",
        )
        db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


async def update_csod_test_result(db: AsyncSession,conn: CSODConnection,*,status: str,error: Optional[str] = None) -> CSODConnection:
    """Persist the outcome of a CSOD connection test."""
    conn.status = status
    conn.last_tested_at = datetime.now(timezone.utc)
    conn.last_error = error
    await db.commit()
    await db.refresh(conn)
    return conn


async def get_final_jds_by_ids(db: AsyncSession,jd_ids: List[UUID],creator_id: UUID) -> List[JobDescription]:
    """Fetch finalised JDs owned by the given user from a list of IDs."""
    result = await db.execute(select(JobDescription).where(JobDescription.id.in_(jd_ids),
            JobDescription.creator_id == creator_id,
            JobDescription.status == "final"))
    return list(result.scalars().all())

