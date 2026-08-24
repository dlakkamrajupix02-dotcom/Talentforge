from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select, func, desc, literal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import CandidateUser, JobDescription, Notification, Template, User


class AnalyticsRepository:
    async def count_job_descriptions(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,~JobDescription.status.in_(["push_to_csod", "pushed_to_csod"])))
        return result or 0

    async def count_job_descriptions_by_generation_mode(self, db: AsyncSession, org_id: str, modes: list[str]) -> int:
        result = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),
                JobDescription.is_main == True,JobDescription.generation_mode.in_(modes),~JobDescription.status.in_(["push_to_csod", "pushed_to_csod"])))
        return result or 0

    async def count_active_templates(self, db: AsyncSession) -> int:
        result = await db.scalar(select(func.count(Template.id)).where(Template.is_active.is_(True),Template.deleted_at.is_(None)))
        return result or 0

    async def count_regular_members(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(User.id)).where(User.org_id == org_id,User.deleted_at.is_(None)))
        return result or 0

    async def count_candidate_members(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(CandidateUser.id)).where(CandidateUser.org_id == org_id,CandidateUser.deleted_at.is_(None)))
        return result or 0

    async def count_regular_members_by_status(self, db: AsyncSession, org_id: str, status: str) -> int:
        result = await db.scalar(select(func.count(User.id)).where(User.org_id == org_id,User.deleted_at.is_(None),User.status == status))
        return result or 0

    async def count_candidate_members_by_status(self, db: AsyncSession, org_id: str, status: str) -> int:
        result = await db.scalar(select(func.count(CandidateUser.id)).where(CandidateUser.org_id == org_id,CandidateUser.deleted_at.is_(None),CandidateUser.status == status))
        return result or 0

    async def count_regular_members_by_role(self, db: AsyncSession, org_id: str, role: str) -> int:
        result = await db.scalar(select(func.count(User.id)).where(User.org_id == org_id,User.deleted_at.is_(None),func.lower(User.role) == role.lower()))
        return result or 0

    async def count_users_by_role_including_candidates(self, db: AsyncSession, org_id: str, role: str) -> int:
        """Count users by role from both User and CandidateUser tables."""
        # Count from User table
        user_count = await db.scalar(select(func.count(User.id)).where(User.org_id == org_id,User.deleted_at.is_(None),func.lower(User.role) == role.lower())) or 0
        # Count from CandidateUser table (candidates always have role='User')
        candidate_count = await db.scalar(select(func.count(CandidateUser.id)).where(CandidateUser.org_id == org_id,CandidateUser.deleted_at.is_(None),func.lower(CandidateUser.role) == role.lower())) or 0
        return user_count + candidate_count

    async def count_job_descriptions_by_status(self, db: AsyncSession, org_id: str, statuses: list[str]) -> int:
        result = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status.in_(statuses)))
        return result or 0

    async def count_active_departments(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(func.distinct(JobDescription.department))).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.department.is_not(None),JobDescription.department != ""))
        return result or 0

    async def count_all_job_descriptions(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True))
        return result or 0

    async def count_pushed_to_csod_job_descriptions(self, db: AsyncSession, org_id: str) -> int:
        result = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status.in_(["pushed_to_csod"])))
        return result or 0

    async def count_active_members(self, db: AsyncSession, org_id: str) -> int:
        """Count of users and candidates with active status."""
        active_users = await db.scalar(select(func.count(User.id)).where(User.org_id == org_id,User.deleted_at.is_(None),User.status == "active")) or 0
        active_candidates = await db.scalar(select(func.count(CandidateUser.id)).where(CandidateUser.org_id == org_id,CandidateUser.deleted_at.is_(None),CandidateUser.status == "active")) or 0
        return active_users + active_candidates

    async def count_jds_assigned_to_candidates(self, db: AsyncSession, org_id: str) -> int:
        """Count of JDs assigned to candidate users (sign-off assignments only).

        CandidateJDAssignment also stores internal user-to-user workflow rows
        (assigned_user_id without candidate_id); exclude those from this metric.
        """
        from app.models.models import CandidateJDAssignment
        result = await db.scalar(select(func.count(CandidateJDAssignment.id)).where(CandidateJDAssignment.org_id == org_id,CandidateJDAssignment.candidate_id.isnot(None)))
        return result or 0

    async def count_jds_accepted_by_candidates(self, db: AsyncSession, org_id: str) -> int:
        """Count of JDs accepted/completed by candidate users (sign-off assignments only)."""
        from app.models.models import CandidateJDAssignment
        accepted_statuses = ["approved", "completed", "sign-off-complete"]
        result = await db.scalar(select(func.count(CandidateJDAssignment.id)).where(CandidateJDAssignment.org_id == org_id,CandidateJDAssignment.candidate_id.isnot(None),CandidateJDAssignment.status.in_(accepted_statuses)))
        return result or 0

    async def count_jds_by_status_dict(self, db: AsyncSession, org_id: str) -> dict[str, int]:
        """Get count of JDs for each status."""
        statuses = ['draft','final','in_review','approved','public_view','declined','pushed_to_csod','push_to_csod','archive','archive_job','clone']
        result_dict = {}
        for status in statuses:
            count = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status == status)) or 0
            result_dict[status] = count
        return result_dict

    async def count_jds_by_department(self, db: AsyncSession, org_id: str) -> dict[str, int]:
        """Get count of JDs for each department."""
        from sqlalchemy import and_
        stmt = select(JobDescription.department, func.count(JobDescription.id).label('count')).where(and_(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.department.is_not(None),JobDescription.department != "")).group_by(JobDescription.department)
        result = await db.execute(stmt)
        rows = result.all()
        return {row[0]: row[1] for row in rows if row[0]}

    async def count_departments_in_org(self, db: AsyncSession, org_id: str) -> int:
        """Count of unique departments in org."""
        result = await db.scalar(select(func.count(func.distinct(JobDescription.department))).where(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.department.is_not(None),JobDescription.department != ""))
        return result or 0

    async def count_jds_by_department_and_month(self, db: AsyncSession, org_id: str) -> dict:
        """Get count of JDs created per department per month (last 12 months)."""
        from sqlalchemy import and_, extract
        from datetime import datetime, timedelta
        # Get data for last 12 months
        stmt = select(JobDescription.department,extract('year', JobDescription.created_at).label('year'),extract('month', JobDescription.created_at).label('month'),func.count(JobDescription.id).label('count')).where(
            and_(JobDescription.org_id == org_id,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.department.is_not(None),JobDescription.department != "",JobDescription.created_at >= datetime.utcnow() - timedelta(days=365))
        ).group_by(JobDescription.department,extract('year', JobDescription.created_at),extract('month', JobDescription.created_at)).order_by(JobDescription.department,extract('year', JobDescription.created_at),extract('month', JobDescription.created_at))
        result = await db.execute(stmt)
        rows = result.all()
        # Format as nested dict: {department: {month_key: count}}
        data = {}
        for row in rows:
            dept = row[0]
            year = int(row[1])
            month = int(row[2])
            count = row[3]
            month_key = f"{year}-{month:02d}"
            if dept not in data:
                data[dept] = {}
            data[dept][month_key] = count
        return data

    async def get_recent_user_activities(self, db: AsyncSession, *, user_id: str | Any, org_id: str | Any = None, limit: int = 20) -> list[dict[str, Any]]:
        """Return recent JD-related activity for a specific user."""
        from sqlalchemy import or_

        user_uuid = user_id
        org_uuid = org_id

        jd_query = (select(JobDescription.id.label("item_id"),JobDescription.title.label("title"),JobDescription.status.label("status"),JobDescription.updated_at.label("event_time"),literal("jd_activity").label("source"),literal("jd").label("entity_type"),).where(JobDescription.creator_id == user_uuid, JobDescription.deleted_at.is_(None)))
        if org_uuid is not None:
            jd_query = jd_query.where(JobDescription.org_id == org_uuid)

        notification_query = (select(Notification.id.label("item_id"),Notification.title.label("title"),Notification.type.label("status"),Notification.created_at.label("event_time"),literal("notification").label("source"),literal("notification").label("entity_type"),).where(Notification.user_id == user_uuid))
        if org_uuid is not None:
            notification_query = notification_query.where(Notification.org_id == org_uuid)

        combined = (jd_query.union_all(notification_query).subquery())

        stmt = (select(combined.c.item_id,combined.c.title,combined.c.status,combined.c.event_time,combined.c.source,combined.c.entity_type,).order_by(desc(combined.c.event_time)).limit(limit))
        result = await db.execute(stmt)
        rows = result.all()

        activities: list[dict[str, Any]] = []
        for row in rows:
            activity_type = "jd_created"
            if row.source == "notification":
                activity_type = "notification"
                title = row.title or "Activity"
                detail = row.status or "updated"
            else:
                title = row.title or "Job Description"
                detail = row.status or "updated"
                if row.status in {"approved", "declined", "in_review", "final", "public_view", "archive", "archive_job", "draft", "clone"}:
                    activity_type = "jd_status_changed"
                elif row.status in {"pushed_to_csod", "push_to_csod", "pushed_to_csod"}:
                    activity_type = "jd_pushed"
                else:
                    activity_type = "jd_created"

            activities.append({
                "id": str(row.item_id),
                "type": activity_type,
                "title": title,
                "detail": detail,
                "created_at": row.event_time.isoformat() if row.event_time else None,
                "entity_type": row.entity_type,
                "source": row.source,
            })

        return activities

    async def get_jd_approval_funnel(self, db: AsyncSession, org_id: str | Any) -> dict[str, Any]:
        """Get JD approval funnel data for org-level visualization.
        
        Returns stages of JD approval workflow:
        - total_intake: All JDs in the organization (non-deleted)
        - manager_review: JDs with 'in_review' status
        - accepted: JDs with 'approved' status
        - rejected: JDs with 'declined' status
        - rate: Acceptance rate = (approved / total_intake) * 100
        
        Note: hr_review is included for backward compatibility but may be deprecated.
        """
        from sqlalchemy import and_
        
        org_uuid = org_id
        
        # Total JDs in organization (all intake)
        total_intake = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_uuid,JobDescription.deleted_at.is_(None),JobDescription.is_main == True)) or 0
        
        # JDs in review status
        manager_review = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_uuid,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status == "in_review")) or 0
        
        # Approved JDs
        approved = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_uuid,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status == "approved")) or 0
        
        # Rejected/Declined JDs
        rejected = await db.scalar(select(func.count(JobDescription.id)).where(JobDescription.org_id == org_uuid,JobDescription.deleted_at.is_(None),JobDescription.is_main == True,JobDescription.status == "declined")) or 0
        
        # Calculate acceptance rate: (approved / total_intake) * 100
        acceptance_rate = round((approved / total_intake * 100), 0) if total_intake > 0 else 0
        
        # hr_review placeholder for funnel visualization
        hr_review = 0
        
        return {
            "total_intake": total_intake,
            "manager_review": manager_review,
            "accepted": approved,
            "rejected": rejected,
            "rate": int(acceptance_rate),
        }


analytics_repository = AnalyticsRepository()
