from __future__ import annotations
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.models import CandidateUser, User, CustomFieldDefinition
from app.repository import extra_repository as extra_repo

logger = get_logger(__name__)


class ExtraService:
    async def search_by_email(self, db: AsyncSession, email: str, org_id: UUID) -> dict:
        normalized_email = email.strip().lower()
        user, candidate = await extra_repo.get_user_or_candidate_by_email_and_org(db, normalized_email, org_id)

        if user:
            return {
                "entity_type": "user",
                "entity_id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "status": user.status,
                "org_id": str(user.org_id) if user.org_id else None,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
                "user_type": "regular"
            }

        if candidate:
            return {
                "entity_type": "candidate",
                "entity_id": str(candidate.id),
                "email": candidate.email,
                "full_name": candidate.full_name,
                "role": candidate.role,
                "status": candidate.status,
                "org_id": str(candidate.org_id) if candidate.org_id else None,
                "created_at": candidate.created_at,
                "updated_at": candidate.updated_at,
                "company_name": candidate.company_name,
                "employee_id": candidate.employee_id,
                "user_type": "candidate"
            }

        raise NotFoundError(f"No user or candidate found with email '{normalized_email}' in your organization")

    async def update_user_role(self, db: AsyncSession, email: str, new_role: str, org_id: UUID, updated_by: UUID) -> dict:
        normalized_email = email.strip().lower()
        user = await extra_repo.get_user_by_email_and_org(db, normalized_email, org_id)
        if not user:
            raise NotFoundError(f"User with email '{normalized_email}' not found in your organization")

        updated_user = await extra_repo.update_user_role(db, user, new_role)
        return {
            "user_id": str(updated_user.id),
            "email": updated_user.email,
            "full_name": updated_user.full_name,
            "role": updated_user.role,
            "updated_by": str(updated_by),
            "updated_at": updated_user.updated_at
        }

    async def toggle_status_by_email(self, db: AsyncSession, email: str, org_id: UUID, updated_by: UUID) -> dict:
        normalized_email = email.strip().lower()
        user, candidate = await extra_repo.get_user_or_candidate_by_email_and_org(db, normalized_email, org_id)

        if user:
            new_status = "inactive" if user.status == "active" else "active"
            updated_user = await extra_repo.update_user_status(db, user, new_status)
            return {
                "entity_type": "user",
                "entity_id": str(updated_user.id),
                "email": updated_user.email,
                "status": updated_user.status,
                "old_status": "inactive" if new_status == "active" else "active",
                "new_status": updated_user.status,
                "updated_by": str(updated_by),
                "updated_at": updated_user.updated_at
            }

        if candidate:
            new_status = "inactive" if candidate.status == "active" else "active"
            updated_candidate = await extra_repo.update_candidate_status(db, candidate, new_status)
            return {
                "entity_type": "candidate",
                "entity_id": str(updated_candidate.id),
                "email": updated_candidate.email,
                "status": updated_candidate.status,
                "old_status": "inactive" if new_status == "active" else "active",
                "new_status": updated_candidate.status,
                "updated_by": str(updated_by),
                "updated_at": updated_candidate.updated_at
            }

        raise NotFoundError(f"No user or candidate found with email '{normalized_email}' in your organization")

    async def create_custom_field_definition(self, db: AsyncSession, data: "CustomFieldCreate", current_user: User, org_name: str) -> CustomFieldDefinition:
        existing = await extra_repo.get_custom_field_by_section_name(db, current_user.org_id, data.section_name)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Section name '{data.section_name}' already exists for your organization")

        new_custom_field = CustomFieldDefinition(
            org_id=current_user.org_id,
            org_name=org_name,
            created_by=current_user.id,
            creator_name=current_user.full_name,
            creator_role=current_user.role,
            section_name=data.section_name,
            section_data_type=data.section_data_type,
            section_data=data.section_data,
            description=data.description,
        )
        try:
            return await extra_repo.create_custom_field_definition(db, new_custom_field)
        except Exception as e:
            logger.error(f"Failed to create custom field definition: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create custom field definition. It might already exist or there was a database error.")

    async def update_custom_field_definition(self, db: AsyncSession, org_id: UUID, section_name: str, payload: CustomFieldUpdate) -> CustomFieldDefinition:
        custom_field = await extra_repo.get_custom_field_by_section_name(db, org_id, section_name)
        if not custom_field:
            raise NotFoundError(f"Custom field section '{section_name}' not found")

        update_data: dict = {}
        if payload.section_name and payload.section_name != section_name:
            if await extra_repo.get_custom_field_by_section_name(db, org_id, payload.section_name):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Section name '{payload.section_name}' already exists for your organization")
            custom_field.section_name = payload.section_name
            update_data["section_name"] = payload.section_name

        if payload.section_data is not None:
            custom_field.section_data = payload.section_data
            update_data["section_data"] = payload.section_data

        if payload.section_data_type is not None:
            custom_field.section_data_type = payload.section_data_type
            update_data["section_data_type"] = payload.section_data_type

        if payload.description is not None:
            custom_field.description = payload.description
            update_data["description"] = payload.description

        return await extra_repo.update_custom_field_definition(db, custom_field, update_data)

    async def list_custom_field_definitions(self, db: AsyncSession, org_id: UUID, current_user: User) -> List[CustomFieldDefinition]:
        if current_user.role == "Admin":
            return await extra_repo.list_custom_field_definitions(db, org_id)
        return await extra_repo.list_custom_field_definitions_by_creator(db, org_id, current_user.id)


extra_service = ExtraService()
