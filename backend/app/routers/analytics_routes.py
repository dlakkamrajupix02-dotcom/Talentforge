from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import CandidateUser, JobDescription, Template, User
from app.services.dependencies import get_current_regular_user
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/jd-approval-funnel")
async def get_jd_approval_funnel(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)) -> Any:
    """Get JD approval funnel data for visualization.
    
    Returns stages:
    - total_intake: All JDs in the organization
    - manager_review: JDs currently in manager review stage
    - hr_review: JDs currently in HR review stage
    - accepted: JDs that have been approved
    - rejected: JDs that have been rejected/declined
    - rate: Acceptance rate percentage
    """
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no organization assigned")
    if current_user.role not in {"Admin", "Manager", "HR"}:
        raise HTTPException(status_code=403, detail="Only Admin, Manager, and HR can access funnel analytics")
    return await analytics_service.get_jd_approval_funnel(db=db,org_id=current_user.org_id)


@router.get("/me/recent-activities")
async def get_my_recent_activities(limit: int = 20,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)) -> Any:
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no organization assigned")
    return await analytics_service.get_user_recent_activities(db=db,user_id=current_user.id,org_id=current_user.org_id,limit=limit)


@router.get("/users/{user_id}/recent-activities")
async def get_user_recent_activities(user_id: str,limit: int = 20,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)) -> Any:
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no organization assigned")
    if current_user.role not in {"Admin", "Manager", "HR"} and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own recent activities")
    return await analytics_service.get_user_recent_activities(db=db,user_id=user_id,org_id=current_user.org_id,limit=limit)


@router.get("/unified-engine-overview")
async def get_unified_engine_overview(response: Response, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)) -> Any:
    if current_user.role not in {"Admin", "Manager", "HR"}:
        raise HTTPException(status_code=403, detail="Only Admin, Manager, and HR can access analytics")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no organization assigned")
    return await analytics_service.get_unified_engine_overview(response=response, db=db, org_id=current_user.org_id)
