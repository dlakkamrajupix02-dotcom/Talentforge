from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import Organization, JobDescription, BroadcastMessage


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def broadcast_effective_expiry(expires_at: datetime | None) -> datetime | None:
    """Exact expiration timestamp in UTC."""
    if expires_at is None:
        return None
    return _ensure_utc(expires_at)


def is_broadcast_live(is_active: bool, expires_at: datetime | None, now: datetime | None = None) -> bool:
    if not is_active:
        return False
    if expires_at is None:
        return True
    now = now or datetime.now(timezone.utc)
    effective_expiry = broadcast_effective_expiry(expires_at)
    return effective_expiry > _ensure_utc(now)


def normalize_broadcast_expiry_for_storage(expires_at: datetime | None) -> datetime | None:
    """Persist exact user-selected expiry timestamp in UTC."""
    return broadcast_effective_expiry(expires_at)


class SuperAdminRepository:
    
    @staticmethod
    async def get_all_organizations(db: AsyncSession) -> List[Organization]:
        stmt = select(Organization).order_by(Organization.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_organization_by_id(db: AsyncSession, org_id: UUID) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.id == org_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def update_organization_access(db: AsyncSession, org: Organization, is_active: bool, access_valid_until: Optional[datetime]) -> Organization:
        org.is_active = is_active
        org.access_valid_until = access_valid_until
        await db.commit()
        await db.refresh(org)
        return org

    @staticmethod
    async def get_jd_analytics(db: AsyncSession) -> List[dict]:
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_month = start_of_day.replace(day=1)
        start_of_year = start_of_month.replace(month=1)
        
        stmt = (select(Organization.id.label("org_id"),Organization.name.label("org_name"),func.count(JobDescription.id).filter(JobDescription.created_at >= start_of_day).label("daily_count"),
                func.count(JobDescription.id).filter(JobDescription.created_at >= start_of_month).label("monthly_count"),func.count(JobDescription.id).filter(JobDescription.created_at >= start_of_year).label("yearly_count"),
                func.count(JobDescription.id).label("total_count"),).outerjoin(JobDescription, Organization.id == JobDescription.org_id).group_by(Organization.id, Organization.name))
        
        result = await db.execute(stmt)
        rows = result.all()
        
        from app.models.models import User, CandidateUser
        
        # User Analytics Query (regular platform users)
        user_stmt = (select(User.org_id,func.count(User.id).label("total_users"),func.count(User.id).filter(User.role == "Admin").label("admin_count"),func.count(User.id).filter(User.role == "HR").label("hr_count"),
            func.count(User.id).filter(User.role == "Manager").label("manager_count"),func.count(User.id).filter(User.role == "User").label("regular_enduser_count")).group_by(User.org_id))
        user_result = await db.execute(user_stmt)
        user_rows = user_result.all()

        # End users (candidates) live in candidate_users, not talentforge_users
        candidate_stmt = (
            select(CandidateUser.org_id, func.count(CandidateUser.id).label("candidate_count"))
            .where(CandidateUser.deleted_at.is_(None))
            .group_by(CandidateUser.org_id)
        )
        candidate_result = await db.execute(candidate_stmt)
        candidate_rows = candidate_result.all()
        candidate_counts_by_org = {
            row.org_id: row.candidate_count or 0
            for row in candidate_rows
            if row.org_id is not None
        }
        
        user_stats_by_org = {}
        for row in user_rows:
            if row.org_id is None:
                continue
            candidate_count = candidate_counts_by_org.get(row.org_id, 0)
            regular_user_total = row.total_users or 0
            user_stats_by_org[row.org_id] = {
                "total_users": regular_user_total + candidate_count,
                "admin_count": row.admin_count or 0,
                "hr_count": row.hr_count or 0,
                "manager_count": row.manager_count or 0,
                "enduser_count": (row.regular_enduser_count or 0) + candidate_count,
            }

        # Orgs that only have candidates and no regular users yet
        for org_id, candidate_count in candidate_counts_by_org.items():
            if org_id not in user_stats_by_org:
                user_stats_by_org[org_id] = {
                    "total_users": candidate_count,
                    "admin_count": 0,
                    "hr_count": 0,
                    "manager_count": 0,
                    "enduser_count": candidate_count,
                }

        analytics_list = []
        for row in rows:
            org_user_stats = user_stats_by_org.get(row.org_id, {
                "total_users": 0, "admin_count": 0, "hr_count": 0, "manager_count": 0, "enduser_count": 0
            })
            
            analytics_list.append({
                "org_id": row.org_id,
                "org_name": row.org_name,
                "daily_count": row.daily_count or 0,
                "monthly_count": row.monthly_count or 0,
                "yearly_count": row.yearly_count or 0,
                "total_count": row.total_count or 0,
                **org_user_stats
            })
            
        return analytics_list

    @staticmethod
    async def create_broadcast(db: AsyncSession, broadcast: BroadcastMessage) -> BroadcastMessage:
        db.add(broadcast)
        await db.commit()
        await db.refresh(broadcast)
        return broadcast

    @staticmethod
    async def get_all_broadcasts(db: AsyncSession) -> List[BroadcastMessage]:
        stmt = select(BroadcastMessage).order_by(BroadcastMessage.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_active_broadcasts(db: AsyncSession) -> List[BroadcastMessage]:
        broadcasts = await SuperAdminRepository.get_all_broadcasts(db)
        return [broadcast for broadcast in broadcasts if is_broadcast_live(broadcast.is_active, broadcast.expires_at)]

    @staticmethod
    async def get_broadcast_by_id(db: AsyncSession, broadcast_id: UUID) -> Optional[BroadcastMessage]:
        stmt = select(BroadcastMessage).where(BroadcastMessage.id == broadcast_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def update_broadcast(db: AsyncSession, broadcast: BroadcastMessage, update_data: dict) -> BroadcastMessage:
        for key, value in update_data.items():
            setattr(broadcast, key, value)
        await db.commit()
        await db.refresh(broadcast)
        return broadcast

    @staticmethod
    async def delete_broadcast(db: AsyncSession, broadcast: BroadcastMessage) -> None:
        await db.delete(broadcast)
        await db.commit()

    @staticmethod
    async def get_organization_by_name(db: AsyncSession, name: str) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.name.ilike(name))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_users_by_org(db: AsyncSession, org_id: UUID) -> List[Organization]:
        from app.models.models import User
        stmt = select(User).where(User.org_id == org_id, User.deleted_at == None)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_candidates_by_org(db: AsyncSession, org_id: UUID) -> List[Organization]:
        from app.models.models import CandidateUser
        stmt = select(CandidateUser).where(CandidateUser.org_id == org_id, CandidateUser.deleted_at == None)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_organization(db: AsyncSession, org: Organization, update_data: dict) -> Organization:
        from datetime import datetime, timezone
        update_data["updated_at"] = datetime.now(timezone.utc)
        for key, value in update_data.items():
            setattr(org, key, value)
        await db.commit()
        await db.refresh(org)
        return org

super_admin_repository = SuperAdminRepository()
