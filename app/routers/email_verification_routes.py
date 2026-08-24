from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.schemas.schemas import FeedbackRequest, OTPRequest, OTPVerification, OTPResend, OTPResponse, VerificationResponse, UserCreationResponse
from app.services.otp_service import otp_service
from app.services.user_service import user_service
from app.services.dependencies import get_current_user
from app.services.email_verification_service import email_verification_service

logger = get_logger()

router = APIRouter(prefix="/auth", tags=["email-verification"])


@router.post("/request_otp", response_model=OTPResponse)
@limiter.limit("3/5minutes")
async def request_otp(otp_request: OTPRequest,request: Request,db: AsyncSession = Depends(get_db)):
    """
    Start signup process by requesting OTP.
    - Checks if email already exists
    - Generates secure 6-digit OTP
    - Sends OTP via email
    - Stores OTP with 5-minute expiry
    """
    try:
        email_verification_service.validate_password_length(otp_request.password)
        success, message = await otp_service.initiate_signup(db,otp_request.email,otp_request.password,otp_request.role,
            otp_request.username, otp_request.country)
        if not success:
            if "already registered" in message:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail=message)
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=message)
        logger.info(f"OTP requested successfully for: {otp_request.email}")
        return OTPResponse(message=message,expires_in_minutes=otp_service.otp_expiry_minutes)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in request_otp: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="An error occurred while processing your request")


@router.post("/verify_otp", response_model=VerificationResponse)
@limiter.limit("10/5minutes")
async def verify_otp(verification_data: OTPVerification,request: Request,db: AsyncSession = Depends(get_db)):
    """
    Verify OTP code.
    - Validates OTP code
    - Checks expiry and attempts
    - Marks email as verified if successful
    """
    try:
        success, message = await otp_service.verify_otp(db, verification_data.email, verification_data.otp_code)
        if not success:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        logger.info(f"OTP verified successfully for: {verification_data.email}")
        return VerificationResponse(message=message,verified=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="An error occurred while verifying your code")


@router.post("/complete_signup", response_model=UserCreationResponse)
@limiter.limit("3/5minutes")
async def complete_signup(signup_data: OTPRequest,request: Request,db: AsyncSession = Depends(get_db)):
    """
    Complete signup after OTP verification.
    - Creates user account only after successful OTP verification
    - Hashes password before storing
    - Cleans up verification records
    """
    try:
        if signup_data.role in {"Super_Admin", "Admin", "HR", "Manager"}:
            from sqlalchemy import select, func
            from app.models.models import User
            stmt = select(func.count(User.id)).where(User.role == "Super_Admin")
            result = await db.execute(stmt)
            super_admin_count = result.scalar() or 0
            if super_admin_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Creating staff or admin accounts requires Super Admin authorization. Please contact your administrator.",
                )

        success, message, user = await user_service.complete_signup(db,signup_data.email,signup_data.password,signup_data.role,
            signup_data.username, signup_data.country, (signup_data.company_name or "").strip() or "Phenomecloud")
        if not success:
            if "not verified" in message:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=message)
            elif "already registered" in message:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail=message)
            else:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail=message)
        logger.info(f"Signup completed successfully for: {signup_data.email}")
        return UserCreationResponse(message=message,user_id=str(user.id),email=user.email,username=user.full_name)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in complete_signup: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="An error occurred while creating your account")


@router.post("/resend_otp", response_model=OTPResponse)
@limiter.limit("3/5minutes")
async def resend_otp(resend_data: OTPResend,request: Request,db: AsyncSession = Depends(get_db)):
    """
    Resend OTP with cooldown.
    - Enforces 60-second cooldown
    - Invalidates previous OTP
    - Generates new OTP
    """
    try:
        success, message = await otp_service.resend_otp(db, resend_data.email, resend_data.username)
        if not success:
            if "wait" in message.lower():
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,detail=message)
            else:
                raise HTTPException( status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)
        logger.info(f"OTP resent successfully for: {resend_data.email}")
        return OTPResponse(message=message, expires_in_minutes=otp_service.otp_expiry_minutes )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in resend_otp: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="An error occurred while resending the verification code" )


@router.post("/feedback")
@limiter.limit("3/5minutes")
async def send_feedback(feedback: FeedbackRequest, request: Request, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Send app feedback to the configured help/support email."""
    try:
        return email_verification_service.send_feedback(feedback, current_user)
    except Exception as e:
        logger.error(f"Error sending feedback email: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send feedback. Please try again later.")


