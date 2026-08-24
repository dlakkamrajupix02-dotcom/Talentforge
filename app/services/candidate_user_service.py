from __future__ import annotations
from datetime import datetime, timezone
from logging import Logger
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User, CandidateUser, JobDescription
from app.repository import candidate_user_repository as candidate_repo
from app.schemas.schemas import BulkJDRequest
from app.services.notification_service import notification_service
from app.core.exceptions import NotFoundError, ConflictError, ForbiddenError, AppValidationError
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.core.logging import get_logger
from app.services.dependencies import CSOD_STAFF_ROLES

logger = get_logger()


def _require_assignment_staff(user: User) -> None:
    if user.role not in CSOD_STAFF_ROLES:
        raise ForbiddenError("Only Admins, HR, and Managers can manage JD assignments.")


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


def generate_public_signature_url(filename: str, email: str = None) -> str:
    """Generate public URL for signature image without authentication."""
    return f"/public/digital_signatures/{filename}"


class CandidateUserService:
    async def login_candidate(self, db: AsyncSession, email: str, password: str) -> dict:
        """Authenticate a candidate and return a token."""
        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate or not verify_password(password, candidate.hashed_password):
            raise ForbiddenError("Invalid email or password.")
        
        token = create_access_token({"sub": str(candidate.id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": candidate.role
        }

    async def process_candidate_decision(self, db: AsyncSession, *, candidate: CandidateUser, jd_id: UUID, password: str, terms_accepted: bool, signature_method: str, digital_signature_url: Optional[str] = None) -> dict:
        """
        Process candidate decision for specific JD assignment (electronic signature via password or digital signature).
        - Correct password: Reset failed attempts and record signature on JD assignment.
        - 3 wrong attempts: Account locked.
        - Terms acceptance must be True.
        - Updates JD assignment status to 'accepted'.
        """
        # Validate terms acceptance
        if not terms_accepted:
            raise AppValidationError("Terms and conditions must be accepted to proceed.")
        
        # Verify password
        is_correct = verify_password(password, candidate.hashed_password)

        if is_correct:
            # Get the JD assignment
            assignment = await candidate_repo.get_jd_assignment_by_candidate_and_jd(db, candidate.id, jd_id)
            if not assignment:
                raise NotFoundError("JD assignment not found for this candidate.")

            sig_url = None
            dig_sig_url = None
            if signature_method == 'digital_signature':
                sig_url = digital_signature_url or candidate.digital_signature_url
                if sig_url and sig_url.startswith("data:"):
                    sig_img_url = sig_url
                    dig_sig_url = None
                else:
                    sig_img_url = None
                    dig_sig_url = sig_url
            else:
                sig_img_url = None
                dig_sig_url = None

            assignment = await candidate_repo.update_jd_assignment(
                db,
                assignment,
                terms_accepted=True,
                terms_accepted_at=datetime.now(timezone.utc),
                signature_method=signature_method,
                status="accepted",
                completed_at=datetime.now(timezone.utc),
                digital_signature_url=dig_sig_url,
                signature_image_url=sig_img_url,
            )

            await candidate_repo.update_candidate_user(db, candidate, failed_login_attempts=0)

            # Use assignment's signature or fall back to candidate's
            if assignment.signature_image_url and assignment.signature_image_url.startswith("data:"):
                returned_signature = assignment.signature_image_url
            else:
                resolved_signature_url = assignment.digital_signature_url or candidate.digital_signature_url
                returned_signature = generate_public_signature_url(resolved_signature_url.split("/")[-1] if resolved_signature_url else "") if resolved_signature_url else None

            return {
                "success": True,
                "message": f"JD assignment accepted successfully using {signature_method.replace('_', ' ').title()}. Decision recorded.",
                "candidate_id": str(candidate.id),
                "email": candidate.email,
                "full_name": candidate.full_name,
                "jd_id": str(jd_id),
                "assignment_status": assignment.status,
                "signature_method": signature_method,
                "terms_accepted_at": assignment.terms_accepted_at.isoformat() if assignment.terms_accepted_at else None,
                "digital_signature_url": returned_signature,
                "failed_attempts": candidate.failed_login_attempts
            }
        else:
            candidate.failed_login_attempts += 1
            await candidate_repo.update_candidate_user(db, candidate, failed_login_attempts=candidate.failed_login_attempts)
            if candidate.failed_login_attempts >= 3:
                # Implement account lock logic
                candidate.status = "locked"
                await candidate_repo.update_candidate_user(db, candidate, status="locked")
                raise ForbiddenError("Account locked due to multiple failed attempts. Contact support.")
            else:
                raise ForbiddenError(f"Invalid password. {3 - candidate.failed_login_attempts} attempts remaining.")

    async def create_candidate(self,db: AsyncSession,*,full_name: str,email: str,password: str,company_name: Optional[str],employee_id: Optional[str],current_user: User) -> dict:
        """Create a new candidate user (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can create candidate users.")

        # Check if email already exists
        existing = await candidate_repo.get_candidate_user_by_email(db, email)
        if existing:
            raise ConflictError("A candidate user with this email already exists.")

        # Auto-populate company_name if not provided
        if not company_name:
            from app.repository import organization_repository as org_repo
            org = await org_repo.get_organization_by_id(db, current_user.org_id)
            company_name = org.name if org else None

        # Create candidate user
        hashed_pw = hash_password(password)
        candidate = await candidate_repo.create_candidate_user(db,org_id=current_user.org_id,full_name=full_name,email=email,hashed_password=hashed_pw,created_by=current_user.id,creator_name=current_user.full_name,company_name=company_name,employee_id=employee_id)

        return {
            "id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "role": candidate.role,
            "company_name": candidate.company_name,
            "employee_id": candidate.employee_id,
                "created_by": str(candidate.created_by) if candidate.created_by else None,
                "creator_name": candidate.creator_name if getattr(candidate, "creator_name", None) else None,
            "created_at": candidate.created_at,
            "updated_at": candidate.updated_at,
            "message": "Candidate user created successfully."
        }

    async def list_candidates(self,db: AsyncSession,*,current_user: User) -> dict:
        """List all candidate users for the organization (Admin/HR/Manager)."""
        _require_assignment_staff(current_user)

        await candidate_repo.deactivate_stale_candidate_users(db, current_user.org_id)
        candidates = await candidate_repo.list_candidate_users(db, current_user.org_id)

        return {
            "candidates": [
                {
                    "id": str(c.id),
                    "org_id": str(c.org_id),
                    "full_name": c.full_name,
                    "email": c.email,
                    "role": c.role,
                    "company_name": c.company_name,
                    "employee_id": c.employee_id,
                    "created_by": str(c.created_by) if c.created_by else None,
                    "creator_name": c.creator_name if getattr(c, "creator_name", None) else None,
                    "created_at": c.created_at,
                    "updated_at": c.updated_at,
                }
                for c in candidates
            ],
            "total": len(candidates),
        }

    async def get_candidate(self,db: AsyncSession,*,email: str,current_user: User) -> dict:
        """Get a candidate user by email (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can view candidate users.")

        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user not found.")

        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only view candidate users from your own organization.")

        return {
            "id": str(candidate.id),
            "org_id": str(candidate.org_id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "role": candidate.role,
            "company_name": candidate.company_name,
            "employee_id": candidate.employee_id,
            "created_by": str(candidate.created_by) if candidate.created_by else None,
            "created_at": candidate.created_at,
            "updated_at": candidate.updated_at,
        }

    async def update_candidate(self,db: AsyncSession,*,email: str,full_name: Optional[str],new_email: Optional[str],password: Optional[str],company_name: Optional[str],employee_id: Optional[str],current_user: User) -> dict:
        """Update a candidate user by email (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can update candidate users.")
        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user not found.")
        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only update candidate users from your own organization.")
        # Check email uniqueness if being updated
        if new_email and new_email != candidate.email:
            existing = await candidate_repo.get_candidate_user_by_email(db, new_email)
            if existing:
                raise ConflictError("A candidate user with this email already exists.")
        # Hash password if provided
        hashed_pw = None
        if password:
            hashed_pw = hash_password(password)
        # Update candidate user
        updated = await candidate_repo.update_candidate_user(db,candidate,full_name=full_name,email=new_email,hashed_password=hashed_pw,company_name=company_name,employee_id=employee_id)
        return {
            "id": str(updated.id),
            "full_name": updated.full_name,
            "email": updated.email,
            "role": updated.role,
            "company_name": updated.company_name,
            "employee_id": updated.employee_id,
            "created_by": str(updated.created_by) if updated.created_by else None,
            "created_at": updated.created_at,
            "updated_at": updated.updated_at,
            "message": "Candidate user updated successfully."
        }

    async def delete_candidate(self,db: AsyncSession,*,candidate_id: UUID,current_user: User) -> dict:
        """Soft delete a candidate user (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can delete candidate users.")
        candidate = await candidate_repo.get_candidate_user_by_id(db, candidate_id)
        if not candidate:
            raise NotFoundError("Candidate user not found.")
        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only delete candidate users from your own organization.")
        await candidate_repo.soft_delete_candidate_user(db, candidate)
        return {
            "id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "message": "Candidate user deleted successfully."
        }

    async def delete_candidate_by_email(self,db: AsyncSession,*,email: str,current_user: User) -> dict:
        """Soft delete a candidate user by email (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can delete candidate users.")
        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user with this email not found.")
        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only delete candidate users from your own organization.")
        await candidate_repo.soft_delete_candidate_user(db, candidate)
        return {
            "id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "message": "Candidate user deleted successfully."
        }


    async def allot_jd_to_candidate(self,db: AsyncSession,*,email: str,jd_id: UUID,due_date: Optional[datetime] = None,status: str = "pending",current_user: User) -> dict:
        """Allot a JD to a candidate user for sign-off.
        
        Copies required JD fields directly into the assignment record to create
        a clean independent Sign-Off JD structure.
        """
        _require_assignment_staff(current_user)
        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user not found.")
        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only allot JDs to candidates from your own organization.")
        # Validate JD belongs to the same organization and is APPROVED
        from app.repository import jd_repository as jd_repo
        jd = await jd_repo.get_jd_by_id(db, jd_id)
        if not jd or jd.org_id != current_user.org_id:
            raise AppValidationError("Invalid JD ID or JD does not belong to your organization.")
        if jd.status not in ["approved", "pushed_to_csod"]:
            raise AppValidationError(f"Only approved or pushed_to_csod JDs can be assigned for sign-off. Current status: {jd.status}")
        # Check if an assignment already exists for this jd_id and candidate_id
        # The unique constraint 'uq_candidate_jd_assignment' prevents duplicates
        existing_assignments = await candidate_repo.list_jd_assignments_by_candidate(db, candidate.id)
        for existing in existing_assignments:
            if existing.jd_id == jd_id:
                if existing.status == "pending":
                    raise ConflictError("An active sign-off record for this JD already exists for this candidate.")
                else:
                    raise ConflictError(f"A sign-off record for this JD already exists for this candidate (Status: {existing.status}). Please remove it if you wish to re-allot.")

        # Fields to copy directly from the original JD
        assignment_data = {
            "candidate_id": candidate.id,
            "jd_id": jd_id, # parent_jd_id
            "parent_jd_id": jd_id,
            "assigned_end_user_id": candidate.id,
            "assigned_user_id": current_user.id,
            "org_id": current_user.org_id,
            "assigned_by": current_user.id,
            "created_by": current_user.id,
            "due_date": due_date,
            "status": status,
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
            "image_url": jd.image_url,
            "content": jd.content,
            # Initialize Sign-Off Specific Fields
            "candidate_acknowledgement": "",
            "candidate_comments": "",
            "digital_signature": "",
            "signature_image_url": "",
            # Add JD snapshot
            "jd_snapshot": _snapshot_from_jd(jd),
        }
        # Create new assignment
        assignment = await candidate_repo.create_jd_assignment(db, **assignment_data)
        # Send notification to the candidate
        try:
            await notification_service.send_notification(db,user_id=candidate.id,org_id=current_user.org_id,
                sender_id=current_user.id,type="jd_assigned",title="New JD for Sign-Off",
                message=f"You have been assigned a new Job Description '{jd.title}' for review and sign-off.",
                link=f"/admin/assigned/view/{assignment.id}"
            )
        except Exception as e:
            logger.error(f"Failed to create notification for candidate {candidate.id}: {e}")
            # Don't fail the allotment if notification fails
        return {
            "id": assignment.id,
            "jd_id": assignment.jd_id,
            "org_id": assignment.org_id,
            "parent_jd_id": assignment.parent_jd_id,
            "assigned_end_user_id": assignment.assigned_end_user_id,
            "title": assignment.title,
            "department": assignment.department,
            "location": assignment.location,
            "candidate_acknowledgement": assignment.candidate_acknowledgement,
            "candidate_comments": assignment.candidate_comments,
            "digital_signature": assignment.digital_signature,
            "signature_image_url": assignment.signature_image_url,
            "status": assignment.status,
            "assigned_at": assignment.assigned_at,
            "created_at": assignment.created_at,
            "updated_at": assignment.updated_at,
            "completed_at": assignment.completed_at,
            "message": "JD allotted for sign-off successfully."
        }

    async def submit_candidate_decision(self,db: AsyncSession,*,email: str,jd_id: UUID,decision: str,status: str = "completed",terms_accepted: bool = False,digital_signature_url: Optional[str] = None,signature_method: Optional[str] = None,password: str,current_user: User) -> dict:
        """Submit candidate decision for a JD assignment by email."""
        # Get candidate by email
        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user not found.")
        # Check if current user is the candidate or an admin
        if current_user.role != "Admin" and current_user.id != candidate.id:
            raise ForbiddenError("You can only submit your own decisions or be an admin.")
        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only submit decisions for candidates in your own organization.")
        # Get assignment
        assignment = await candidate_repo.get_jd_assignment_by_candidate_and_jd(db, candidate.id, jd_id)
        if not assignment:
            raise NotFoundError("JD assignment not found.")
        if assignment.org_id != current_user.org_id:
            raise ForbiddenError("You can only update assignments in your own organization.")
        # Verify password if signature method is password
        if signature_method == "password":
            is_correct = verify_password(password, candidate.hashed_password)
            if not is_correct:
                candidate.failed_login_attempts = (candidate.failed_login_attempts or 0) + 1
                await candidate_repo.update_candidate_user(db, candidate, failed_login_attempts=candidate.failed_login_attempts)
                raise ForbiddenError("Invalid password. Please check your credentials and try again.")
        # Reset failed attempts on successful password verification
        if signature_method == "password" and candidate.failed_login_attempts > 0:
            await candidate_repo.update_candidate_user(db, candidate, failed_login_attempts=0)
        # Fallback to candidate signature image if digital_signature is used
        if signature_method == "digital_signature" and not digital_signature_url:
            digital_signature_url = candidate.digital_signature_url

        sig_img_url = None
        dig_sig_url = None
        if signature_method == "digital_signature":
            if digital_signature_url and digital_signature_url.startswith("data:"):
                sig_img_url = digital_signature_url
                dig_sig_url = None
            else:
                sig_img_url = None
                dig_sig_url = digital_signature_url

        # Update assignment with decision and status
        completed_at = datetime.now(timezone.utc) if status == "completed" else None
        updated = await candidate_repo.update_jd_assignment(db,assignment,status=status,completed_at=completed_at,decision=decision,terms_accepted=terms_accepted,
            digital_signature_url=dig_sig_url,signature_image_url=sig_img_url,signature_method=signature_method)

        return {
            "assignment_id": str(updated.id),
            "candidate_id": str(updated.candidate_id),
            "jd_id": str(updated.jd_id),
            "decision": updated.decision,
            "status": updated.status,
            "completed_at": updated.completed_at.isoformat() if updated.completed_at else None,
            "message": "Candidate decision submitted successfully."
        }

    async def get_candidate_jd_assignments(self, db: AsyncSession, *, email: str, current_user: User) -> dict:
        """Get all JD assignments for a candidate (Admin/HR/Manager)."""
        _require_assignment_staff(current_user)

        candidate = await candidate_repo.get_candidate_user_by_email(db, email)
        if not candidate:
            raise NotFoundError("Candidate user not found.")

        if candidate.org_id != current_user.org_id:
            raise ForbiddenError("You can only view JD assignments for candidates from your own organization.")

        assignments = await candidate_repo.list_jd_assignments_by_candidate(db, candidate.id)
        
        return {
            "candidate_id": str(candidate.id),
            "candidate_email": candidate.email,
            "candidate_name": candidate.full_name,
            "assignments": [
                {
                    "assignment_id": str(assignment.id),
                    "jd_id": str(assignment.jd_id),
                    "status": assignment.status,
                    "decision": assignment.decision,
                    "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                    "assigned_at": assignment.assigned_at.isoformat(),
                    "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
                    "jd_snapshot": assignment.jd_snapshot,
                    "terms_and_conditions": assignment.terms_and_conditions,
                }
                for assignment in assignments
            ]
        }

    async def get_my_jd_assignments(self, db: AsyncSession, *, current_candidate: CandidateUser) -> dict:
        """Get all JD assignments for the current candidate user."""
        assignments = await candidate_repo.list_jd_assignments_by_candidate(db, current_candidate.id)
        
        return {
            "candidate_id": str(current_candidate.id),
            "candidate_email": current_candidate.email,
            "candidate_name": current_candidate.full_name,
            "assignments": [
                {
                    "assignment_id": str(assignment.id),
                    "original_jd_id": str(assignment.jd_id),
                    "status": assignment.status,
                    "decision": assignment.decision,
                    "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                    "assigned_at": assignment.assigned_at.isoformat(),
                    "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
                    "jd_snapshot": assignment.jd_snapshot,
                    "terms_and_conditions": assignment.terms_and_conditions,
                }
                for assignment in assignments
            ]
        }

    async def get_my_tasks(self, db: AsyncSession, *, current_candidate: CandidateUser, status: Optional[str] = None) -> list:
        """
        Get all tasks (JDs) for the current candidate.
        Unified for the 'Inbox & Task Center' UI.
        Supports status filtering ('pending', 'completed', 'overdue').
        """
        tasks = []
        now = datetime.now(timezone.utc)
        
        # Get JD assignments
        assignments = await candidate_repo.list_jd_assignments_by_candidate(db, current_candidate.id)
        for assignment in assignments:
            is_completed = assignment.status in ["completed", "accepted", "signed", "approved"] or assignment.completed_at is not None
            
            is_overdue = False
            if not is_completed and assignment.due_date:
                due_date_tz = assignment.due_date
                if due_date_tz.tzinfo is None:
                    due_date_tz = due_date_tz.replace(tzinfo=timezone.utc)
                is_overdue = due_date_tz < now
            
            task_status = "completed" if is_completed else ("overdue" if is_overdue else "pending")
            
            # If a status filter is provided, skip if it doesn't match
            if status and task_status != status:
                continue
                
            signature_type = None
            signature_data = None
            
            # Debug: Log assignment signature info
            logger.info(f"Assignment {assignment.id}: signature_method={assignment.signature_method}, digital_signature_url={assignment.digital_signature_url}, is_completed={is_completed}")
            
            # Check for signature information regardless of completion status
            if assignment.signature_method == "password":
                signature_type = "password"
                signature_data = "password"
            elif assignment.signature_method == "digital_signature":
                signature_type = "digital_signature"
                if assignment.signature_image_url and assignment.signature_image_url.startswith("data:"):
                    signature_data = assignment.signature_image_url
                else:
                    # Use assignment's signature URL or fall back to candidate's profile signature URL
                    sig_url = assignment.digital_signature_url or current_candidate.digital_signature_url
                    signature_data = generate_public_signature_url(
                        sig_url.split("/")[-1] if sig_url else ""
                    ) if sig_url else None
            elif (assignment.digital_signature_url or assignment.signature_image_url or current_candidate.digital_signature_url) and is_completed:
                # Fallback: if there's a signature URL and task is completed
                signature_type = "digital_signature"
                if assignment.signature_image_url and assignment.signature_image_url.startswith("data:"):
                    signature_data = assignment.signature_image_url
                else:
                    sig_url = assignment.digital_signature_url or current_candidate.digital_signature_url
                    signature_data = generate_public_signature_url(
                        sig_url.split("/")[-1] if sig_url else ""
                    ) if sig_url else None
            
            task = {
                "id": str(assignment.id),
                "type": "JD_SIGN_OFF",
                "title": f"Job Description: {assignment.jd.title if assignment.jd else 'Untitled'}",
                "status": task_status,
                "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                "priority": "High" if task_status in ["pending", "overdue"] else "Medium",
                "description": "Please review and sign off on this job description",
                "jd_id": str(assignment.jd_id),
                "signature_type": signature_type,
                "signature_data": signature_data,
                "assigned_by": {
                    "id": str(assignment.assignor.id) if assignment.assignor else None,
                    "name": assignment.assignor.full_name if assignment.assignor else None,
                    "email": assignment.assignor.email if assignment.assignor else None
                } if assignment.assignor else None
            }
            tasks.append(task)
        
        # Sort by due_date and priority
        tasks.sort(key=lambda x: (0 if x["priority"] == "High" else 1 if x["priority"] == "Medium" else 2,x["due_date"] or "9999-12-31"))
        
        return tasks




    async def get_dashboard_summary(self, db: AsyncSession, *, current_candidate: CandidateUser) -> dict:
        """Get summary data for the candidate dashboard."""
        # 1. Fetch data
        assignments = await candidate_repo.list_jd_assignments_by_candidate(db, current_candidate.id)
        
        # 2. Calculate stats
        pending_jds = len([a for a in assignments if a.status == "pending"])
        completed_jds = len([a for a in assignments if a.status in ["completed", "signed", "sign-off-complete"]])
        
        # 3. Recent activity (last 10 items)
        recent_activity = []
        
        # Add recent JD completions with more details
        for assignment in assignments[:5]:
            if assignment.completed_at:
                activity = {
                    "type": "JD_SIGN_OFF",
                    "title": assignment.jd.title if assignment.jd else "Untitled JD",
                    "date": assignment.completed_at.isoformat(),
                    "status": assignment.status,
                    "assigned_by": f"User ID: {assignment.assigned_by}" if assignment.assigned_by else "System",
                    "candidate": f"Candidate ID: {assignment.candidate_id}",
                    "company": assignment.jd.company_name if assignment.jd else None,
                    "department": assignment.jd.department if assignment.jd else None
                }
                recent_activity.append(activity)
        
        # Add recent JD assignments (pending ones too)
        for assignment in assignments[:3]:
            if not assignment.completed_at and assignment.assigned_at:
                recent_activity.append({
                    "type": "JD_ASSIGNED",
                    "title": assignment.jd.title if assignment.jd else "Untitled JD",
                    "date": assignment.assigned_at.isoformat(),
                    "status": assignment.status,
                    "assigned_by": f"User ID: {assignment.assigned_by}" if assignment.assigned_by else "System",
                    "candidate": f"Candidate ID: {assignment.candidate_id}",
                    "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                    "company": assignment.jd.company_name if assignment.jd else None,
                    "department": assignment.jd.department if assignment.jd else None
                })
        
        # Sort recent activity by date
        recent_activity.sort(key=lambda x: x["date"], reverse=True)
        
        return {
            "stats": {
                "pending_jds": pending_jds,
                "completed_jds": completed_jds,
                "total_tasks": pending_jds,
                "completion_rate": (
                    (completed_jds) / 
                    max(len(assignments), 1) * 100
                )
            },
            "recent_activity": recent_activity[:10]
        }

    async def get_jd_content(self, db: AsyncSession, *, jd_id: UUID, current_candidate: CandidateUser) -> dict:
        """Get JD content if it's assigned to the candidate."""
        assignment = await candidate_repo.get_jd_assignment_by_candidate_and_jd(db, current_candidate.id, jd_id)
        if not assignment:
            raise NotFoundError("JD assignment not found")
        
        jd = assignment.jd
        return {
            "id": jd.id,
            "title": jd.title,
            "company_name": jd.company_name,
            "content": jd.content or {},
            "status": assignment.status,
            "assigned_at": assignment.assigned_at.isoformat(),
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "jd_snapshot": assignment.jd_snapshot,
            "terms_and_conditions": assignment.terms_and_conditions,
        }


    async def get_all_organization_assignments(self, db: AsyncSession, *, current_user: User) -> dict:
        """List all JD assignments for the entire organization (Admin/HR/Manager)."""
        _require_assignment_staff(current_user)
        
        assignments = await candidate_repo.list_all_jd_assignments(db, current_user.org_id)
        
        return {
            "assignments": [
                {
                    "id": str(a.id),
                    "candidate_id": str(a.candidate_id),
                    "candidate_name": a.candidate.full_name if a.candidate else "Unknown User",
                    "candidate_email": a.candidate.email if a.candidate else None,
                    "original_jd_id": str(a.jd_id),
                    "jd_title": a.jd.title if a.jd else "Untitled JD",
                    "status": a.status,
                    "assigned_at": a.assigned_at.isoformat(),
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                    "terms_accepted": a.terms_accepted,
                    "terms_accepted_at": a.terms_accepted_at.isoformat() if a.terms_accepted_at else None,
                    "decision": a.decision,
                    "signature_type": a.signature_method,
                    "signature_data": (
                        generate_public_signature_url(a.digital_signature_url.split("/")[-1])
                        if a.signature_method == "digital_signature" and a.digital_signature_url
                        else "PASSWORD" if a.signature_method == "password"
                        else None
                    )
                }
                for a in assignments
                if a.candidate  # Additional safety check to filter out any assignments without valid candidates
            ],
            "total": len([a for a in assignments if a.candidate])
        }

    async def get_candidate_assignment_by_id(self, db: AsyncSession, *, assignment_id: UUID, current_user: User) -> dict:
        """Get a specific JD assignment by ID (Admin only or assigned candidate)."""
        assignment = await candidate_repo.get_jd_assignment_by_id(db, assignment_id)
        
        if not assignment:
            raise NotFoundError(f"Assignment with ID {assignment_id} not found")
        
        # Check permissions: Admin can view any assignment
        # Candidate can view their own assignment
        # User who assigned the JD can also view it
        is_staff = current_user.role in CSOD_STAFF_ROLES
        is_assigned_candidate = str(assignment.candidate_id) == str(current_user.id)
        is_assigner = str(assignment.assigned_user_id) == str(current_user.id) or str(assignment.assigned_by) == str(current_user.id)
        
        if not (is_staff or is_assigned_candidate or is_assigner):
            raise ForbiddenError("You can only view your own assignments")
        
        return {
            "id": str(assignment.id),
            "candidate_id": str(assignment.candidate_id),
            "assigned_user_id": str(assignment.assigned_user_id) if assignment.assigned_user_id else None,
            "jd_id": str(assignment.jd_id),
            "org_id": str(assignment.org_id),
            "assigned_by": str(assignment.assigned_by),
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "status": assignment.status,
            "assigned_at": assignment.assigned_at.isoformat(),
            "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
            "decision": assignment.decision,
            "comment": assignment.comment,
            "digital_signature_url": generate_public_signature_url(assignment.digital_signature_url.split("/")[-1] if assignment.digital_signature_url else "") if assignment.digital_signature_url else None,
            "terms_accepted": assignment.terms_accepted,
            "terms_accepted_at": assignment.terms_accepted_at.isoformat() if assignment.terms_accepted_at else None,
            "signature_method": assignment.signature_method,
            "jd_snapshot": assignment.jd_snapshot,
            "terms_and_conditions": assignment.terms_and_conditions,
            "created_at": assignment.created_at.isoformat(),
            "updated_at": assignment.updated_at.isoformat(),
            # Include related data for context
            "candidate_name": assignment.candidate.full_name if assignment.candidate else None,
            "candidate_email": assignment.candidate.email if assignment.candidate else None,
            "jd_title": assignment.jd.title if assignment.jd else "Untitled JD",
            "assigned_by_name": assignment.assignor.full_name if assignment.assignor else None
        }

    async def bulk_assign_candidates(self, db: AsyncSession, *, jd_data: List[BulkJDRequest], jd_id: UUID, assignment_status: str = "pending", current_user: User) -> dict:
        """Bulk allot a single JD to multiple candidates by email list (Admin/HR/Manager)."""
        _require_assignment_staff(current_user)
        results = []
        for email in set([jd.email for jd in jd_data]):
            try:
                # Find the corresponding JD data for this email
                jd_request = next((jd for jd in jd_data if jd.email == email), None)
                if not jd_request:
                    logger.error(f"JD data not found for email {email}")
                    results.append({"email": email, "status":"error", "details": "JD data not found"})
                    continue

                result = await self.allot_jd_to_candidate(db,email=email,jd_id=jd_id,due_date=jd_request.due_date, status=assignment_status,current_user=current_user)
                results.append({"email": email, "status":"success", "details": result})
            except Exception as e:
                logger.error(f"Failed to assign JD to {email}: {e}")
                results.append({"email": email, "status":"error", "details": str(e)})

        return {"results": results}

    async def login_candidate_full(self, db: AsyncSession, email: str, password_str: str) -> dict:
        candidate = await candidate_repo.get_candidate_user_by_email(db, email.lower().strip())
        if not candidate:
            raise ForbiddenError("Invalid credentials")
        if candidate.status == "inactive":
            raise ForbiddenError("Your account has been deactivated by an administrator. Please contact your admin for access.")
        
        if not verify_password(password_str, candidate.hashed_password):
            raise ForbiddenError("Invalid credentials")

        token = create_access_token({"sub": str(candidate.id)})
        candidate = await candidate_repo.update_candidate_last_login(db, candidate)
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": candidate.role,
            "full_name": candidate.full_name,
            "email": candidate.email,
            "user_type": "User",
            "org_id": str(candidate.org_id) if candidate.org_id else None
        }

    async def forgot_password_initiate(self, db: AsyncSession, email: str) -> dict:
        candidate = await candidate_repo.get_candidate_user_by_email(db, email.lower().strip())
        if not candidate:
            return {"message": "If the email exists in our system, you will receive a password reset code."}
        
        from app.services.otp_service import otp_service
        success, message = await otp_service.send_password_reset_otp(db, email.lower().strip(), candidate.full_name or email.split('@')[0])
        if success:
            return {"message": "Password reset code sent to your email. It expires in 5 minutes."}
        else:
            return {"message": message}

    async def forgot_password_reset(self, db: AsyncSession, email: str, otp: str, new_password_str: str) -> dict:
        candidate = await candidate_repo.get_candidate_user_by_email(db, email.lower().strip())
        if not candidate:
            raise AppValidationError("Invalid or expired verification code")
        
        from app.services.otp_service import otp_service
        otp_valid, otp_message = await otp_service.verify_otp(db, email.lower().strip(), otp)
        if not otp_valid:
            raise AppValidationError(otp_message)
        
        try:
            await candidate_repo.update_candidate_password(db, candidate, hash_password(new_password_str))
            await otp_service.invalidate_previous_otps(db, email.lower().strip())
            return {"message": "Your password has been updated. Please login with your new password."}
        except PasswordValidationError as e:
            raise AppValidationError(str(e))

    async def upload_digital_signature(self, db: AsyncSession, candidate: CandidateUser, file: UploadFile) -> dict:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise AppValidationError("Only image files are allowed for digital signatures.")
        
        if file.size and file.size > 2 * 1024 * 1024:
            raise AppValidationError("Signature image size must be less than 2MB.")
        
        from app.core.file_storage import save_image_to_disk
        signature_url = await save_image_to_disk(image=file, kind="digital_signatures")
        await candidate_repo.update_candidate_signature_url(db, candidate, signature_url)
        public_signature_url = generate_public_signature_url(signature_url.split("/")[-1] if signature_url else "") if signature_url else None
        
        return {
            "success": True,
            "message": "Digital signature uploaded successfully.",
            "signature_url": public_signature_url,
            "candidate_id": str(candidate.id)
        }


candidate_user_service = CandidateUserService()
