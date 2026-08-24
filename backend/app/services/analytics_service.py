from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ApplicationError
from app.repository.analytics_repository import analytics_repository


class AnalyticsService:
    async def get_jd_approval_funnel(self, *, db: AsyncSession, org_id: Any) -> dict[str, Any]:
        try:
            return await analytics_repository.get_jd_approval_funnel(db, org_id)
        except Exception as exc:
            raise ApplicationError("Failed to load JD approval funnel", exc)

    async def get_user_recent_activities(self, *, db: AsyncSession, user_id: Any, org_id: Any = None, limit: int = 20) -> list[dict[str, Any]]:
        try:
            return await analytics_repository.get_recent_user_activities(db, user_id=user_id, org_id=org_id, limit=limit)
        except Exception as exc:
            raise ApplicationError("Failed to load recent user activities", exc)

    async def get_unified_engine_overview(self, *, response: Any, db: AsyncSession, org_id: str) -> dict:
        try:
            total_jds = await analytics_repository.count_job_descriptions(db, org_id)

            ai_built_jds = await analytics_repository.count_job_descriptions_by_generation_mode(db, org_id, ["ai"])
            predefined_jds = await analytics_repository.count_job_descriptions_by_generation_mode(db, org_id, ["template", "template_customised"])
            total_templates = await analytics_repository.count_active_templates(db)

            regular_members = await analytics_repository.count_regular_members(db, org_id)
            candidate_members = await analytics_repository.count_candidate_members(db, org_id)
            total_members = regular_members + candidate_members

            active_reg = await analytics_repository.count_regular_members_by_status(db, org_id, "active")
            active_cand = await analytics_repository.count_candidate_members_by_status(db, org_id, "active")
            total_active = active_reg + active_cand

            inactive_reg = await analytics_repository.count_regular_members_by_status(db, org_id, "inactive")
            inactive_cand = await analytics_repository.count_candidate_members_by_status(db, org_id, "inactive")
            total_inactive = inactive_reg + inactive_cand

            admin_count = await analytics_repository.count_regular_members_by_role(db, org_id, "admin")
            manager_count = await analytics_repository.count_regular_members_by_role(db, org_id, "manager")
            hr_count = await analytics_repository.count_regular_members_by_role(db, org_id, "hr")
            user_count = await analytics_repository.count_users_by_role_including_candidates(db, org_id, "user")

            pending_assignments = await analytics_repository.count_job_descriptions_by_status(db, org_id, ["in_review"])
            approved_assignments = await analytics_repository.count_job_descriptions_by_status(db, org_id, ["approved"])
            rejected_assignments = await analytics_repository.count_job_descriptions_by_status(db, org_id, ["declined"])

            active_departments = await analytics_repository.count_active_departments(db, org_id)

            all_jds_count = await analytics_repository.count_all_job_descriptions(db, org_id)
            pushed_to_csod_count = await analytics_repository.count_pushed_to_csod_job_descriptions(db, org_id)

            average_score = round(pushed_to_csod_count / all_jds_count * 100, 1) if all_jds_count > 0 else 0.0

            # New metrics
            active_roles = await analytics_repository.count_active_members(db, org_id)
            jds_assigned_to_candidates = await analytics_repository.count_jds_assigned_to_candidates(db, org_id)
            jds_accepted_by_candidates = await analytics_repository.count_jds_accepted_by_candidates(db, org_id)
            jds_by_status = await analytics_repository.count_jds_by_status_dict(db, org_id)
            jds_by_department = await analytics_repository.count_jds_by_department(db, org_id)
            department_count = await analytics_repository.count_departments_in_org(db, org_id)
            jds_by_department_month = await analytics_repository.count_jds_by_department_and_month(db, org_id)

            response.headers["Cache-Control"] = "no-store"
            return {
                "jd_distribution": {
                    "total_descriptions": total_jds,
                    "ai_built": ai_built_jds,
                    "predefined": predefined_jds,
                    "total_template": total_templates,
                },
                "users_and_access": {
                    "total_member": total_members,
                    "active_member": total_active,
                    "active_roles": active_roles,
                    "admin": admin_count,
                    "manager": manager_count,
                    "hr": hr_count,
                    "user": user_count,
                    "inactive_member": total_inactive,
                },
                "workflow_funnel": {
                    "pending": pending_assignments,
                    "approved": approved_assignments,
                    "rejected": rejected_assignments,
                },
                "quality_and_scope": {
                    "average_score": average_score,
                    "active_departments": active_departments,
                    "total_departments": department_count,
                },
                "candidate_metrics": {
                    "jds_assigned_to_candidates": jds_assigned_to_candidates,
                    "jds_accepted_by_candidates": jds_accepted_by_candidates,
                },
                "jds_by_status": jds_by_status,
                "jds_by_department": jds_by_department,
                "jds_created_by_department_and_month": jds_by_department_month,
            }
        except Exception as exc:
            raise ApplicationError("Failed to load analytics overview", exc)


analytics_service = AnalyticsService()
