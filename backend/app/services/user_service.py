import uuid
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.models.models import User
from app.services.otp_service import otp_service
from app.services.auth_service import hash_password
from app.repository import user_repository as user_repo

logger = get_logger()

class UserService:
    async def create_user_after_verification(self, db: AsyncSession, email: str, password: str, role: str,
        username: Optional[str] = None, region: Optional[str] = None, company_name: str = "") -> Tuple[bool, str, Optional[User]]:
        """
        Create user account only after successful OTP verification.
        company_name must be provided by the caller — no silent defaults.
        """
        try:
            if await otp_service.check_email_exists(db, email):
                return False, "Email already registered", None
            if not company_name or not company_name.strip():
                return False, "Company name is required", None
            from app.services.organization_service import organization_service
            org_success, org_message, org = await organization_service.get_or_create_organization_by_name(db, company_name=company_name.strip())

            if not org_success or not org:
                return False, "Failed to setup organization", None
            # Only an Admin can create a brand-new company.
            if org_message == "Organization created" and role != "Admin":
                return False, "Only an Admin can create a new company account. Please contact your Admin.", None
            hashed_password = hash_password(password)
            user = await user_repo.create_user(db,user_id=uuid.uuid4(),email=email,hashed_password=hashed_password,full_name=username or email.split('@')[0],role=role,region=region,org_id=org.id)
            logger.info(f"User created successfully: {email} with org: {org.id}")
            return True, "Account created successfully", user

        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            await db.rollback()
            return False, "Failed to create account", None

    async def complete_signup(self,db: AsyncSession,email: str,password: str,role: str,username: Optional[str] = None,
        region: Optional[str] = None,company_name: Optional[str] = None,) -> Tuple[bool, str, Optional[User]]:
        """
        Complete signup process: verify OTP was used and create user.
        """
        try:
            verification = await otp_service.get_verified_email_verification(db, email)
            if not verification:
                return False, "Email not verified or verification expired", None
            success, message, user = await self.create_user_after_verification(db, email, password, role, username, region, company_name)
            if success:
                await user_repo.delete_email_verification(db, verification)
                logger.info(f"Signup completed and verification cleaned up for: {email}")
            return success, message, user
        except Exception as e:
            logger.error(f"Error completing signup: {str(e)}")
            await db.rollback()
            return False, "An error occurred during account creation", None

    async def update_user_password_and_revoke_sessions(self, db: AsyncSession, user: User, new_password: str) -> None:
        """
        Hash new password, update DB user record, invalidate Redis session token, and close active DB sessions.
        """
        from app.services.redis_service import redis_service
        from app.repository import auth_repository as auth_repo

        hashed_pw = hash_password(new_password)
        await user_repo.update_user_password(db, user, hashed_pw)
        user_id_str = str(user.id)
        await redis_service.invalidate_token(user_id_str)
        active_sessions = await auth_repo.get_active_user_sessions(db, user.id)
        if active_sessions:
            await auth_repo.close_previous_sessions(db, active_sessions)
        logger.info("Updated password and invalidated active sessions for user: %s", user_id_str)


user_service = UserService()
