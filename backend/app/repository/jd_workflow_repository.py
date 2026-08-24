from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import or_, select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import JDWorkflow, JDWorkflowRun, JobDescription, User
from app.repository.jd_repository import _clean_jd_watermarks


async def search_org_members(db: AsyncSession, *, org_id: UUID, query: str | None = None, skip: int = 0, limit: int = 100) -> list[User]:
    """Return active org members, optionally filtered by name or email (case-insensitive)."""
    stmt = select(User).where(User.org_id == org_id, User.deleted_at.is_(None))
    if query and query.strip():
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(or_(func.lower(User.full_name).like(func.lower(pattern)),func.lower(User.email).like(func.lower(pattern))))
    stmt = stmt.order_by(User.full_name).offset(skip).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_user_by_id_in_org(db: AsyncSession, *, user_id: UUID, org_id: UUID) -> User | None:
    res = await db.execute(select(User).where(User.id == user_id, User.org_id == org_id, User.deleted_at.is_(None)))
    return res.scalar_one_or_none()


async def get_user_by_email_in_org(db: AsyncSession, *, email: str, org_id: UUID) -> User | None:
    res = await db.execute(select(User).where(func.lower(User.email) == func.lower(email.strip()),
    User.org_id == org_id,User.deleted_at.is_(None)))
    return res.scalar_one_or_none()


async def get_jd_in_org(db: AsyncSession, *, jd_id: UUID, org_id: UUID) -> JobDescription | None:
    res = await db.execute(select(JobDescription).where(JobDescription.id == jd_id,JobDescription.org_id == org_id))
    return res.scalar_one_or_none()

async def finalize_jd(db: AsyncSession, *, jd: JobDescription) -> JobDescription:
    jd.status = "approved"
    jd.finalized_at = datetime.now(timezone.utc)
    _clean_jd_watermarks(jd)
    await db.commit()
    await db.refresh(jd)
    return jd

async def create_workflow(db: AsyncSession,*,org_id: UUID,created_by: UUID,name: str,steps: list,is_draft: bool = False) -> JDWorkflow:
    wf = JDWorkflow(org_id=org_id,created_by=created_by,name=name,steps=steps,is_draft=is_draft,is_active=True)
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return wf


async def get_workflow_by_id(db: AsyncSession, *, workflow_id: UUID, org_id: UUID) -> JDWorkflow | None:
    res = await db.execute(select(JDWorkflow).where(JDWorkflow.id == workflow_id,JDWorkflow.org_id == org_id,JDWorkflow.is_active.is_(True)))
    return res.scalar_one_or_none()


async def list_workflows_for_org(db: AsyncSession, *, org_id: UUID) -> list[JDWorkflow]:
    """All active workflows in the org (both draft and published), ordered by name."""
    res = await db.execute(select(JDWorkflow).where(JDWorkflow.org_id == org_id,JDWorkflow.is_active.is_(True)).order_by(JDWorkflow.name))
    return list(res.scalars().all())


async def deactivate_workflow(db: AsyncSession, *, wf: JDWorkflow) -> JDWorkflow:
    wf.is_active = False
    wf.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(wf)
    return wf


async def update_workflow(db: AsyncSession, *, wf: JDWorkflow, name: str | None = None,steps: list | None = None,
    is_draft: bool | None = None) -> JDWorkflow:
    if name is not None:
        wf.name = name
    if steps is not None:
        wf.steps = steps
    if is_draft is not None:
        wf.is_draft = is_draft
    wf.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(wf)
    return wf


async def create_workflow_run(db: AsyncSession,*,org_id: UUID,jd_id: UUID,workflow_id: UUID,initiated_by: UUID,
        resolved_steps: list,comments_trail: list | None = None) -> JDWorkflowRun:
    
    run = JDWorkflowRun(org_id=org_id,jd_id=jd_id,workflow_id=workflow_id,
        initiated_by=initiated_by,current_step_index=0,resolved_steps=resolved_steps,comments_trail=comments_trail or [],
        status="active")
    db.add(run)
    await db.commit()
    await db.refresh(run)


    return run


async def get_active_run_for_jd(db: AsyncSession, *, jd_id: UUID, org_id: UUID) -> JDWorkflowRun | None:
    res = await db.execute(select(JDWorkflowRun).where(JDWorkflowRun.jd_id == jd_id,JDWorkflowRun.org_id == org_id,
            JDWorkflowRun.status == "active"))
    return res.scalar_one_or_none()


async def get_any_run_for_jd(db: AsyncSession, *, jd_id: UUID, org_id: UUID) -> JDWorkflowRun | None:
    """Get any workflow run for a JD most recent first"""
    res = await db.execute(select(JDWorkflowRun).where(JDWorkflowRun.jd_id == jd_id, JDWorkflowRun.org_id == org_id)
        .order_by(JDWorkflowRun.created_at.desc()).limit(1))
    return res.scalar_one_or_none()


async def update_run(db: AsyncSession,*,run: JDWorkflowRun,current_step_index: int,status: str,comments_trail: list | None = None, resolved_steps: list | None = None, current_jd_version_id: UUID | None = None) -> JDWorkflowRun:
    run.current_step_index = current_step_index
    run.status = status
    if comments_trail is not None:
        run.comments_trail = comments_trail
    if resolved_steps is not None:
        run.resolved_steps = resolved_steps
    if current_jd_version_id is not None:
        run.current_jd_version_id = current_jd_version_id
    run.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)


    return run


async def delete_workflow_runs_for_jd(db: AsyncSession, *, jd_id: UUID, org_id: UUID) -> int:
    """Delete all workflow runs for a specific JD in an organization."""
    stmt = delete(JDWorkflowRun).where(JDWorkflowRun.jd_id == jd_id, JDWorkflowRun.org_id == org_id)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
