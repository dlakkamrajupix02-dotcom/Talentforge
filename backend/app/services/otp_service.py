import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.models.models import EmailVerification
from app.services.async_email_service import async_email_service
from app.core.config import settings
from app.repository import otp_repository as otp_repo

logger = get_logger()


class OTPService:
    def __init__(self):
        self.otp_length = 6
        self.otp_expiry_minutes = settings.otp_expiry_minutes
        self.max_attempts = settings.otp_max_attempts
        self.resend_cooldown_seconds = settings.otp_resend_cooldown_seconds

    @staticmethod
    def _normalize_purpose(purpose: Optional[str] = None) -> str:
        normalized = (purpose or "forgot_password").strip().lower()
        return normalized if normalized in {"forgot_password", "mfa"} else "forgot_password"

    @classmethod
    def _build_otp_key(cls, email: str, purpose: Optional[str] = None) -> str:
        normalized_email = (email or "").strip().lower()
        return f"{normalized_email}:{cls._normalize_purpose(purpose)}"

    def generate_secure_otp(self) -> str:
        """
        Generate a cryptographically secure 6-digit OTP.
        """
        return ''.join(secrets.choice('0123456789') for _ in range(6))

    async def check_email_exists(self, db: AsyncSession, email: str) -> bool:
        """
        Check if email already exists in users table.
        """
        try:
            return await otp_repo.email_exists(db, email)
        except Exception as e:
            logger.error(f"Error checking email existence: {str(e)}")
            return False

    async def invalidate_previous_otps(self, db: AsyncSession, email: str, purpose: Optional[str] = None) -> bool:
        """
        Invalidate all previous OTPs for an email and purpose.
        """
        try:
            await otp_repo.delete_otps_for_email(db, self._build_otp_key(email, purpose))
            return True
        except Exception as e:
            logger.error(f"Error invalidating previous OTPs: {str(e)}")
            await db.rollback()
            return False

    async def create_otp_record(self, db: AsyncSession, email: str, otp_code: str, purpose: Optional[str] = None) -> Tuple[bool, Optional[EmailVerification]]:
        """
        Create new OTP record in database.
        """
        try:
            await self.invalidate_previous_otps(db, email, purpose)

            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.otp_expiry_minutes)
            otp_record = await otp_repo.create_otp_record(db, email=self._build_otp_key(email, purpose), otp_code=otp_code, expires_at=expires_at)

            logger.info(f"OTP record created for email: {email}")
            return True, otp_record

        except Exception as e:
            logger.error(f"Error creating OTP record: {str(e)}")
            await db.rollback()
            return False, None

    async def get_active_otp(self, db: AsyncSession, email: str, purpose: Optional[str] = None) -> Optional[EmailVerification]:
        """
        Get active OTP record for email and purpose.
        """
        try:
            return await otp_repo.get_active_otp(db, self._build_otp_key(email, purpose))
        except Exception as e:
            logger.error(f"Error getting active OTP: {str(e)}")
            return None

    async def get_verified_email_verification(self, db: AsyncSession, email: str, purpose: Optional[str] = None) -> Optional[EmailVerification]:
        """
        Get verified email verification record for completing signup.
        Returns the verification record if it exists and is verified.
        """
        try:
            return await otp_repo.get_verified_email_verification(db, self._build_otp_key(email, purpose))
        except Exception as e:
            logger.error(f"Error getting verified email verification: {str(e)}")
            return None

    async def increment_attempts(self, db: AsyncSession, otp_record: EmailVerification) -> bool:
        """
        Increment OTP attempt count.
        """
        try:
            await otp_repo.increment_attempts(db, otp_record)
            return True
        except Exception as e:
            logger.error(f"Error incrementing OTP attempts: {str(e)}")
            await db.rollback()
            return False

    async def mark_verified(self, db: AsyncSession, otp_record: EmailVerification) -> bool:
        """
        Mark OTP as verified.
        """
        try:
            await otp_repo.mark_verified(db, otp_record)
            return True
        except Exception as e:
            logger.error(f"Error marking OTP as verified: {str(e)}")
            await db.rollback()
            return False

    async def can_resend_otp(self, db: AsyncSession, email: str, purpose: Optional[str] = None) -> Tuple[bool, int]:
        """
        Check if OTP can be resent (cooldown period).
        """
        try:
            last_otp = await otp_repo.get_latest_otp_any_status(db, self._build_otp_key(email, purpose))
            if not last_otp:
                return True, 0
            time_since_last = (datetime.now(timezone.utc) - last_otp.created_at).total_seconds()
            if time_since_last >= self.resend_cooldown_seconds:
                return True, 0
            remaining_seconds = int(self.resend_cooldown_seconds - time_since_last)
            return False, remaining_seconds
        except Exception as e:
            logger.error(f"Error checking resend cooldown: {str(e)}")
            return True, 0


    async def initiate_signup(self, db: AsyncSession, email: str, password: str, role: str, username: Optional[str] = None, region: Optional[str] = None) -> Tuple[bool, str]:
        """
        Start signup process by checking email and generating OTP.
        """
        try:
            if await self.check_email_exists(db, email):
                return False, "Email already registered"
            existing_otp = await self.get_active_otp(db, email)
            if existing_otp:
                time_since_created = (datetime.now(timezone.utc) - existing_otp.created_at).total_seconds()
                if time_since_created < self.resend_cooldown_seconds:  # 5 minutes
                    remaining_time = int(self.resend_cooldown_seconds - time_since_created)
                    return False, f"Please wait {remaining_time} seconds before requesting a new code"

            otp_code = self.generate_secure_otp()
            logger.debug("OTP generated for email: %s", email)

            success, otp_record = await self.create_otp_record(db, email, otp_code)
            if not success:
                return False, "Failed to generate verification code"

            logger.info(f"Attempting to send OTP email to: {email}")
            display_name = username or email.split('@')[0]
            email_sent = async_email_service.send_otp_email_background(email, otp_code, display_name, self.otp_expiry_minutes)

            if email_sent:
                logger.info(f"OTP email sent successfully to: {email}")
                return True, f"Verification code sent to {email}. It expires in {self.otp_expiry_minutes} minutes."
            else:
                logger.error(f"Failed to send OTP email to: {email}")
                return False, "Failed to send verification email. Please try resending the code."

        except Exception as e:
            logger.error(f"Error initiating signup: {str(e)}")
            return False, "An error occurred during signup initiation"

    async def send_password_reset_otp(self, db: AsyncSession, email: str, display_name: Optional[str] = None, purpose: Optional[str] = None) -> Tuple[bool, str]:
        """
        Send OTP for password reset or MFA verification.
        """
        try:
            purpose_value = self._normalize_purpose(purpose)
            existing_otp = await self.get_active_otp(db, email, purpose_value)
            if existing_otp:
                time_since_created = (datetime.now(timezone.utc) - existing_otp.created_at).total_seconds()
                if time_since_created < self.resend_cooldown_seconds:
                    remaining_time = int(self.resend_cooldown_seconds - time_since_created)
                    return False, f"Please wait {remaining_time} seconds before requesting a new code"

            otp_code = self.generate_secure_otp()
            logger.debug("OTP generated for email: %s (purpose=%s)", email, purpose_value)

            success, otp_record = await self.create_otp_record(db, email, otp_code, purpose_value)
            if not success:
                return False, "Failed to generate verification code"

            logger.info(f"Attempting to send OTP email to: {email} for purpose {purpose_value}")
            name = display_name or email.split('@')[0]
            email_sent = async_email_service.send_otp_email_background(email, otp_code, name, self.otp_expiry_minutes, purpose=purpose_value)

            if email_sent:
                logger.info(f"OTP email sent successfully to: {email} for purpose {purpose_value}")
                return True, f"Verification code sent to {email}. It expires in {self.otp_expiry_minutes} minutes."
            else:
                logger.error(f"Failed to send OTP email to: {email} for purpose {purpose_value}")
                return False, "Failed to send verification email. Please try resending the code."

        except Exception as e:
            logger.error(f"Error sending password reset OTP: {str(e)}")
            return False, "An error occurred while sending verification code"

    async def verify_otp(self, db: AsyncSession, email: str, otp_code: str, purpose: Optional[str] = None) -> Tuple[bool, str]:
        """
        Verify OTP code.
        """
        try:
            purpose_value = self._normalize_purpose(purpose)
            otp_record = await self.get_active_otp(db, email, purpose_value)

            if not otp_record:
                return False, "Invalid or expired verification code"

            if otp_record.attempts >= self.max_attempts:
                return False, "Maximum attempts exceeded. Please request a new code."

            if otp_record.otp_code != otp_code:
                await self.increment_attempts(db, otp_record)
                remaining_attempts = self.max_attempts - otp_record.attempts
                return False, f"Invalid code. {remaining_attempts} attempts remaining."

            if otp_record.expires_at <= datetime.now(timezone.utc):
                return False, "Verification code has expired"

            await self.mark_verified(db, otp_record)

            logger.info(f"OTP verified successfully for email: {email} (purpose={purpose_value})")
            return True, "Email verified successfully"

        except Exception as e:
            logger.error(f"Error verifying OTP: {str(e)}")
            return False, "An error occurred during verification"

    async def resend_otp(self, db: AsyncSession, email: str, username: Optional[str] = None) -> Tuple[bool, str]:
        """
        Resend OTP with cooldown check.
        """
        try:
            can_resend, remaining_seconds = await self.can_resend_otp(db, email)

            if not can_resend:
                return False, f"Please wait {remaining_seconds} seconds before requesting a new code"

            new_otp_code = self.generate_secure_otp()

            success, otp_record = await self.create_otp_record(db, email, new_otp_code)
            if not success:
                return False, "Failed to generate new verification code"

            display_name = username or email.split('@')[0]
            email_sent = async_email_service.send_otp_email_background(email, new_otp_code, display_name, self.otp_expiry_minutes, purpose="forgot_password")
            if not email_sent:
                return False, "Failed to send verification email"

            logger.info(f"OTP resent for email: {email}")
            return True, f"New verification code sent to {email}. It expires in {self.otp_expiry_minutes} minutes."

        except Exception as e:
            logger.error(f"Error resending OTP: {str(e)}")
            return False, "An error occurred while resending the code"

otp_service = OTPService()
