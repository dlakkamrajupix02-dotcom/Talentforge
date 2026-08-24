from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import FeedbackPromptState, PlatformFeedback


class FeedbackRepository:
    @staticmethod
    async def get_prompt_state(db: AsyncSession, user_id: UUID, user_type: str) -> Optional[FeedbackPromptState]:
        stmt = select(FeedbackPromptState).where(
            FeedbackPromptState.user_id == user_id,
            FeedbackPromptState.user_type == user_type,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def upsert_prompt_state(db: AsyncSession, state: FeedbackPromptState) -> FeedbackPromptState:
        db.add(state)
        await db.commit()
        await db.refresh(state)
        return state

    @staticmethod
    async def create_feedback(db: AsyncSession, feedback: PlatformFeedback) -> PlatformFeedback:
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def list_feedback(db: AsyncSession, limit: int = 200, offset: int = 0) -> list[PlatformFeedback]:
        stmt = (
            select(PlatformFeedback)
            .order_by(PlatformFeedback.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def count_feedback(db: AsyncSession) -> int:
        result = await db.execute(select(func.count()).select_from(PlatformFeedback))
        return int(result.scalar_one() or 0)

    @staticmethod
    async def list_all_for_analytics(db: AsyncSession, limit: int = 500) -> list[PlatformFeedback]:
        stmt = select(PlatformFeedback).order_by(PlatformFeedback.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())


feedback_repository = FeedbackRepository()
