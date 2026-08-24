from __future__ import annotations
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import CandidateUser, User, TalentForgeEmailGroup, CustomFieldDefinition
from app.repository import candidate_user_repository as candidate_repo
from app.schemas.schemas import EmailGroupCreate, EmailGroupUpdate


async def get_user_by_id_and_org(db: AsyncSession, user_id: UUID, org_id: UUID) -> User | None:
    """Get user by ID within specific organization."""
    result = await db.execute(select(User).where(User.id == user_id, User.org_id == org_id))
    return result.scalar_one_or_none()


async def get_user_by_email_and_org(db: AsyncSession, email: str, org_id: UUID) -> User | None:
    """Get user by email within specific organization."""
    result = await db.execute(select(User).where(User.email == email.lower().strip(), User.org_id == org_id))
    return result.scalar_one_or_none()


async def get_user_or_candidate_by_email_and_org(db: AsyncSession, email: str, org_id: UUID) -> tuple[User | None, CandidateUser | None]:
    """Search for a user or candidate by email within the same organization."""
    user = await get_user_by_email_and_org(db, email, org_id)
    if user:
        return user, None
    candidate = await candidate_repo.get_candidate_user_by_email(db, email.lower().strip(), org_id)
    return None, candidate


async def update_user_role(db: AsyncSession, user: User, new_role: str) -> User:
    """Update user role."""
    user.role = new_role
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_status(db: AsyncSession, user: User, status: str) -> User:
    """Toggle or set a user's status."""
    user.status = status
    if status == "active":
        from datetime import datetime, timezone
        user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def update_candidate_status(db: AsyncSession, candidate: CandidateUser, status: str) -> CandidateUser:
    """Toggle or set a candidate user's status."""
    candidate.status = status
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def create_email_group(db: AsyncSession, org_id: UUID, payload: EmailGroupCreate) -> TalentForgeEmailGroup:
    new_group = TalentForgeEmailGroup(org_id=org_id,group_name=payload.group_name,role=payload.role,emails=payload.emails)
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)
    return new_group

async def get_email_groups(db: AsyncSession, org_id: UUID) -> list[TalentForgeEmailGroup]:
    result = await db.execute(select(TalentForgeEmailGroup).where(TalentForgeEmailGroup.org_id == org_id))
    return list(result.scalars().all())

async def get_email_group_by_id(db: AsyncSession, group_id: UUID, org_id: UUID) -> TalentForgeEmailGroup | None:
    result = await db.execute(select(TalentForgeEmailGroup).where(TalentForgeEmailGroup.id == group_id, TalentForgeEmailGroup.org_id == org_id))
    return result.scalar_one_or_none()

async def get_email_group_by_name(db: AsyncSession, group_name: str, org_id: UUID) -> TalentForgeEmailGroup | None:
    result = await db.execute(select(TalentForgeEmailGroup).where(TalentForgeEmailGroup.group_name == group_name, TalentForgeEmailGroup.org_id == org_id))
    return result.scalar_one_or_none()

async def update_email_group(db: AsyncSession, group: TalentForgeEmailGroup, payload: EmailGroupUpdate) -> TalentForgeEmailGroup:
    if payload.group_name is not None:
        group.group_name = payload.group_name
    if payload.role is not None:
        group.role = payload.role
    if payload.emails is not None:
        group.emails = payload.emails
    
    await db.commit()
    await db.refresh(group)
    return group

async def delete_email_group(db: AsyncSession, group: TalentForgeEmailGroup) -> None:
    await db.delete(group)
    await db.commit()


async def create_custom_field_definition(db: AsyncSession, custom_field: CustomFieldDefinition) -> CustomFieldDefinition:
    db.add(custom_field)
    await db.commit()
    await db.refresh(custom_field)
    return custom_field


async def get_custom_field_by_section_name(db: AsyncSession, org_id: UUID, section_name: str) -> CustomFieldDefinition | None:
    result = await db.execute(
        select(CustomFieldDefinition).where(
            CustomFieldDefinition.org_id == org_id,
            func.lower(CustomFieldDefinition.section_name) == section_name.lower().strip()
        )
    )
    return result.scalar_one_or_none()


async def update_custom_field_definition(db: AsyncSession, custom_field: CustomFieldDefinition, payload: dict) -> CustomFieldDefinition:
    for key, value in payload.items():
        setattr(custom_field, key, value)
    await db.commit()
    await db.refresh(custom_field)
    return custom_field


async def list_custom_field_definitions(db: AsyncSession, org_id: UUID) -> list[CustomFieldDefinition]:
    result = await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.org_id == org_id))
    return list(result.scalars().all())


async def list_custom_field_definitions_by_creator(db: AsyncSession, org_id: UUID, creator_id: UUID) -> list[CustomFieldDefinition]:
    result = await db.execute(
        select(CustomFieldDefinition).where(
            CustomFieldDefinition.org_id == org_id,
            CustomFieldDefinition.created_by == creator_id
        )
    )
    return list(result.scalars().all())


async def rollback_db(db: AsyncSession) -> None:
    await db.rollback()

