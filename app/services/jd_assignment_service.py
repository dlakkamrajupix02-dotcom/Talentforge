from __future__ import annotations
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import CandidateJDAssignment, JobDescription, User
from app.repository import jd_assignment_repository as jd_repo
from app.core.logging import get_logger
from datetime import datetime


logger = get_logger()

def _snapshot_from_jd(jd: JobDescription) -> dict:
    """Create a snapshot of JD data for assignment."""
    return {
        "id": str(jd.id),
        "title": jd.title,
        "job_id": jd.job_id,
        "department": jd.department,
        "job_family": jd.job_family,
        "job_level": jd.job_level,
        "industry": jd.industry,
        "country_code": jd.country_code,
        "status": jd.status,
        "content": jd.content,
        "word_count": jd.word_count,
        "updated_at": None,  
    }


class JDAssignmentService:
    """Service for managing JD assignments using CandidateJDAssignment table."""
    
    async def assign_jd_to_user(self, db: AsyncSession, *, jd_id: UUID, assignee_user_id: UUID, comment: str,current_user: User) -> CandidateJDAssignment:
        """Assign a JD to another user for review/approval."""
        if not current_user.org_id:
            raise ValueError("User has no organization assigned")
        
        # Verify JD exists and belongs to org
        jd = await jd_repo.get_jd_for_org(db, jd_id=jd_id, org_id=current_user.org_id)
        if not jd:
            raise ValueError("JD not found or access denied")
        
        # Verify assignee exists and belongs to same org
        assignee = await jd_repo.get_user_in_org(db, user_id=assignee_user_id, org_id=current_user.org_id)
        if not assignee:
            raise ValueError("Assignee user not found or not in same organization")
        
        # Check for existing pending assignment
        existing_count = await jd_repo.get_pending_assignment_count(db, jd_id=jd_id)
        if existing_count > 0:
            raise ValueError("JD already has a pending assignment")
        
        # Create assignment
        assignment_data = {
            "org_id": current_user.org_id,
            "jd_id": jd_id,
            "assigned_user_id": assignee_user_id,
            "assigned_by": current_user.id,
            "status": "waiting_for_approval",
            "comment": comment,
            "jd_snapshot": _snapshot_from_jd(jd)
        }
        
        assignment = await jd_repo.create_candidate_assignment(db, assignment_data)
        logger.info(f"JD {jd_id} assigned from {current_user.id} to {assignee_user_id}")
        
        return assignment
    
    async def assign_jd_to_candidate(self,db: AsyncSession,*,jd_id: UUID,candidate_id: UUID,due_date: datetime | None,decision: str | None,current_user: User) -> CandidateJDAssignment:
        """Assign a JD to a candidate user."""
        if not current_user.org_id:
            raise ValueError("User has no organization assigned")
        
        # Verify JD exists and belongs to org
        jd = await jd_repo.get_jd_for_org(db, jd_id=jd_id, org_id=current_user.org_id)
        if not jd:
            raise ValueError("JD not found or access denied")
        
        # Verify candidate exists and belongs to same org
        from app.repository import candidate_user_repository as candidate_repo
        candidate = await candidate_repo.get_candidate_by_id_and_org(db, candidate_id, current_user.org_id)
        if not candidate:
            raise ValueError("Candidate not found or not in same organization")
        
        # Create assignment
        assignment_data = {
            "candidate_id": candidate_id,
            "jd_id": jd_id,
            "org_id": current_user.org_id,
            "assigned_user_id": current_user.id,
            "assigned_by": current_user.id,
            "due_date": due_date,
            "status": "pending",
            "decision": decision or "",
            "jd_snapshot": _snapshot_from_jd(jd)
        }
        
        assignment = await jd_repo.create_candidate_assignment(db, assignment_data)
        logger.info(f"JD {jd_id} assigned to candidate {candidate_id}")
        
        return assignment
    
    async def forward_jd_assignment(self,db: AsyncSession,*,jd_id: UUID,decision: str,comment: str,current_user: User) -> CandidateJDAssignment:
        """Forward a JD assignment with decision."""
        if not current_user.org_id:
            raise ValueError("User has no organization assigned")
        
        # Find the assignment for this user
        assignment = await jd_repo.get_user_assignment_by_jd(db, jd_id=jd_id, user_id=current_user.id, org_id=current_user.org_id)
        if not assignment:
            raise ValueError("No assignment found for this JD")
        
        if assignment.status != "waiting_for_approval":
            raise ValueError("Assignment is not waiting for approval")
        
        # Update assignment status
        update_data = {
            "status": "forward_for_approval" if decision == "approved" else "declined",
            "comment": comment,
            "decision": f"{decision}: {comment}"
        }
        
        updated_assignment = await jd_repo.update_candidate_assignment_status(db, assignment.id, current_user.org_id, update_data)
        
        logger.info(f"JD assignment {assignment.id} forwarded with decision: {decision}")
        
        return updated_assignment
    
    async def get_user_assignments(self,db: AsyncSession,*,user_id: UUID,org_id: UUID,assignment_type: str = "received",  status: str | None = None) -> list[CandidateJDAssignment]:
        """Get assignments for a user (sent or received)."""
        if assignment_type == "sent":
            return await jd_repo.get_sent_assignments(db, user_id=user_id, org_id=org_id, status=status)
        else:
            return await jd_repo.get_received_assignments(db, user_id=user_id, org_id=org_id, status=status)
    
    async def get_candidate_assignments(self,db: AsyncSession,*,org_id: UUID,candidate_id: UUID | None = None,status: str | None = None) -> list[CandidateJDAssignment]:
        """Get candidate assignments."""
        if candidate_id:
            return await jd_repo.get_candidate_assignments_by_candidate(db, candidate_id, org_id)
        else:
            return await jd_repo.get_candidate_assignments(db, org_id, status)
    
    async def update_assignment_status(self,db: AsyncSession,*,assignment_id: UUID,status: str,comment: str | None = None,current_user: User) -> CandidateJDAssignment:
        """Update assignment status."""
        assignment = await jd_repo.get_candidate_assignment_by_id(db, assignment_id, current_user.org_id)
        if not assignment:
            raise ValueError("Assignment not found")
        
        # Check permissions
        if assignment.assigned_user_id != current_user.id and assignment.assigned_by != current_user.id:
            raise ValueError("Not authorized to update this assignment")
        
        # Validate status
        valid_statuses = ['approved', 'declined', 'forward_for_approval', 'returned', 'accepted', 'rejected', 'completed']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        update_data = {"status": status}
        if comment:
            update_data["comment"] = comment
        
        updated_assignment = await jd_repo.update_candidate_assignment_status(db, assignment_id, current_user.org_id, update_data)
        
        logger.info(f"Assignment {assignment_id} updated to status: {status}")
        
        return updated_assignment
    
    async def update_candidate_assignment(self,db: AsyncSession,*,assignment_id: UUID,org_id: UUID,update_data: dict) -> CandidateJDAssignment:
        """Update candidate assignment details."""
        assignment = await jd_repo.get_candidate_assignment_by_id(db, assignment_id, org_id)
        if not assignment:
            raise ValueError("Candidate assignment not found")
        
        # Set completed timestamp if status is completed
        if update_data.get("status") == "completed" and not assignment.completed_at:
            from datetime import datetime, timezone
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        updated_assignment = await jd_repo.update_candidate_assignment_status(db, assignment_id, org_id, update_data)
        
        logger.info(f"Candidate assignment {assignment_id} updated")
        
        return updated_assignment


# Create singleton instance
jd_assignment_service = JDAssignmentService()
