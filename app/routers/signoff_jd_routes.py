from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.models import User, CandidateUser, CandidateJDAssignment
from app.schemas.schemas import SignOffJDResponse, SignOffJDUpdate, SignOffJDListResponse
from app.services.dependencies import get_current_user, get_current_regular_user, require_admin
from app.repository import candidate_user_repository as candidate_repo
from app.core.exceptions import NotFoundError, ForbiddenError
from app.services.pdf_service import pdf_generator

logger = get_logger()
router = APIRouter(prefix="/assigned-jds", tags=["Assigned JDs / Sign-Off"])


def _jd_content_payload(jd) -> dict | None:
    """Return persisted stable JSONB content; fall back to legacy-facing getter."""
    if not jd:
        return None
    raw = getattr(jd, "_content", None)
    if isinstance(raw, dict) and raw:
        return raw
    legacy = getattr(jd, "content", None)
    return legacy if isinstance(legacy, dict) else None

@router.get("/details/{id}")
async def get_assigned_jd_details(id: UUID,db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """
    Get detailed view of a Sign-Off JD (Assigned JD).
    """
    try:
        assignment = await candidate_repo.get_jd_assignment_by_id(db, id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assigned JD not found")
        # Security: Staff can view assignments in their org. Candidates can view
        # only their own assigned JD.
        if isinstance(current_user, CandidateUser):
            if assignment.candidate_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this record")
        elif assignment.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this record")
        
        # Import the helper function for signature URLs
        from app.services.candidate_user_service import generate_public_signature_url
        
        # Create clean response - only essential fields without duplicates
        clean_response = {
            "id": str(assignment.id),
            "candidate_id": str(assignment.candidate_id),
            "jd_id": str(assignment.jd_id),
            "status": assignment.status,
            "decision": assignment.decision,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
            # JD content (only once)
            "title": assignment.jd.title if assignment.jd else None,
            "company_name": assignment.jd.company_name if assignment.jd else None,
            "job_id": assignment.jd.job_id if assignment.jd else None,
            "department": assignment.jd.department if assignment.jd else None,
            "location": assignment.jd.location if assignment.jd else None,
            "salary_range": assignment.jd.salary_range if assignment.jd else None,
            "content": _jd_content_payload(assignment.jd),
            "sections_metadata": assignment.jd.sections_metadata if assignment.jd else {},
            "candidate_acknowledgement": assignment.candidate_acknowledgement,
            "candidate_comments": assignment.candidate_comments,
            "signature_method": assignment.signature_method,
            "digital_signature_url": generate_public_signature_url(
                assignment.digital_signature_url.split("/")[-1] if assignment.digital_signature_url else ""
            ) if assignment.digital_signature_url else None,
        }
        
        return clean_response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error fetching assigned JD {id}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/update/{id}")
async def update_assigned_jd(id: UUID,update_data: SignOffJDUpdate,db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """
    Update Sign-Off specific fields and handle completion logic.
    """
    try:
        assignment = await candidate_repo.get_jd_assignment_by_id(db, id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assigned JD not found")
           
        if isinstance(current_user, CandidateUser):
            if assignment.candidate_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this record")
        elif assignment.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this record")
 
        # Prepare update dict
        updates = update_data.model_dump(exclude_unset=True)
       
        # Map signature fields from request to database fields safely
        if "digital_signature" in updates:
            sig_val = updates["digital_signature"]
            updates["digital_signature"] = sig_val
            # Determine appropriate values for signature_method (VARCHAR(20))
            if sig_val and "password" in sig_val.lower():
                updates["signature_method"] = "password"
            elif sig_val and "signature" in sig_val.lower():
                updates["signature_method"] = "digital_signature"
            else:
                updates["signature_method"] = "password"
 
        if "signature_image_url" in updates:
            sig_img = updates["signature_image_url"]
            updates["signature_image_url"] = sig_img
            # Only store in legacy digital_signature_url if it fits and is not base64 data
            if sig_img and not sig_img.startswith("data:") and len(sig_img) <= 500:
                updates["digital_signature_url"] = sig_img
            else:
                updates["digital_signature_url"] = None
       
        # Completion logic
        if updates.get("status") == "sign-off-complete" and assignment.status != "sign-off-complete":
            updates["completed_at"] = datetime.now(timezone.utc)
           
        updated_assignment = await candidate_repo.update_jd_assignment(db, assignment, **updates)
       
        # Import the helper function for signature URLs
        from app.services.candidate_user_service import generate_public_signature_url
       
        # Create clean response - only essential fields without duplicates
        clean_response = {
            "id": str(updated_assignment.id),
            "candidate_id": str(updated_assignment.candidate_id),
            "jd_id": str(updated_assignment.jd_id),
            "status": updated_assignment.status,
            "decision": updated_assignment.decision,
            "due_date": updated_assignment.due_date.isoformat() if updated_assignment.due_date else None,
            "assigned_at": updated_assignment.assigned_at.isoformat() if updated_assignment.assigned_at else None,
            "completed_at": updated_assignment.completed_at.isoformat() if updated_assignment.completed_at else None,
            # JD content (only once)
            "title": updated_assignment.jd.title if updated_assignment.jd else None,
            "company_name": updated_assignment.jd.company_name if updated_assignment.jd else None,
            "job_id": updated_assignment.jd.job_id if updated_assignment.jd else None,
            "department": updated_assignment.jd.department if updated_assignment.jd else None,
            "location": updated_assignment.jd.location if updated_assignment.jd else None,
            "salary_range": updated_assignment.jd.salary_range if updated_assignment.jd else None,
            "content": _jd_content_payload(updated_assignment.jd),
            "sections_metadata": updated_assignment.jd.sections_metadata if updated_assignment.jd else {},
            # Sign-off specific fields (no duplicates)
            "candidate_acknowledgement": updated_assignment.candidate_acknowledgement,
            "candidate_comments": updated_assignment.candidate_comments,
            "signature_method": updated_assignment.signature_method,
            "signature_image_url": updated_assignment.signature_image_url,
            "digital_signature_url": updated_assignment.signature_image_url if (updated_assignment.signature_image_url and updated_assignment.signature_image_url.startswith("data:")) else (
                generate_public_signature_url(updated_assignment.digital_signature_url.split("/")[-1] if updated_assignment.digital_signature_url else "") if updated_assignment.digital_signature_url else None),
            "message": "Assignment updated successfully"
        }
       
        return clean_response
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error updating assigned JD {id}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update record")
@router.delete("/delete/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assigned_jd(id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Soft delete or delete a Sign-Off record (Admin only).
    """
    require_admin(current_user, detail="Only admins can delete assigned JDs")
    try:
        assignment = await candidate_repo.get_jd_assignment_by_id(db, id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assigned JD not found")
        if assignment.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this record")
        deleted = await candidate_repo.delete_candidate_assignment(db, assignment.id, current_user.org_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete record")
        return None
    except Exception as exc:
        logger.exception(f"Error deleting assigned JD {id}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete record")

@router.get("/list")
async def list_assigned_jds(status_filter: Optional[str] = Query(None, description="Filter by status"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    List all assigned JDs for the organization.
    """
    try:
        # Use existing repo method
        assignments = await candidate_repo.list_jd_assignments_by_org(db, current_user.org_id)
        
        if status_filter:
            assignments = [a for a in assignments if a.status == status_filter]
        
        # Import the helper function for signature URLs
        from app.services.candidate_user_service import generate_public_signature_url
        
        # Create clean response for each assignment
        clean_assignments = []
        for assignment in assignments:
            clean_assignment = {
                "id": str(assignment.id),
                "candidate_id": str(assignment.candidate_id),
                "jd_id": str(assignment.jd_id),
                "status": assignment.status,
                "decision": assignment.decision,
                "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
                "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
                # JD content (only once)
                "title": assignment.jd.title if assignment.jd else None,
                "company_name": assignment.jd.company_name if assignment.jd else None,
                "job_id": assignment.jd.job_id if assignment.jd else None,
                "department": assignment.jd.department if assignment.jd else None,
                "location": assignment.jd.location if assignment.jd else None,
                "salary_range": assignment.jd.salary_range if assignment.jd else None,
                "content": _jd_content_payload(assignment.jd),
                "sections_metadata": assignment.jd.sections_metadata if assignment.jd else {},
                # Sign-off specific fields (no duplicates)
                "candidate_acknowledgement": assignment.candidate_acknowledgement,
                "candidate_comments": assignment.candidate_comments,
                "signature_method": assignment.signature_method,
                "digital_signature_url": generate_public_signature_url(
                    assignment.digital_signature_url.split("/")[-1] if assignment.digital_signature_url else ""
                ) if assignment.digital_signature_url else None,
            }
            clean_assignments.append(clean_assignment)
            
        return {
            "signoff_jds": clean_assignments,
            "total": len(clean_assignments)
        }
    except Exception as exc:
        logger.exception("Error listing assigned JDs")
        raise HTTPException(status_code=500, detail="Failed to retrieve records")

@router.get("/download-signed-pdf/{assignment_id}")
async def download_signed_jd_pdf(assignment_id: UUID,db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """
    Download a signed JD PDF with user name and signature embedded.
    Only available for assignments with sign-off-complete status.
    """
    try:
        # Get the assignment
        assignment = await candidate_repo.get_jd_assignment_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assigned JD not found")
        
        # Security: Staff can download signed PDFs in their org. Candidates can
        # download only their own signed assignment.
        if isinstance(current_user, CandidateUser):
            if assignment.candidate_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this record")
        elif assignment.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this record")
        
        # Check if assignment is sign-off-complete
        if assignment.status != "sign-off-complete":
            raise HTTPException(status_code=400, detail="PDF download only available for completed sign-offs")
        
        # Get candidate information
        candidate_name = "Unknown User"
        username = None
        if assignment.candidate:
            candidate_name = assignment.candidate.full_name
        elif assignment.assigned_user:
            candidate_name = assignment.assigned_user.full_name
            # If it's an internal user, use their email prefix as a username fallback
            username = assignment.assigned_user.email.split('@')[0] if assignment.assigned_user.email else candidate_name
        
        # Get active terms for the organization
        from app.repository import tc_repository
        active_tc = await tc_repository.get_active_tc_by_org(db, assignment.org_id)
        terms_content = active_tc.content if active_tc else "I confirm that I have reviewed the job description and agree to abide by the standards and expectations set forth."

        # Prepare JD data for PDF generation
        jd_data = {
            "title": assignment.jd.title if assignment.jd else "Untitled JD",
            "company_name": assignment.company_name or (assignment.jd.company_name if assignment.jd else None),
            "job_id": assignment.job_id or (assignment.jd.job_id if assignment.jd else None),
            "department": assignment.department or (assignment.jd.department if assignment.jd else None),
            "location": assignment.location or (assignment.jd.location if assignment.jd else None),
            "city": assignment.city or (assignment.jd.city if assignment.jd else None),
            "country_code": assignment.country_code or (assignment.jd.country_code if assignment.jd else None),
            "job_family": assignment.job_family or (assignment.jd.job_family if assignment.jd else None),
            "job_level": assignment.job_level or (assignment.jd.job_level if assignment.jd else None),
            "seniority": assignment.seniority or (assignment.jd.seniority if assignment.jd else None),
            "employment_type": (assignment.jd.employment_type or "Full-Time") if assignment.jd else "Full-Time",
            "industry": assignment.industry or (assignment.jd.industry if assignment.jd else None),
            "salary_range": assignment.salary_range or (assignment.jd.salary_range if assignment.jd else None),
            "salary_symbol": assignment.salary_symbol or (assignment.jd.salary_symbol if assignment.jd else None),
            "salary_min_value": assignment.salary_min_value or (assignment.jd.salary_min_value if assignment.jd else None),
            "salary_max_value": assignment.salary_max_value or (assignment.jd.salary_max_value if assignment.jd else None),
            "salary_period": assignment.salary_period or (assignment.jd.salary_period if assignment.jd else None),
            "key_skills": assignment.key_skills or (assignment.jd.key_skills if assignment.jd else None),
            "core_competencies": assignment.core_competencies or (assignment.jd.core_competencies if assignment.jd else None),
            "functional_competencies": assignment.functional_competencies or (assignment.jd.functional_competencies if assignment.jd else None),
            "additional_context": assignment.additional_context or (assignment.jd.additional_context if assignment.jd else None),
            "image_url": assignment.image_url or (assignment.jd.image_url if assignment.jd else None),
            "content": assignment.content or _jd_content_payload(assignment.jd) or {},
            # Add signature information to content for PDF generation
            "signed_by": candidate_name,
            "username": username,
            "candidate_name": assignment.candidate.full_name if assignment.candidate else candidate_name,
            "signature_method": assignment.signature_method,
            "signature_image_url": assignment.signature_image_url,
            "digital_signature_url": assignment.digital_signature_url,
            "terms_accepted": assignment.terms_accepted,
            "terms_content": terms_content,
            "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
            "candidate_acknowledgement": assignment.candidate_acknowledgement,
            "candidate_comments": assignment.candidate_comments,
        }
        
        # Add signature section to content if not present
        if isinstance(jd_data["content"], dict):
            content = jd_data["content"].copy()
            # Add signature information as a new section
            signature_section = {
                "title": "Signature & Acknowledgement",
                "content": f"This job description was digitally signed and acknowledged by {candidate_name} on {assignment.completed_at.strftime('%Y-%m-%d %H:%M:%S')} UTC.\n\nSignature Method: {assignment.signature_method or 'Not specified'}\n\n"
            }
            
            if assignment.candidate_acknowledgement:
                signature_section["content"] += f"Candidate Acknowledgement: {assignment.candidate_acknowledgement}\n\n"
            
            if assignment.candidate_comments:
                signature_section["content"] += f"Candidate Comments: {assignment.candidate_comments}\n\n"
            
            # Add signature section to content
            content["signature_acknowledgement"] = signature_section["content"]
            jd_data["content"] = content
        
        # Determine if we should exclude terms and conditions
        exclude_terms = not isinstance(current_user, CandidateUser) and current_user.role in ["Admin", "HR", "Manager"]
        
        # Generate PDF
        return await pdf_generator.generate_pdf_stream(jd_data, jd_data["title"], exclude_terms=exclude_terms)
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error generating signed PDF for assignment {assignment_id}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
