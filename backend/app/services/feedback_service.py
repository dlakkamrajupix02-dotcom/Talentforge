from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.models import FeedbackPromptState, PlatformFeedback, User, CandidateUser, Organization
from app.repository.feedback_repository import feedback_repository
from app.services.async_email_service import async_email_service


def _normalize_role(role: str | None) -> str:
    return (role or "").strip().lower().replace("-", "_").replace(" ", "_")


def _is_super_admin_role(role: str | None) -> bool:
    normalized = _normalize_role(role)
    return normalized in {"super_admin", "superadmin"}


def _feedback_notify_recipients() -> list[str]:
    primary = (settings.feedback_notify_email or settings.support_email or "").strip()
    return [primary] if primary else []


class FeedbackService:
    DISMISS_SNOOZE_DAYS = 7
    SUCCESS_TRIGGERS = frozenset({"jd_created", "jd_approved", "jd_exported", "assignment_completed", "session_milestone"})

    @staticmethod
    def _resolve_actor(current_user: Any) -> tuple[UUID, str, str, Optional[UUID], str, str, Optional[str]]:
        if isinstance(current_user, User):
            return (
                current_user.id,
                "staff",
                current_user.role,
                current_user.org_id,
                current_user.email,
                current_user.full_name,
                None,
            )
        if isinstance(current_user, CandidateUser):
            org_name = getattr(getattr(current_user, "organization", None), "name", None)
            return (
                current_user.id,
                "candidate",
                current_user.role or "User",
                current_user.org_id,
                current_user.email,
                current_user.full_name,
                org_name,
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    @staticmethod
    async def _get_org_name(db: AsyncSession, org_id: Optional[UUID]) -> Optional[str]:
        if not org_id:
            return None
        from sqlalchemy import select
        result = await db.execute(select(Organization.name).where(Organization.id == org_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def _get_or_create_state(db: AsyncSession, user_id: UUID, user_type: str, org_id: Optional[UUID]) -> FeedbackPromptState:
        state = await feedback_repository.get_prompt_state(db, user_id, user_type)
        if state:
            return state
        state = FeedbackPromptState(user_id=user_id, user_type=user_type, org_id=org_id)
        return await feedback_repository.upsert_prompt_state(db, state)

    @staticmethod
    def _eligible_now(state: FeedbackPromptState, trigger: Optional[str] = None) -> tuple[bool, str, Optional[dict]]:
        now = datetime.now(timezone.utc)

        if state.snooze_until:
            snooze = state.snooze_until
            if snooze.tzinfo is None:
                snooze = snooze.replace(tzinfo=timezone.utc)
            if snooze > now:
                return False, "snoozed", None

        if state.last_submitted_at:
            submitted = state.last_submitted_at
            if submitted.tzinfo is None:
                submitted = submitted.replace(tzinfo=timezone.utc)
            if (now - submitted).days < settings.feedback_submit_cooldown_days:
                return False, "recently_submitted", None

        if state.last_dismissed_at:
            dismissed = state.last_dismissed_at
            if dismissed.tzinfo is None:
                dismissed = dismissed.replace(tzinfo=timezone.utc)
            if (now - dismissed).days < settings.feedback_cooldown_days:
                return False, "recently_dismissed", None

        if state.last_prompt_at:
            prompted = state.last_prompt_at
            if prompted.tzinfo is None:
                prompted = prompted.replace(tzinfo=timezone.utc)
            if (now - prompted).days < settings.feedback_cooldown_days:
                return False, "recently_prompted", None

        engaged = state.session_count >= settings.feedback_min_sessions or state.meaningful_actions >= settings.feedback_min_actions
        if not engaged:
            return False, "not_enough_engagement", None

        if trigger and trigger not in FeedbackService.SUCCESS_TRIGGERS:
            return False, "invalid_trigger", None

        if trigger == "session_milestone" and state.session_count < settings.feedback_min_sessions:
            return False, "session_milestone_not_reached", None

        headline, subcopy = FeedbackService._prompt_copy(trigger, state)
        return True, "eligible", {"headline": headline, "subcopy": subcopy, "trigger": trigger or "session_milestone"}

    @staticmethod
    def _prompt_copy(trigger: Optional[str], state: FeedbackPromptState) -> tuple[str, str]:
        copies = {
            "jd_created": (
                "Nice work on that JD!",
                "You just shipped something useful — mind sharing a quick pulse on TalentForge?",
            ),
            "jd_approved": (
                "Workflow win!",
                "That approval went through smoothly. How is the platform feeling so far?",
            ),
            "jd_exported": (
                "Export complete!",
                "Before you move on — a 10-second rating helps us improve for your team.",
            ),
            "assignment_completed": (
                "Task completed!",
                "You've been making progress. Got one tip to make this even better?",
            ),
            "session_milestone": (
                "You're getting the hang of it",
                "After a few sessions, your honest feedback means a lot — no survey marathon, promise.",
            ),
        }
        return copies.get(trigger or "session_milestone", copies["session_milestone"])

    @staticmethod
    async def record_session(db: AsyncSession, current_user: Any) -> dict:
        user_id, user_type, role, org_id, *_ = FeedbackService._resolve_actor(current_user)
        if _is_super_admin_role(role):
            return {"recorded": False, "reason": "super_admin_excluded"}

        state = await FeedbackService._get_or_create_state(db, user_id, user_type, org_id)
        now = datetime.now(timezone.utc)

        should_increment = True
        if state.last_session_at:
            last = state.last_session_at
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (now - last).total_seconds() < 3600:
                should_increment = False

        if should_increment:
            state.session_count += 1
            state.last_session_at = now
            state.updated_at = now
            await feedback_repository.upsert_prompt_state(db, state)

        return {"recorded": True, "session_count": state.session_count}

    @staticmethod
    async def record_event(db: AsyncSession, current_user: Any, event_type: str, metadata: Optional[dict] = None) -> dict:
        user_id, user_type, role, org_id, *_ = FeedbackService._resolve_actor(current_user)
        if _is_super_admin_role(role):
            return {"recorded": False, "eligible": False, "reason": "super_admin_excluded"}

        state = await FeedbackService._get_or_create_state(db, user_id, user_type, org_id)
        if event_type in FeedbackService.SUCCESS_TRIGGERS:
            state.meaningful_actions += 1
            state.updated_at = datetime.now(timezone.utc)
            await feedback_repository.upsert_prompt_state(db, state)

        eligible, reason, prompt = FeedbackService._eligible_now(state, event_type if event_type in FeedbackService.SUCCESS_TRIGGERS else None)
        if eligible and prompt:
            state.last_prompt_at = datetime.now(timezone.utc)
            await feedback_repository.upsert_prompt_state(db, state)
        return {"recorded": True, "eligible": eligible, "reason": reason, "prompt": prompt, "metadata": metadata or {}}

    @staticmethod
    async def get_prompt(db: AsyncSession, current_user: Any, trigger: str = "session_milestone") -> dict:
        user_id, user_type, role, org_id, *_ = FeedbackService._resolve_actor(current_user)
        if _is_super_admin_role(role):
            return {"eligible": False, "reason": "super_admin_excluded", "prompt": None}

        state = await FeedbackService._get_or_create_state(db, user_id, user_type, org_id)
        eligible, reason, prompt = FeedbackService._eligible_now(state, trigger)
        if eligible and prompt:
            state.last_prompt_at = datetime.now(timezone.utc)
            await feedback_repository.upsert_prompt_state(db, state)
        return {"eligible": eligible, "reason": reason, "prompt": prompt}

    @staticmethod
    async def dismiss_prompt(db: AsyncSession, current_user: Any) -> dict:
        user_id, user_type, role, org_id, *_ = FeedbackService._resolve_actor(current_user)
        if _is_super_admin_role(role):
            return {"dismissed": False}

        state = await FeedbackService._get_or_create_state(db, user_id, user_type, org_id)
        now = datetime.now(timezone.utc)
        state.last_dismissed_at = now
        state.dismiss_count += 1
        state.snooze_until = now + timedelta(days=FeedbackService.DISMISS_SNOOZE_DAYS)
        state.updated_at = now
        await feedback_repository.upsert_prompt_state(db, state)
        return {"dismissed": True, "snooze_until": state.snooze_until.isoformat()}

    @staticmethod
    async def submit_feedback(
        db: AsyncSession,
        current_user: Any,
        *,
        rating: Optional[int],
        comment: Optional[str],
        tip: Optional[str],
        trigger_context: Optional[dict],
    ) -> PlatformFeedback:
        user_id, user_type, role, org_id, email, full_name, org_name_hint = FeedbackService._resolve_actor(current_user)
        if _is_super_admin_role(role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin feedback is not collected")

        if rating is not None and not (1 <= rating <= 5):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5")

        if not rating and not (comment or tip):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide a rating or written feedback")

        org_name = org_name_hint or await FeedbackService._get_org_name(db, org_id)
        feedback = PlatformFeedback(
            user_id=user_id,
            user_type=user_type,
            org_id=org_id,
            user_email=email,
            user_name=full_name,
            user_role=role,
            org_name=org_name,
            rating=rating,
            comment=(comment or "").strip() or None,
            tip=(tip or "").strip() or None,
            trigger_context=trigger_context or {},
        )
        saved = await feedback_repository.create_feedback(db, feedback)

        state = await FeedbackService._get_or_create_state(db, user_id, user_type, org_id)
        now = datetime.now(timezone.utc)
        state.last_submitted_at = now
        state.snooze_until = now + timedelta(days=settings.feedback_submit_cooldown_days)
        state.updated_at = now
        await feedback_repository.upsert_prompt_state(db, state)

        recipients = _feedback_notify_recipients()
        if recipients:
            await async_email_service.send_platform_feedback_email_await(
                recipients=recipients,
                feedback=saved,
            )

        return saved

    @staticmethod
    async def get_analytics_overview(db: AsyncSession, limit: int = 200) -> dict:
        rows = await feedback_repository.list_all_for_analytics(db, limit=500)
        total_count = await feedback_repository.count_feedback(db)

        rated = [row for row in rows if row.rating is not None]
        rated_count = len(rated)
        average_rating = round(sum(row.rating for row in rated) / rated_count, 2) if rated_count else 0.0

        tips_count = sum(1 for row in rows if row.tip)
        comments_count = sum(1 for row in rows if row.comment)

        promoters = sum(1 for row in rated if row.rating >= 5)
        passives = sum(1 for row in rated if row.rating in (3, 4))
        detractors = sum(1 for row in rated if row.rating <= 2)
        satisfaction_score = round(((promoters - detractors) / rated_count) * 100) if rated_count else 0

        rating_distribution = {str(i): 0 for i in range(1, 6)}
        for row in rated:
            rating_distribution[str(row.rating)] += 1

        def bucket(items, key_fn):
            buckets: dict[str, list] = {}
            for row in items:
                key = key_fn(row) or "Unknown"
                buckets.setdefault(key, []).append(row)
            result = []
            for label, group in buckets.items():
                group_rated = [g for g in group if g.rating is not None]
                avg = round(sum(g.rating for g in group_rated) / len(group_rated), 2) if group_rated else None
                result.append({"label": label, "count": len(group), "average_rating": avg})
            return sorted(result, key=lambda x: x["count"], reverse=True)

        by_role = bucket(rows, lambda r: r.user_role)
        by_org = bucket(rows, lambda r: r.org_name or "No organization")[:12]
        by_trigger = bucket(
            rows,
            lambda r: (r.trigger_context or {}).get("trigger")
            or (r.trigger_context or {}).get("headline")
            or "unspecified",
        )

        recent = rows[:limit]

        return {
            "total_count": total_count,
            "rated_count": rated_count,
            "average_rating": average_rating,
            "tips_count": tips_count,
            "comments_count": comments_count,
            "promoters": promoters,
            "passives": passives,
            "detractors": detractors,
            "satisfaction_score": satisfaction_score,
            "rating_distribution": rating_distribution,
            "by_role": by_role,
            "by_org": by_org,
            "by_trigger": by_trigger,
            "recent": recent,
        }


feedback_service = FeedbackService()
