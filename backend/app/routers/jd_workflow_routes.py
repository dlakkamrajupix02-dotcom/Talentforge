from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.exceptions import BadRequestError, ForbiddenError
from app.models.models import User
from app.services.dependencies import get_current_regular_user, require_admin
from app.services.jd_workflow_service import jd_workflow_service
from app.schemas.schemas import CreateWorkflowRequest,UpdateWorkflowRequest,TriggerWorkflowRequest,BulkTriggerWorkflowRequest,WorkflowDecideRequest,DelegateStepRequest

router = APIRouter(prefix="/jd/workflow",tags=["JD Workflows"],dependencies=[Depends(get_current_regular_user)])


def _require_org(current_user: User) -> None:
    if not current_user.org_id:
        raise BadRequestError("User has no company assigned.")


@router.get("/members",include_in_schema=True)
async def search_org_members(que: Optional[str] = Query(None, description="Search by name or email (leave empty to list all)"),skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of records to return"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Search members of the current user's organisation by name or email.
    Used to populate the Assign Reviewer field when creating a workflow step.
    Accessible to Admin and Manager roles.
    """
    if current_user.role not in ["Admin", "Manager"]:
        raise ForbiddenError("Only Admins and Managers can search organization members.")
    
    _require_org(current_user)
    return await jd_workflow_service.search_members(db, query=que, current_user=current_user, skip=skip, limit=limit)


@router.get("/list_all_workflows")
async def list_workflows(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    List all active workflows in the organisation.
    Visible to all org members Includes both published and draft workflows.
    """
    _require_org(current_user)
    return await jd_workflow_service.list_workflows(db, current_user=current_user)


@router.get("/jd_state/{jd_id}")
async def get_workflow_run_status(jd_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get the current state of an active workflow run for a JD.
    Returns current approver, step details, overall status, and the full `comments_trail`.
    """
    _require_org(current_user)
    return await jd_workflow_service.get_run_status(db, jd_id=jd_id, current_user=current_user)


@router.post("/create_workflow")
async def create_workflow(payload: CreateWorkflowRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin only Create a new approval workflow with N ordered steps.
    Uses user_email instead of user_id for easier assignment.
    """
    _require_org(current_user)
    require_admin(current_user, detail="Only Admins can create workflows.")
    
    # Convert user_email to user_id
    from app.repository import organization_repository as org_repo
    steps_input = []
    
    for s in payload.steps:
        # Find user by email in organization
        user = await org_repo.get_user_by_email(db, s.user_email, current_user.org_id)
        if not user:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"User with email {s.user_email} not found in organization")
        
        steps_input.append({
            "step_name": s.step_name, 
            "user_id": str(user.id),
            "user_email": s.user_email,
            "sla_days": s.sla_days
        })
    
    return await jd_workflow_service.create_workflow(db,name=payload.name,steps_input=steps_input,
        is_draft=payload.is_draft,current_user=current_user)


@router.patch("/{workflow_id}")
async def patch_workflow(workflow_id: UUID,payload: UpdateWorkflowRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin only. Patch an existing workflow (name, draft flag, and/or step assignees).
    Useful when a reviewer has left and needs to be replaced quickly.
    """
    _require_org(current_user)
    require_admin(current_user, detail="Only Admins can update workflows.")

    from app.repository import organization_repository as org_repo

    steps_input = None
    if payload.steps is not None:
        steps_input = []
        for s in payload.steps:
            user = await org_repo.get_user_by_email(db, s.user_email, current_user.org_id)
            if not user:
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail=f"User with email {s.user_email} not found in organization")

            steps_input.append({
                "step_name": s.step_name,
                "user_id": str(user.id),
                "user_email": s.user_email,
                "sla_days": s.sla_days
            })

    return await jd_workflow_service.update_workflow(db,workflow_id=workflow_id,name=payload.name,
        steps_input=steps_input,is_draft=payload.is_draft,current_user=current_user)


@router.delete("/delete/{workflow_id}")
async def delete_workflow(workflow_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Admin only. Deactivate a workflow so it no longer appears in the picker."""
    _require_org(current_user)
    require_admin(current_user, detail="Only Admins can delete workflows.")
    return await jd_workflow_service.delete_workflow(db, workflow_id=workflow_id, current_user=current_user)


@router.post("/start_workflow_event")
async def trigger_workflow(payload: TriggerWorkflowRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Start an approval workflow on a JD.
    """
    _require_org(current_user)
    return await jd_workflow_service.trigger_workflow(db,jd_id=payload.jd_id,workflow_id=payload.workflow_id,
        comment=payload.comment,current_user=current_user)


@router.post("/bulk_workflow_event")
async def bulk_trigger_workflow(payload: BulkTriggerWorkflowRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Start an approval workflow on multiple JDs with final status — assign them all to the same workflow.
    """
    _require_org(current_user)
    return await jd_workflow_service.bulk_trigger_workflow(db,jd_ids=payload.jd_ids,workflow_id=payload.workflow_id,
        comment=payload.comment,current_user=current_user)


@router.post("/workflow_decision")
async def decide_on_workflow(payload: WorkflowDecideRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Approve or decline a JD at your assigned step.
    """
    _require_org(current_user)
    return await jd_workflow_service.process_decision(db,jd_id=payload.jd_id,
        decision=payload.decision,comment=payload.comment,current_user=current_user)


@router.post("/{jd_id}/delegate")
async def delegate_workflow_step(jd_id: UUID,payload: DelegateStepRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Delegate the current approval step to another manager.
    """
    _require_org(current_user)
    
    # Validate jd_id is not None or invalid
    if not jd_id:
        raise BadRequestError("JD ID is required for delegation.")
    
    return await jd_workflow_service.delegate_workflow_step(db,jd_id=jd_id,delegate_to_email=payload.delegate_to_email,
        comment=payload.comment,current_user=current_user)
