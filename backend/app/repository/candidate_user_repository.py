from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, update, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.models import CandidateUser, CandidateJDAssignment


def active_candidate_users_filter():
    """Filter to exclude soft-deleted candidate users."""
    return CandidateUser.deleted_at.is_(None)


async def get_candidate_user_by_id(db: AsyncSession, candidate_id: UUID, org_id: Optional[UUID] = None) -> Optional[CandidateUser]:
    """Get a candidate user by ID. If org_id provided, restrict to that organization."""
    query = select(CandidateUser).where(CandidateUser.id == candidate_id, active_candidate_users_filter())
    if org_id:
        query = query.where(CandidateUser.org_id == org_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_candidate_by_id_and_org(db: AsyncSession, candidate_id: UUID, org_id: UUID) -> Optional[CandidateUser]:
    """Get a candidate user by ID within the specified organization."""
    return await get_candidate_user_by_id(db, candidate_id, org_id=org_id)


async def get_candidate_user_by_email(db: AsyncSession, email: str, org_id: Optional[UUID] = None) -> Optional[CandidateUser]:
    """Get a candidate user by email. If org_id provided, restrict to that organization."""
    query = select(CandidateUser).where(CandidateUser.email == email, active_candidate_users_filter())
    if org_id:
        query = query.where(CandidateUser.org_id == org_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def deactivate_stale_candidate_users(db: AsyncSession, org_id: UUID) -> None:
    """Mark inactive candidates who have been idle for too long."""
    threshold = datetime.now(timezone.utc) - timedelta(days=10)
    await db.execute(
        update(CandidateUser)
        .where(
            CandidateUser.org_id == org_id,
            CandidateUser.status == "active",
            or_(
                CandidateUser.last_login_at < threshold,
                and_(CandidateUser.last_login_at.is_(None), CandidateUser.created_at < threshold),
            ),
        )
        .values(status="inactive")
    )
    await db.commit()


async def list_candidate_users(db: AsyncSession, org_id: UUID) -> list[CandidateUser]:
    """List all candidate users for an organization."""
    result = await db.execute(
        select(CandidateUser)
        .where(CandidateUser.org_id == org_id, active_candidate_users_filter())
        .order_by(CandidateUser.created_at.desc())
    )
    return list(result.scalars().all())


async def create_candidate_user(db: AsyncSession,org_id: UUID,full_name: str,email: str,hashed_password: str,created_by: Optional[UUID] = None,creator_name: Optional[str] = None,company_name: Optional[str] = None,employee_id: Optional[str] = None) -> CandidateUser:
    """Create a new candidate user."""
    candidate = CandidateUser(
        org_id=org_id,
        full_name=full_name,
        email=email,
        hashed_password=hashed_password,
        created_by=created_by,
        creator_name=creator_name,
        company_name=company_name,
        employee_id=employee_id,
        mfa_enabled=False,
        mfa_verified=False,
        mfa_required=False,
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_user(db: AsyncSession,candidate: CandidateUser,full_name: Optional[str] = None,email: Optional[str] = None,hashed_password: Optional[str] = None,company_name: Optional[str] = None,employee_id: Optional[str] = None,failed_login_attempts: Optional[int] = None,status: Optional[str] = None) -> CandidateUser:
    """Update candidate user details."""
    if full_name is not None:
        candidate.full_name = full_name
    if email is not None:
        candidate.email = email
    if hashed_password is not None:
        candidate.hashed_password = hashed_password
    if company_name is not None:
        candidate.company_name = company_name
    if employee_id is not None:
        candidate.employee_id = employee_id
    if failed_login_attempts is not None:
        candidate.failed_login_attempts = failed_login_attempts
    if status is not None:
        candidate.status = status
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_password(db: AsyncSession, candidate: CandidateUser, hashed_password: str) -> CandidateUser:
    """Persist a candidate password change."""
    candidate.hashed_password = hashed_password
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_status(db: AsyncSession, candidate: CandidateUser, status: str) -> CandidateUser:
    """Persist a candidate status change."""
    candidate.status = status
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_last_login(db: AsyncSession, candidate: CandidateUser, status: str = "active") -> CandidateUser:
    """Persist candidate login metadata."""
    candidate.last_login_at = datetime.now(timezone.utc)
    candidate.status = status
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_mfa_state(db: AsyncSession, candidate: CandidateUser, *, enabled: bool | None = None, verified: bool | None = None, required: bool | None = None) -> CandidateUser:
    """Persist candidate MFA state changes."""
    if enabled is not None:
        candidate.mfa_enabled = enabled
    if verified is not None:
        candidate.mfa_verified = verified
    if required is not None:
        candidate.mfa_required = required
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def update_candidate_signature_url(db: AsyncSession, candidate: CandidateUser, signature_url: str | None) -> CandidateUser:
    """Persist a candidate digital signature URL."""
    candidate.digital_signature_url = signature_url
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def soft_delete_candidate_user(db: AsyncSession, candidate: CandidateUser) -> None:
    """Soft delete a candidate user."""
    await db.delete(candidate)
    await db.commit()


# JD Assignment methods
async def create_jd_assignment(db: AsyncSession, **kwargs) -> CandidateJDAssignment:
    """Create a new JD assignment with the provided fields."""
    assignment = CandidateJDAssignment(**kwargs)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_jd_assignment_by_id(db: AsyncSession,assignment_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get an assignment by ID."""
    result = await db.execute(select(CandidateJDAssignment).where(CandidateJDAssignment.id == assignment_id).options(selectinload(CandidateJDAssignment.jd),selectinload(CandidateJDAssignment.parent_jd),
            selectinload(CandidateJDAssignment.candidate),selectinload(CandidateJDAssignment.assignor)))
    return result.scalar_one_or_none()


async def get_jd_assignment_by_candidate_and_jd(db: AsyncSession,candidate_id: UUID,jd_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get an assignment by candidate_id and jd_id."""
    result = await db.execute(select(CandidateJDAssignment).where(and_(CandidateJDAssignment.candidate_id == candidate_id,CandidateJDAssignment.jd_id == jd_id)).options(selectinload(CandidateJDAssignment.jd)))
    return result.scalar_one_or_none()


async def list_jd_assignments_by_candidate(db: AsyncSession,candidate_id: UUID) -> List[CandidateJDAssignment]:
    """List all assignments for a candidate."""
    result = await db.execute(select(CandidateJDAssignment).where(CandidateJDAssignment.candidate_id == candidate_id).order_by(CandidateJDAssignment.assigned_at.desc()).options(selectinload(CandidateJDAssignment.jd), selectinload(CandidateJDAssignment.parent_jd), selectinload(CandidateJDAssignment.assignor)))
    return list(result.scalars().all())


async def list_jd_assignments_by_org(db: AsyncSession,org_id: UUID) -> List[CandidateJDAssignment]:
    """List all assignments for an organization."""
    result = await db.execute(select(CandidateJDAssignment).where(CandidateJDAssignment.org_id == org_id).where(CandidateJDAssignment.candidate_id.isnot(None))  # Only include assignments with valid candidates
        .order_by(CandidateJDAssignment.assigned_at.desc()).options(selectinload(CandidateJDAssignment.jd), selectinload(CandidateJDAssignment.parent_jd)))
    return list(result.scalars().all())


async def update_jd_assignment(db: AsyncSession, assignment: CandidateJDAssignment, **kwargs) -> CandidateJDAssignment:
    """Update an assignment with provided fields."""
    for key, value in kwargs.items():
        if hasattr(assignment, key):
            setattr(assignment, key, value)
    if "terms_accepted" in kwargs and kwargs["terms_accepted"]:
        assignment.terms_accepted_at = datetime.now(timezone.utc)
    assignment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def list_all_jd_assignments(db: AsyncSession, org_id: UUID) -> List[CandidateJDAssignment]:
    """List all JD assignments for an entire organization (Admin only)."""
    result = await db.execute(select(CandidateJDAssignment).where(CandidateJDAssignment.org_id == org_id).where(CandidateJDAssignment.candidate_id.isnot(None))  # Only include assignments with valid candidates
        .options(selectinload(CandidateJDAssignment.jd),selectinload(CandidateJDAssignment.candidate)).order_by(CandidateJDAssignment.created_at.desc()))
    return list(result.scalars().all())


async def get_candidate_assignment_by_id(db: AsyncSession, assignment_id: UUID, org_id: UUID) -> Optional[CandidateJDAssignment]:
    """Get a specific JD assignment by ID with organization check."""
    query = select(CandidateJDAssignment).where(and_(CandidateJDAssignment.id == assignment_id,CandidateJDAssignment.org_id == org_id)).options(selectinload(CandidateJDAssignment.jd),selectinload(CandidateJDAssignment.candidate))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_candidate_jd_assignments_by_email(db: AsyncSession, email: str, org_id: UUID) -> List[CandidateJDAssignment]:
    """Get JD assignments for a candidate by email."""
    candidate = await get_candidate_user_by_email(db, email, org_id)
    if not candidate:
        return []
    return await list_jd_assignments_by_candidate(db, candidate.id)


async def get_candidate_by_id_with_org_check(db: AsyncSession, candidate_id: UUID, org_id: UUID) -> Optional[CandidateUser]:
    """Get candidate by ID with organization check."""
    return await get_candidate_user_by_id(db, candidate_id, org_id)

