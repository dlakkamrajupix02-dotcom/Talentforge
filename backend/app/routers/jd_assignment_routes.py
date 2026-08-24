from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.models import JobDescription, CandidateJDAssignment, User, Organization
from app.schemas.schemas import (JDAssignmentResponse, JDAssignmentCreate, JDAssignmentUpdate,CandidateJDAssignmentResponse,CandidateJDAssignmentCreate,CandidateJDAssignmentUpdate)
from app.services.dependencies import get_current_regular_user
from app.repository import jd_assignment_repository as jd_repo
from app.services.candidate_user_service import generate_public_signature_url
from app.repository import notification_repository as notify_repo

logger = get_logger()
router = APIRouter(prefix="/jd", tags=["JD Assignments"])

# Helper function to transfer JD data
def _jd_to_assignment_snapshot(jd: JobDescription) -> dict:
    """Convert JobDescription to assignment snapshot."""
    return {
        "title": jd.title,
        "company_name": jd.company_name,
        "job_id": jd.job_id,
        "job_family": jd.job_family,
        "job_level": jd.job_level,
        "department": jd.department,
        "location": jd.location,
        "city": jd.city,
        "country_code": jd.country_code,
        "seniority": jd.seniority,
        "industry": jd.industry,
        "salary_range": jd.salary_range,
        "salary_symbol": jd.salary_symbol,
        "salary_min_value": jd.salary_min_value,
        "salary_max_value": jd.salary_max_value,
        "salary_period": jd.salary_period,
        "key_skills": jd.key_skills,
        "core_competencies": jd.core_competencies,
        "functional_competencies": jd.functional_competencies,
        "additional_context": jd.additional_context,
        "input_prompt": jd.input_prompt,
        "generation_mode": jd.generation_mode,
        "model_used": jd.model_used,
        "content": jd.content,
        "eeoc_flags": jd.eeoc_flags,
        "eeoc_cleared": jd.eeoc_cleared,
        "status": jd.status,
        "word_count": jd.word_count,
        "created_at": jd.created_at,
        "updated_at": jd.updated_at
    }


def _get_assignment_title(assignment: CandidateJDAssignment) -> str:
    """Extract JD title from snapshot or relationship."""
    if assignment.jd_snapshot and isinstance(assignment.jd_snapshot, dict):
        title = assignment.jd_snapshot.get("title")
        if title:
            return title
    if assignment.jd:
        return assignment.jd.title
    return ""

# User-to-User Assignment Endpoints

@router.post("/", response_model=JDAssignmentResponse)
async def create_jd_assignment(assignment: JDAssignmentCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create a new JD assignment between users."""
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=400, detail="User has no company assigned")
        
        # Verify original JD exists and belongs to org
        jd_query = select(JobDescription).where(and_(JobDescription.id == assignment.original_jd_id,JobDescription.org_id == current_user.org_id))
        jd_result = await db.execute(jd_query)
        jd = jd_result.scalar_one_or_none()
        if not jd:
            raise HTTPException(status_code=404, detail="Original JD not found")
        
        # Verify recipient user exists and belongs to same org
        recipient_query = select(User).where(and_(User.id == assignment.sent_to,User.org_id == current_user.org_id))
        recipient_result = await db.execute(recipient_query)
        recipient = recipient_result.scalar_one_or_none()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        
        # Create assignment using repository function
        assigned_jd = await jd_repo.insert_assigned_jd_leg(db,org_id=current_user.org_id,original_jd_id=assignment.original_jd_id,jd_snapshot=_jd_to_assignment_snapshot(jd),sent_from=current_user.id,sent_to=assignment.sent_to,comment=assignment.comment or "")
        
        logger.info(f"JD assignment created: {assigned_jd.id} from {current_user.id} to {assignment.sent_to}")
        
        return {
            "id": str(assigned_jd.id),
            "original_jd_id": str(assigned_jd.jd_id),
            "sent_from": str(assigned_jd.assigned_by),
            "sent_to": str(assigned_jd.assigned_user_id),
            "status": assigned_jd.status,
            "comment": assigned_jd.comment,
            "created_at": assigned_jd.created_at,
            "updated_at": assigned_jd.updated_at,
            "title": jd.title
        }
        
    except Exception as exc:
        logger.exception("Failed to create JD assignment")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create JD assignment")

@router.get("/", response_model=List[JDAssignmentResponse])
async def get_sent_assignments(status_filter: Optional[str] = Query(None, description="Filter by status"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get JD assignments sent by current user."""
    try:
        query = select(CandidateJDAssignment).where(and_(CandidateJDAssignment.assigned_by == current_user.id,CandidateJDAssignment.org_id == current_user.org_id,
                CandidateJDAssignment.assigned_user_id.isnot(None))).options(selectinload(CandidateJDAssignment.assigned_user),selectinload(CandidateJDAssignment.jd))
        if status_filter:
            query = query.where(CandidateJDAssignment.status == status_filter)
        
        query = query.order_by(CandidateJDAssignment.created_at.desc())
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        return [
            {
                "id": str(assignment.id),
                "original_jd_id": str(assignment.jd_id),
                "sent_from": str(assignment.assigned_by),
                "sent_to": str(assignment.assigned_user_id),
                "status": assignment.status,
                "comment": assignment.comment,
                "created_at": assignment.created_at,
                "updated_at": assignment.updated_at,
                "title": _get_assignment_title(assignment)
            }
            for assignment in assignments
        ]
        
    except Exception as exc:
        logger.exception("Failed to get sent assignments")
        raise HTTPException(status_code=500, detail="Failed to get assignments")

@router.get("/received", response_model=List[JDAssignmentResponse])
async def get_received_assignments(status_filter: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get JD assignments received by current user."""
    try:
        query = select(CandidateJDAssignment).where(and_(
                CandidateJDAssignment.assigned_user_id == current_user.id,
                CandidateJDAssignment.org_id == current_user.org_id)).options(
            selectinload(CandidateJDAssignment.assignor),
            selectinload(CandidateJDAssignment.jd))
        
        if status_filter:
            query = query.where(CandidateJDAssignment.status == status_filter)
        
        query = query.order_by(CandidateJDAssignment.created_at.desc())
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        return [
            {
                "id": str(assignment.id),
                "original_jd_id": str(assignment.jd_id),
                "sent_from": str(assignment.assigned_by),
                "sent_to": str(assignment.assigned_user_id),
                "status": assignment.status,
                "comment": assignment.comment,
                "created_at": assignment.created_at,
                "updated_at": assignment.updated_at,
                "title": _get_assignment_title(assignment)
            }
            for assignment in assignments
        ]
        
    except Exception as exc:
        logger.exception("Failed to get received assignments")
        raise HTTPException(status_code=500, detail="Failed to get assignments")

@router.patch("/{assignment_id}", response_model=JDAssignmentResponse)
async def update_assignment_status(assignment_id: UUID,update: JDAssignmentUpdate,db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user)):
    """Update JD assignment status (approve/decline/forward)."""
    try:
        query = select(CandidateJDAssignment).where(and_(
                CandidateJDAssignment.id == assignment_id,
                CandidateJDAssignment.org_id == current_user.org_id,
                or_(CandidateJDAssignment.assigned_by == current_user.id,
                    CandidateJDAssignment.assigned_user_id == current_user.id))
        ).options(selectinload(CandidateJDAssignment.jd))
        
        result = await db.execute(query)
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Validate status transition
        valid_statuses = ['approved', 'declined', 'forward_for_approval', 'returned']
        if update.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        assignment = await jd_repo.update_assigned_leg_status(db, leg=assignment, status=update.status, comment=update.comment)
        
        logger.info(f"JD assignment {assignment_id} updated to status: {update.status}")
        
        return {
            "id": str(assignment.id),
            "original_jd_id": str(assignment.jd_id),
            "sent_from": str(assignment.assigned_by),
            "sent_to": str(assignment.assigned_user_id),
            "status": assignment.status,
            "comment": assignment.comment,
            "created_at": assignment.created_at,
            "updated_at": assignment.updated_at,
            "title": _get_assignment_title(assignment)
        }
        
    except Exception as exc:
        logger.exception("Failed to update assignment status")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update assignment")

# Candidate JD Assignment Endpoints

@router.post("/candidate", response_model=CandidateJDAssignmentResponse)
async def create_candidate_assignment(assignment: CandidateJDAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_regular_user)
):
    """Assign JD to a candidate user."""
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=400, detail="User has no company assigned")
        
        # Verify JD exists and belongs to org
        jd_query = select(JobDescription).where(and_(
                JobDescription.id == assignment.jd_id,
                JobDescription.org_id == current_user.org_id))
        jd_result = await db.execute(jd_query)
        jd = jd_result.scalar_one_or_none()
        if not jd:
            raise HTTPException(status_code=404, detail="JD not found")
        
        # Verify candidate exists and belongs to same org
        from app.services.candidate_user_service import candidate_user_service, generate_public_signature_url
        from app.repository import candidate_user_repository as candidate_repo
        candidate = await candidate_repo.get_candidate_by_id_and_org(db, assignment.candidate_id, current_user.org_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Create candidate assignment through repository helper
        candidate_assignment = await jd_repo.create_candidate_assignment(db, {
            "candidate_id": assignment.candidate_id,
            "jd_id": assignment.jd_id,
            "org_id": current_user.org_id,
            "assigned_user_id": current_user.id,
            "assigned_by": current_user.id,
            "due_date": assignment.due_date,
            "status": "pending",
            "decision": "",
            "jd_snapshot": _jd_to_assignment_snapshot(jd)
        })
        
        logger.info(f"Candidate JD assignment created: {candidate_assignment.id}")
        
        return {
            "id": str(candidate_assignment.id),
            "candidate_id": str(candidate_assignment.candidate_id),
            "jd_id": str(candidate_assignment.jd_id),
            "status": candidate_assignment.status,
            "due_date": candidate_assignment.due_date,
            "assigned_at": candidate_assignment.assigned_at,
            "completed_at": candidate_assignment.completed_at,
            "decision": candidate_assignment.decision,
            "digital_signature_url": generate_public_signature_url(candidate_assignment.digital_signature_url.split("/")[-1] if candidate_assignment.digital_signature_url else "") if candidate_assignment.digital_signature_url else None,
            "terms_accepted": candidate_assignment.terms_accepted,
            "terms_accepted_at": candidate_assignment.terms_accepted_at,
            "signature_method": candidate_assignment.signature_method
        }
        
    except Exception as exc:
        logger.exception("Failed to create candidate assignment")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create candidate assignment")

@router.get("/candidate", response_model=List[CandidateJDAssignmentResponse])
async def get_candidate_assignments(status_filter: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get all candidate JD assignments for organization."""
    try:
        query = select(CandidateJDAssignment).where(and_(
                CandidateJDAssignment.org_id == current_user.org_id,
                CandidateJDAssignment.candidate_id.isnot(None))).options(
            selectinload(CandidateJDAssignment.candidate),
            selectinload(CandidateJDAssignment.jd)
        )
        
        if status_filter:
            query = query.where(CandidateJDAssignment.status == status_filter)
        
        query = query.order_by(CandidateJDAssignment.assigned_at.desc())
        
        result = await db.execute(query)
        assignments = result.scalars().all()
        
        return [
            {
                "id": str(assignment.id),
                "candidate_id": str(assignment.candidate_id),
                "jd_id": str(assignment.jd_id),
                "status": assignment.status,
                "due_date": assignment.due_date,
                "assigned_at": assignment.assigned_at,
                "completed_at": assignment.completed_at,
                "decision": assignment.decision,
                "digital_signature_url": generate_public_signature_url(assignment.digital_signature_url.split("/")[-1] if assignment.digital_signature_url else "") if assignment.digital_signature_url else None,
                "terms_accepted": assignment.terms_accepted,
                "terms_accepted_at": assignment.terms_accepted_at,
                "signature_method": assignment.signature_method
            }
            for assignment in assignments
        ]
        
    except Exception as exc:
        logger.exception("Failed to get candidate assignments")
        raise HTTPException(status_code=500, detail="Failed to get candidate assignments")

@router.patch("/candidate/{assignment_id}")
async def update_candidate_assignment(assignment_id: UUID,update: CandidateJDAssignmentUpdate,
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update candidate JD assignment status and decision."""
    try:
        query = select(CandidateJDAssignment).where(and_(
                CandidateJDAssignment.id == assignment_id,
                CandidateJDAssignment.org_id == current_user.org_id)).options()  # No relationship loading
       
        result = await db.execute(query)
        assignment = result.scalar_one_or_none()
       
        if not assignment:
            raise HTTPException(status_code=404, detail="Candidate assignment not found")
       
        # Validate status transition
        valid_statuses = ['pending', 'accepted', 'rejected', 'completed']
        if update.status and update.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
       
        if update.status:
            assignment.status = update.status
        if update.decision is not None:
            assignment.decision = update.decision
        if update.due_date is not None:
            assignment.due_date = update.due_date
           
        # Handle sign-off specific fields
        if update.candidate_acknowledgement is not None:
            assignment.candidate_acknowledgement = update.candidate_acknowledgement
        if update.candidate_comments is not None:
            assignment.candidate_comments = update.candidate_comments
        # Handle signature fields - check both old and new field names
        if update.digital_signature_url is not None:
            sig_img = update.digital_signature_url
            assignment.signature_image_url = sig_img
            if sig_img and not sig_img.startswith("data:") and len(sig_img) <= 500:
                assignment.digital_signature_url = sig_img
            else:
                assignment.digital_signature_url = None
        elif hasattr(update, 'signature_image_url') and update.signature_image_url is not None:
            sig_img = update.signature_image_url
            assignment.signature_image_url = sig_img
            if sig_img and not sig_img.startswith("data:") and len(sig_img) <= 500:
                assignment.digital_signature_url = sig_img
            else:
                assignment.digital_signature_url = None
           
        if update.terms_accepted is not None:
            assignment.terms_accepted = update.terms_accepted
        if update.terms_accepted_at is not None:
            assignment.terms_accepted_at = update.terms_accepted_at
           
        if update.signature_method is not None:
            assignment.signature_method = update.signature_method
        elif hasattr(update, 'digital_signature') and update.digital_signature is not None:
            sig_val = update.digital_signature
            assignment.digital_signature = sig_val
            # Ensure signature_method VARCHAR(20) is safe
            if sig_val and "password" in sig_val.lower():
                assignment.signature_method = "password"
            elif sig_val and "signature" in sig_val.lower():
                assignment.signature_method = "digital_signature"
            else:
                assignment.signature_method = "password"
       
        # Set completed timestamp if status is completed
        if update.status == "completed" and not assignment.completed_at:
            from datetime import datetime, timezone
            assignment.completed_at = datetime.now(timezone.utc)
       
        assignment = await jd_repo.update_jd_assignment(db, assignment)
       
        logger.info(f"Candidate assignment {assignment_id} updated to status: {update.status}")
       
        # Create response using a simple dict to bypass any serialization
        from pydantic import BaseModel
       
        class CleanAssignmentResponse(BaseModel):
            id: str
            candidate_id: str
            jd_id: str
            status: str
            decision: str | None
            due_date: str | None
            assigned_at: str
            completed_at: str | None
            signature_method: str | None
            signature_image_url: str | None
            digital_signature_url: str | None
            candidate_acknowledgement: str | None
            candidate_comments: str | None
            message: str
       
        response = CleanAssignmentResponse(
            id=str(assignment.id),
            candidate_id=str(assignment.candidate_id),
            jd_id=str(assignment.jd_id),
            status=assignment.status,
            decision=assignment.decision,
            due_date=assignment.due_date.isoformat() if assignment.due_date else None,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            completed_at=assignment.completed_at.isoformat() if assignment.completed_at else None,
            signature_method=assignment.signature_method,
            signature_image_url=assignment.signature_image_url,
            digital_signature_url=assignment.signature_image_url if (assignment.signature_image_url and assignment.signature_image_url.startswith("data:")) else (
                generate_public_signature_url(assignment.digital_signature_url.split("/")[-1] if assignment.digital_signature_url else "") if assignment.digital_signature_url else None),
            candidate_acknowledgement=assignment.candidate_acknowledgement,
            candidate_comments=assignment.candidate_comments,
            message="Assignment updated successfully"
        )
       
        return response.model_dump()
       
    except Exception as exc:
        logger.exception("Failed to update candidate assignment")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update candidate assignment")
