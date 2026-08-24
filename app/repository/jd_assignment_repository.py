from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID
from typing import Optional, List
from sqlalchemy import desc, select,  and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import CandidateJDAssignment, JobDescription, User
from app.repository.user_repository import active_users_filter
from app.services.notification_service import notification_service


async def get_jd_for_org(db: AsyncSession, *, jd_id: UUID, org_id) -> JobDescription | None:
    """Get JD by ID and organization."""
    res = await db.execute(select(JobDescription).where(JobDescription.id == jd_id, JobDescription.org_id == org_id))
    return res.scalar_one_or_none()


async def get_user_in_org(db: AsyncSession, *, user_id: UUID, org_id) -> User | None:
    """Get user by ID and organization."""
    res = await db.execute(select(User).where(User.id == user_id, User.org_id == org_id, active_users_filter()))
    return res.scalar_one_or_none()


async def create_candidate_assignment(db: AsyncSession, assignment_data: dict) -> CandidateJDAssignment:
    """Create a new candidate JD assignment."""
    assignment = CandidateJDAssignment(**assignment_data)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_candidate_assignment_by_id(db: AsyncSession, assignment_id: UUID, org_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get candidate assignment by ID and organization."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.id == assignment_id,
            CandidateJDAssignment.org_id == org_id
        )
    ).options(
        selectinload(CandidateJDAssignment.candidate),
        selectinload(CandidateJDAssignment.assigned_user),
        selectinload(CandidateJDAssignment.assignor),
        selectinload(CandidateJDAssignment.jd)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_sent_assignments(db: AsyncSession, user_id: UUID, org_id: UUID, status: Optional[str] = None) -> List[CandidateJDAssignment]:
    """Get assignments sent by user (user-to-user assignments)."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.assigned_by == user_id,
            CandidateJDAssignment.org_id == org_id,
            CandidateJDAssignment.assigned_user_id.isnot(None)  # Only user-to-user assignments
        )
    ).options(selectinload(CandidateJDAssignment.assigned_user))
    
    if status:
        query = query.where(CandidateJDAssignment.status == status)
    
    query = query.order_by(CandidateJDAssignment.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_received_assignments(db: AsyncSession, user_id: UUID, org_id: UUID, status: Optional[str] = None) -> List[CandidateJDAssignment]:
    """Get assignments received by user."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.assigned_user_id == user_id,
            CandidateJDAssignment.org_id == org_id
        )
    ).options(selectinload(CandidateJDAssignment.assignor))
    
    if status:
        query = query.where(CandidateJDAssignment.status == status)
    
    query = query.order_by(CandidateJDAssignment.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_user_assignment_by_jd(db: AsyncSession, *, jd_id: UUID, user_id: UUID, org_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get assignment for a specific JD and user."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.jd_id == jd_id,
            CandidateJDAssignment.assigned_user_id == user_id,
            CandidateJDAssignment.org_id == org_id
        )
    ).options(selectinload(CandidateJDAssignment.assignor))
    
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_pending_assignment_count(db: AsyncSession, *, jd_id: UUID) -> int:
    """Get count of pending assignments for a JD."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.jd_id == jd_id,
            CandidateJDAssignment.status == "waiting_for_approval",
            CandidateJDAssignment.assigned_user_id.isnot(None)  # Only user-to-user assignments
        )
    )
    
    result = await db.execute(query)
    return len(result.scalars().all())


async def get_candidate_assignments_by_candidate(db: AsyncSession, candidate_id: UUID, org_id: UUID) -> List[CandidateJDAssignment]:
    """Get all assignments for a specific candidate."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.candidate_id == candidate_id,
            CandidateJDAssignment.org_id == org_id
        )
    ).options(
        selectinload(CandidateJDAssignment.jd),
        selectinload(CandidateJDAssignment.candidate)
    ).order_by(CandidateJDAssignment.assigned_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


async def get_candidate_assignments(db: AsyncSession, org_id: UUID, status: Optional[str] = None) -> List[CandidateJDAssignment]:
    """Get all candidate assignments for organization."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.org_id == org_id,
            CandidateJDAssignment.candidate_id.isnot(None)  # Only candidate assignments
        )
    ).options(
        selectinload(CandidateJDAssignment.candidate),
        selectinload(CandidateJDAssignment.jd)
    )
    
    if status:
        query = query.where(CandidateJDAssignment.status == status)
    
    query = query.order_by(CandidateJDAssignment.assigned_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def update_candidate_assignment_status(db: AsyncSession, assignment_id: UUID, org_id: UUID, update_data: dict) -> Optional[CandidateJDAssignment]:
    """Update candidate assignment status and details."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.id == assignment_id,
            CandidateJDAssignment.org_id == org_id
        )
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if assignment:
        for key, value in update_data.items():
            if hasattr(assignment, key):
                setattr(assignment, key, value)
        
        # Auto-update updated_at timestamp
        assignment.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(assignment)
    
    return assignment


async def delete_candidate_assignment(db: AsyncSession, assignment_id: UUID, org_id: UUID) -> bool:
    """Delete a candidate assignment."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.id == assignment_id,
            CandidateJDAssignment.org_id == org_id
        )
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if assignment:
        await db.delete(assignment)
        await db.commit()
        return True
    
    return False


async def insert_assigned_jd_leg(db: AsyncSession, *, org_id: UUID, original_jd_id: UUID, jd_snapshot: dict, sent_from: UUID, sent_to: UUID, comment: str, status: str = "waiting_for_approval") -> CandidateJDAssignment:
    """Insert a new JD assignment leg for workflow processing."""
    assignment = CandidateJDAssignment(
        org_id=org_id,
        jd_id=original_jd_id,
        jd_snapshot=jd_snapshot,
        assigned_by=sent_from,
        assigned_user_id=sent_to,
        status=status,
        comment=comment,
        assigned_at=datetime.now(timezone.utc)
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    if sent_to:
        jd_title = jd_snapshot.get("title") if jd_snapshot else "Job Description"
        await notification_service.send_notification(
            db, user_id=sent_to, org_id=org_id, sender_id=sent_from,
            type="jd_assigned", title="New Job Description Assigned",
            message=f"A new Job Description '{jd_title}' has been assigned to you.",
            link=f"/admin/assigned/view/{assignment.id}"
        )
    return assignment


async def update_assigned_leg_status(db: AsyncSession, *, leg: CandidateJDAssignment, status: str, comment: Optional[str] = None) -> CandidateJDAssignment:
    """Update the status of an assigned JD leg."""
    leg.status = status
    if comment:
        leg.comment = comment
    leg.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(leg)

    # Notify the assignor about the status update (e.g. Approved/Declined)
    if leg.assigned_by:
        # Fetch JD title
        jd_title = "Job Description"
        if leg.jd_snapshot and isinstance(leg.jd_snapshot, dict):
            jd_title = leg.jd_snapshot.get("title", jd_title)
            
        status_text = status.replace("_", " ").title()
        
        await notification_service.send_notification(
            db,
            user_id=leg.assigned_by,
            org_id=leg.org_id,
            type="status_update",
            title=f"JD Assignment {status_text}",
            message=f"The Job Description '{jd_title}' assigned to {leg.assigned_user.full_name if leg.assigned_user else 'a user'} has been {status_text.lower()}.",
            link=f"/admin/assigned/view/{leg.id}"
        )

    return leg


# Legacy compatibility functions (for backward compatibility)
async def get_assigned_jd_leg(db: AsyncSession, *, assigned_id: UUID, org_id) -> CandidateJDAssignment | None:
    """Legacy function - get assignment by ID."""
    return await get_candidate_assignment_by_id(db, assigned_id, org_id)


async def get_current_assignment_leg(db: AsyncSession, *, jd_id: UUID, user_id: UUID, org_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get the active pending assignment leg for a JD, user, and organization."""
    query = select(CandidateJDAssignment).where(
        and_(
            CandidateJDAssignment.jd_id == jd_id,
            CandidateJDAssignment.assigned_user_id == user_id,
            CandidateJDAssignment.org_id == org_id,
            CandidateJDAssignment.status == "waiting_for_approval"
        )
    ).order_by(desc(CandidateJDAssignment.created_at))
    
    result = await db.execute(query)
    return result.scalars().first()
