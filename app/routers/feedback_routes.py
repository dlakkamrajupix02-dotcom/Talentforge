from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_user
from app.services.feedback_service import feedback_service
from app.schemas.schemas import (
    FeedbackDismissResponse,
    FeedbackEventRequest,
    FeedbackEventResponse,
    FeedbackPromptResponse,
    FeedbackSessionResponse,
    FeedbackSubmitRequest,
    FeedbackSubmitResponse,
)

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/session", response_model=FeedbackSessionResponse)
async def record_feedback_session(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Increment session count once per meaningful login — used for milestone-based prompts."""
    return await feedback_service.record_session(db, current_user)


@router.post("/events", response_model=FeedbackEventResponse)
async def record_feedback_event(
    payload: FeedbackEventRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Record a success moment (JD created, approved, etc.) and check prompt eligibility."""
    return await feedback_service.record_event(db, current_user, payload.event_type, payload.metadata)


@router.get("/prompt", response_model=FeedbackPromptResponse)
async def get_feedback_prompt(
    trigger: str = "session_milestone",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Check whether the user should see a feedback prompt now."""
    return await feedback_service.get_prompt(db, current_user, trigger)


@router.post("/dismiss", response_model=FeedbackDismissResponse)
async def dismiss_feedback_prompt(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Snooze feedback prompts — won't ask again for several days."""
    return await feedback_service.dismiss_prompt(db, current_user)


@router.post("", response_model=FeedbackSubmitResponse)
async def submit_platform_feedback(
    payload: FeedbackSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Submit platform feedback from any non–Super Admin user."""
    feedback = await feedback_service.submit_feedback(
        db,
        current_user,
        rating=payload.rating,
        comment=payload.comment,
        tip=payload.tip,
        trigger_context=payload.trigger_context,
    )
    return FeedbackSubmitResponse(
        id=feedback.id,
        message="Thank you — your feedback helps us build a better TalentForge.",
    )
