from fastapi import HTTPException, status
from app.core.config import settings
from app.services.async_email_service import async_email_service
from app.schemas.schemas import FeedbackRequest
from app.models.models import User

class EmailVerificationService:
    @staticmethod
    def validate_password_length(password: str) -> None:
        if len(password) < 6:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Password must be at least 6 characters long")

    @staticmethod
    def send_feedback(feedback: FeedbackRequest, current_user: User) -> dict:
        user_email = getattr(current_user, "email", None) or "unknown@example.com"
        user_name = getattr(current_user, "full_name", "Unknown User")
        user_id = getattr(current_user, "id", None)
        user_role = getattr(current_user, "role", "unknown")
        org_id = getattr(current_user, "org_id", None)
        org_info = f"Organization ID: {org_id}" if org_id else "Organization: unknown"
        support_email = settings.support_email
        subject = f"Feedback from {user_name} ({user_email}) - {feedback.subject}"
        content = (
            f"<p><strong>Feedback submitted by:</strong> {user_name} ({user_email})</p>"
            f"<p><strong>User ID:</strong> {user_id}</p>"
            f"<p><strong>User role:</strong> {user_role}</p>"
            f"<p><strong>{org_info}</strong></p>"
            f"<p><strong>Subject:</strong> {feedback.subject}</p>"
            f"<p><strong>Message:</strong></p>"
            f"<p>{feedback.message}</p>"
            f"<p><em>Sent from TalentForge app feedback endpoint.</em></p>"
        )

        async_email_service.send_general_email_background(support_email, subject, content, username=user_name)
        return {"status": "success", "message": "Feedback submitted successfully."}

email_verification_service = EmailVerificationService()
