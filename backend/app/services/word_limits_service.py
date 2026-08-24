from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import UserWordLimits
from app.repository import jd_repository as jd_repo


def word_limits_from_model(model: UserWordLimits) -> dict:
    return {
        "summary": {"min": model.summary_min, "max": model.summary_max},
        "key_duties": {"min": model.key_duties_min, "max": model.key_duties_max},
        "core_competencies": {
            "min": model.core_competencies_min,
            "max": model.core_competencies_max,
        },
        "functional_competencies": {
            "min": model.functional_competencies_min,
            "max": model.functional_competencies_max,
        },
        "qualifications_required": {
            "min": model.qualifications_required_min,
            "max": model.qualifications_required_max,
        },
        "qualifications_preferred": {
            "min": model.qualifications_preferred_min,
            "max": model.qualifications_preferred_max,
        },
        "eeo_statement": {"min": model.eeo_statement_min, "max": model.eeo_statement_max},
    }


async def get_or_create_user_word_limits(db: AsyncSession, user_id) -> UserWordLimits:
    row = await jd_repo.get_user_word_limits(db, user_id)
    if row:
        return row
    return await jd_repo.create_user_word_limits(db, user_id)
