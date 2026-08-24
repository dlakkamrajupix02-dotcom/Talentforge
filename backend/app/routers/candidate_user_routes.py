from typing import Optional
import logging
from app.services.candidate_user_service import generate_public_signature_url, candidate_user_service
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User, CandidateUser
from app.schemas.schemas import (CandidateUserCreate, CandidateUserUpdate, CandidateUserResponse, CandidateUserListResponse, CandidateDecisionRequest, VerifyPasswordRequest,
    AllotJDRequest, CandidateTaskResponse, CandidateLoginRequest, CandidateForgotPasswordRequest, CandidateMeResponse, SignOffJDResponse, BulkAssign)
from app.services.dependencies import get_current_candidate, get_current_regular_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError, ConflictError, ForbiddenError, AppValidationError, PasswordValidationError
from app.core.rate_limiter import limiter
from app.services.async_email_service import async_email_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidate-users", tags=["Candidate Users"])


@router.post("/login")
@limiter.limit("5/minute")
async def candidate_login(request: Request,login_req: CandidateLoginRequest,db: AsyncSession = Depends(get_db)):
    """Candidate login endpoint. Returns JWT token for candidate authentication."""
    try:
        return await candidate_user_service.login_candidate_full(db, login_req.email, login_req.password)
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        logger.exception("Candidate login failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed. Please try again.")


@router.get("/me", response_model=CandidateMeResponse)
async def get_candidate_me(current_candidate: CandidateUser = Depends(get_current_candidate)):
    """
    Get current candidate profile.
    Returns the authenticated candidate's information.
    """
    return CandidateMeResponse(id=current_candidate.id,org_id=current_candidate.org_id,full_name=current_candidate.full_name,email=current_candidate.email,
        role=current_candidate.role,company_name=current_candidate.company_name,employee_id=current_candidate.employee_id,
        digital_signature_url=generate_public_signature_url(current_candidate.digital_signature_url.split("/")[-1] if current_candidate.digital_signature_url else "") if current_candidate.digital_signature_url else None,
        created_at=current_candidate.created_at,updated_at=current_candidate.updated_at)


@router.post("/forgot_password/initiate")
@limiter.limit("3/minute")
async def initiate_candidate_forgot_password( request: Request,email: str,db: AsyncSession = Depends(get_db)):
    """Initiate candidate password reset by sending OTP to email."""
    try:
        return await candidate_user_service.forgot_password_initiate(db, email)
    except Exception:
        logger.exception("Initiate candidate forgot password failed")
        return {"message": "If the email exists in our system, you will receive a password reset code."}


@router.post("/forgot_password")
@limiter.limit("3/minute")
async def candidate_forgot_password(request: Request,forgot_req: CandidateForgotPasswordRequest,db: AsyncSession = Depends(get_db)):
    """Reset candidate password after OTP verification."""
    try:
        return await candidate_user_service.forgot_password_reset(db, forgot_req.email, forgot_req.otp, forgot_req.new_password)
    except AppValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("Candidate forgot password failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password. Please try again.")


@router.post("/", response_model=CandidateUserResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate_user(data: CandidateUserCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Create a new candidate user (Admin only).
    """
    try:
        result = await candidate_user_service.create_candidate(db,full_name=data.full_name,email=data.email,password=data.password,company_name=None,employee_id=data.employee_id,current_user=current_user)
        # Send welcome email with login credentials through our email setup
        email_sent = async_email_service.send_candidate_account_email(recipient_email=data.email,username=data.full_name,password=data.password,company_name=result.get("company_name"))
        if email_sent:
            logger.info(f"Welcome email sent to candidate: {data.email}")
        else:
            logger.warning(f"Failed to send welcome email to candidate: {data.email}")
        return CandidateUserResponse(id=UUID(result["id"]),org_id=current_user.org_id,full_name=result["full_name"],email=result["email"],role=result["role"],company_name=result["company_name"],employee_id=result["employee_id"],created_by=current_user.id,creator_name=result.get("creator_name") or current_user.full_name,created_at=result["created_at"],updated_at=result["updated_at"])
    except (ForbiddenError, ConflictError, AppValidationError, PasswordValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("create_candidate_user failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to create candidate user. Please try again.")


@router.get("/", response_model=CandidateUserListResponse)
async def list_candidate_users(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    List all candidate users for the organization (Admin only).
    """
    try:
        result = await candidate_user_service.list_candidates(db, current_user=current_user)
        return CandidateUserListResponse(candidates=[CandidateUserResponse(id=UUID(c["id"]),org_id=UUID(c.get("org_id", str(current_user.org_id))),full_name=c["full_name"],
                    email=c["email"],role=c["role"],company_name=c["company_name"],employee_id=c.get("employee_id"),
                    created_by=UUID(c["created_by"]) if c["created_by"] else None,
                    creator_name=c.get("creator_name"),
                    created_at=c["created_at"],updated_at=c["updated_at"])
                for c in result["candidates"]],total=result["total"])
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("list_candidate_users failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to list candidate users. Please try again.")


@router.get("/by-email/{email}", response_model=CandidateUserResponse)
async def get_candidate_user(email: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get a specific candidate user by email (Admin only).
    """
    try:
        result = await candidate_user_service.get_candidate(db,email=email,current_user=current_user)
        return CandidateUserResponse(id=UUID(result["id"]),org_id=UUID(result["org_id"]),full_name=result["full_name"],email=result["email"],
            role=result["role"],company_name=result["company_name"],employee_id=result.get("employee_id"),created_by=UUID(result["created_by"]) if result["created_by"] else None,
            created_at=result["created_at"],updated_at=result["updated_at"])
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_candidate_user failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve candidate user. Please try again.")


@router.patch("/by-email/{email}", response_model=CandidateUserResponse)
async def update_candidate_user(email: str,data: CandidateUserUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Update a candidate user by email (Admin only).
    """
    try:
        result = await candidate_user_service.update_candidate(db,email=email,full_name=data.full_name,new_email=data.email,password=data.password,company_name=data.company_name,employee_id=data.employee_id,current_user=current_user)
        return CandidateUserResponse(id=UUID(result["id"]),org_id=current_user.org_id,full_name=result["full_name"],
            email=result["email"],role=result["role"],company_name=result["company_name"],employee_id=result["employee_id"],created_by=None,
            created_at=result["created_at"],updated_at=result["updated_at"])
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (ForbiddenError, ConflictError, AppValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("update_candidate_user failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to update candidate user. Please try again.")


@router.delete("/by-email/{email}")
async def delete_candidate_user_by_email(email: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Soft delete a candidate user by email (Admin only).
    """
    try:
        result = await candidate_user_service.delete_candidate_by_email(db,email=email,current_user=current_user)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("delete_candidate_user_by_email failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to delete candidate user. Please try again.")


@router.post("/by-email/{email}/allot-jd", response_model=SignOffJDResponse)
async def allot_jd_to_candidate(email: str,data: AllotJDRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Allot a JD to a candidate user for sign-off (Admin only).
    """
    try:
        result = await candidate_user_service.allot_jd_to_candidate(db,email=email,jd_id=data.jd_id,due_date=data.due_date,current_user=current_user)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (ForbiddenError, AppValidationError, ConflictError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("allot_jd_to_candidate failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to allot JD for sign-off. Please try again.")


from app.services.dependencies import get_current_candidate, get_current_regular_user, get_current_user
@router.post("/by-email/{email}/decision")
async def submit_candidate_decision(email: str,data: CandidateDecisionRequest,db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """
    Submit candidate decision for a JD assignment by email.
    """
    try:
        if isinstance(current_user, CandidateUser) and current_user.email.lower().strip() != email.lower().strip():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit decisions for your own account")
        result = await candidate_user_service.submit_candidate_decision(db,email=email,jd_id=data.jd_id,decision=data.decision,status=data.status,terms_accepted=data.terms_accepted,digital_signature_url=data.digital_signature_url,signature_method=data.signature_method,password=data.password,current_user=current_user)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("submit_candidate_decision failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to submit candidate decision. Please try again.")


@router.get("/by-email/{email}/assignments")
async def get_candidate_jd_assignments(email: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get all JD assignments for a candidate (Admin only).
    """
    try:
        result = await candidate_user_service.get_candidate_jd_assignments(db,email=email,current_user=current_user)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_candidate_jd_assignments failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to get candidate JD assignments. Please try again.")


@router.get("/all-assignments")
async def get_all_organization_assignments(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get all JD assignments for the entire organization (Admin only).
    """
    try:
        result = await candidate_user_service.get_all_organization_assignments(db,current_user=current_user)
        return result
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception:
        logger.exception("get_all_organization_assignments failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to get organization assignments. Please try again.")


@router.get("/my-assignments")
async def get_my_jd_assignments(db: AsyncSession = Depends(get_db),current_candidate: CandidateUser = Depends(get_current_candidate)):
    """
    Get all JD assignments for the current candidate user.
    """
    try:
        result = await candidate_user_service.get_my_jd_assignments(db,current_candidate=current_candidate)
        return result
    except Exception:
        logger.exception("get_my_jd_assignments failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to get your JD assignments. Please try again.")


@router.get("/assignments/{assignment_id}")
async def get_candidate_assignment_by_id(assignment_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get a specific JD assignment by ID.
    Admin users can view any assignment, while regular users can only view their own assignments.
    """
    try:
        result = await candidate_user_service.get_candidate_assignment_by_id(db, assignment_id=assignment_id, current_user=current_user)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_candidate_assignment_by_id failed for assignment_id=%s", assignment_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve assignment. Please try again.")


@router.post("/verify-password")
async def verify_candidate_password(data: VerifyPasswordRequest,db: AsyncSession = Depends(get_db),current_candidate: CandidateUser = Depends(get_current_candidate)):
    """
    Candidate password verification endpoint for specific JD assignment (electronic signature).
    """
    try:
        result = await candidate_user_service.process_candidate_decision(db, candidate=current_candidate, jd_id=data.jd_id,password=data.password,
            terms_accepted=data.terms_accepted,signature_method=data.signature_method,digital_signature_url=data.digital_signature_url)
        return result
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except AppValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("verify_candidate_password failed")
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Internal server error processing password verification.")


@router.post("/upload-signature")
async def upload_digital_signature(file: UploadFile = File(...),db: AsyncSession = Depends(get_db),current_candidate: CandidateUser = Depends(get_current_candidate)):
    """Upload digital signature image for the candidate."""
    try:
        return await candidate_user_service.upload_digital_signature(db, current_candidate, file)
    except AppValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception("upload_digital_signature failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload digital signature. Please try again.")

@router.get("/my-sign")
async def get_my_signature(current_candidate: CandidateUser = Depends(get_current_candidate)):
    """
    Fetch the digital signature URL for the currently logged-in candidate.
    """
    public_signature_url = generate_public_signature_url(current_candidate.digital_signature_url.split("/")[-1] if current_candidate.digital_signature_url else "") if current_candidate.digital_signature_url else None
    
    return {
        "success": True,
        "signature_url": public_signature_url,
        "candidate_id": str(current_candidate.id)
    }


@router.get("/my-tasks", response_model=list[CandidateTaskResponse])
async def get_my_tasks(status: str | None = None, db: AsyncSession = Depends(get_db), current_candidate: CandidateUser = Depends(get_current_candidate)):
    """
    Get all tasks for the current candidate (Inbox) with optional status filter (pending, completed, overdue).
    """
    if status is not None and status not in ["pending", "completed", "overdue"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Status filter must be one of: 'pending', 'completed', 'overdue'")
    try:
        tasks = await candidate_user_service.get_my_tasks(db, current_candidate=current_candidate, status=status)
        return [CandidateTaskResponse(**task) for task in tasks]
    except Exception:
        logger.exception("get_my_tasks failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve tasks.")



@router.get("/dashboard-summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db), current_candidate: CandidateUser = Depends(get_current_candidate)):
    """Get candidate dashboard summary (Stats, Recent Activity, Tasks)."""
    try:
        summary = await candidate_user_service.get_dashboard_summary(db, current_candidate=current_candidate)
        return summary
    except Exception:
        logger.exception("get_dashboard_summary failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve dashboard summary.")


@router.post("/bulk_assign_jd")
async def bulk_assign(data: BulkAssign, assignment_status:str = "pending", db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Assign a single JD to multiple candidates in bulk(Admin only)."""
    try:
        result = await candidate_user_service.bulk_assign_candidates(db,jd_data=data.data,jd_id=data.jd_id,assignment_status=assignment_status,current_user=current_user)
        return result
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail = str(e))
    except Exception:
        logger.exception("bulk Assingment Failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to assign JD to candidates.")