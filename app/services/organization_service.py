import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.models.models import Organization, User, CandidateUser
from app.repository import organization_repository as org_repo
from app.repository import user_repository as user_repo
from app.repository import candidate_user_repository as candidate_repo
from app.services.auth_service import hash_password
from app.services.async_email_service import async_email_service
from app.core.exceptions import PasswordValidationError
from app.core.file_storage import save_image_to_disk, delete_image_from_disk

logger = get_logger()


class OrganizationService:
    async def get_or_create_organization_by_name(self, db: AsyncSession, *, company_name: str, industry: Optional[str] = None) -> Tuple[bool, str, Optional[Organization]]:
        """Get existing Organization by name or create it."""
        try:
            name = company_name.strip()
            existing = await org_repo.get_organization_by_name(db, name)
            if existing:
                return True, "Organization found", existing

            org = await org_repo.create_organization(db, name=name, industry=industry)
            return True, "Organization created", org
        except Exception as e:
            logger.error("Error getting/creating organization: %s", str(e))
            await db.rollback()
            return False, "Failed to get/create organization", None

    async def assign_organization_to_user(self, db: AsyncSession, *, user_id: uuid.UUID, org_id: uuid.UUID) -> Tuple[bool, str, bool]:
        try:
            await org_repo.assign_organization_to_user(db, user_id=user_id, org_id=org_id)
            return True, "Organization assigned successfully", True
        except Exception as e:
            logger.error("Error assigning organization to user %s: %s", user_id, str(e))
            await db.rollback()
            return False, "Failed to assign organization", False

    async def get_user_organization(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[Organization]:
        """Get the organization assigned to a user."""
        try:
            return await org_repo.get_user_organization(db, user_id)
        except Exception as e:
            logger.error(f"Error getting organization for user {user_id}: {str(e)}")
            return None

    async def list_managers(self, db: AsyncSession, org_id: uuid.UUID, status_filter: Optional[str]) -> List[Dict[str, Any]]:
        users = await user_repo.list_users_by_org(db, org_id)
        organization = await org_repo.get_organization_by_id(db, org_id)
        org_name = organization.name if organization else None

        managers = [
            {
                "id": str(user.id),
                "name": user.full_name,
                "email": user.email,
                "orgname": org_name,
                "status": user.status or "inactive",
            }
            for user in users
            if getattr(user, "role", None) == "Manager"
            and (status_filter is None or (user.status or "inactive") == status_filter)
        ]
        return managers

    async def list_org_members(self, db: AsyncSession, current_user: User) -> List[Dict[str, Any]]:
        if current_user.role != "Admin":
            return [
                {
                    "user_id": str(current_user.id),
                    "name": current_user.full_name,
                    "email": current_user.email,
                    "role": current_user.role,
                    "color_code": getattr(current_user, "color_code", None),
                    "user_type": "candidate" if hasattr(current_user, "company_name") else "regular",
                    "country": getattr(current_user, "region", None)
                }
            ]

        regular_users = await user_repo.list_users_by_org(db, current_user.org_id)
        candidate_users = await candidate_repo.list_candidate_users(db, current_user.org_id)
        nodes: dict[str, dict] = {}

        def _add_member_node(uid: str, name: str, email: str, role: str, status_str: str | None, color_code: str | None, user_type: str, country: str | None, company_name: str | None, employee_id: str | None, added_by_id: str | None, added_by_name: str | None):
            nodes[uid] = {
                "user_id": uid,
                "name": name,
                "email": email,
                "role": role,
                "status": status_str,
                "color_code": color_code,
                "user_type": user_type,
                "country": country,
                "company_name": company_name,
                "employee_id": employee_id,
                "added_by_id": added_by_id,
                "added_by_name": added_by_name,
                "added_by_name": added_by_name,
            }

        for user in regular_users:
            parent_id = str(user.created_by) if getattr(user, "created_by", None) else None
            _add_member_node(uid=str(user.id),name=user.full_name,email=user.email,role=user.role,status_str=user.status,color_code=user.color_code,user_type="regular",country=user.region,company_name=None,employee_id=None,added_by_id=parent_id,added_by_name=user.creator_name if getattr(user, "creator_name", None) else None)

        for candidate in candidate_users:
            parent_id = str(candidate.created_by) if getattr(candidate, "created_by", None) else None
            _add_member_node(uid=str(candidate.id),name=candidate.full_name,email=candidate.email,role=candidate.role,status_str=candidate.status,color_code=None,user_type="candidate",country=None,company_name=candidate.company_name,employee_id=candidate.employee_id,added_by_id=parent_id,added_by_name=candidate.creator_name if getattr(candidate, "creator_name", None) else None)
        
        return list(nodes.values())

    async def create_org_member(self, db: AsyncSession, current_user: User, payload: Any) -> Dict[str, Any]:
        user_exists = await user_repo.get_user_by_email(db, payload.email)
        candidate_exists = await candidate_repo.get_candidate_user_by_email(db, payload.email)
        
        if user_exists or candidate_exists:
            raise HTTPException(status_code=409, detail="Email already exists in the system")

        try:
            if payload.role == "User":
                org = await org_repo.get_organization_by_id(db, current_user.org_id)
                company_name = org.name if org else None
                new_user = await candidate_repo.create_candidate_user(db,org_id=current_user.org_id,full_name=payload.full_name,email=payload.email,hashed_password=hash_password(payload.password),created_by=current_user.id,creator_name=current_user.full_name,company_name=company_name)
                async_email_service.send_candidate_account_email(recipient_email=payload.email,username=payload.full_name,password=payload.password,company_name=company_name or "Your Company")
                return {
                    "user_id": str(new_user.id),
                    "name": new_user.full_name,
                    "email": new_user.email,
                    "role": new_user.role,
                }
            else:
                new_user = await user_repo.create_user(db,user_id=uuid.uuid4(),full_name=payload.full_name,email=payload.email,hashed_password=hash_password(payload.password),role=payload.role,region=current_user.region,org_id=current_user.org_id,color_code=payload.color_code,created_by=current_user.id,creator_name=current_user.full_name)
                org = await org_repo.get_organization_by_id(db, current_user.org_id)
                company_name = org.name if org else "Your Company"
                async_email_service.send_user_account_email(recipient_email=payload.email,username=payload.full_name,password=payload.password,company_name=company_name,user_role=payload.role)
                return {
                    "user_id": str(new_user.id),
                    "full_name": new_user.full_name,
                    "email": new_user.email,
                    "role": new_user.role,
                }
        except PasswordValidationError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    async def get_org_mfa_policy(self, db: AsyncSession, org_id: uuid.UUID) -> Dict[str, Any]:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        policy = getattr(org, "mfa_policy", None) or {}
        return {
            "required_roles": list(policy.get("required_roles", [])),
            "optional_roles": list(policy.get("optional_roles", []))
        }

    async def update_org_mfa_policy(self, db: AsyncSession, org_id: uuid.UUID, payload: Any) -> Dict[str, Any]:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        normalized_policy = {
            "required_roles": [role for role in payload.required_roles if role],
            "optional_roles": [role for role in payload.optional_roles if role],
        }
        org = await org_repo.update_organization(db, org=org, update_data={"mfa_policy": normalized_policy})
        return {
            "required_roles": list(org.mfa_policy.get("required_roles", [])),
            "optional_roles": list(org.mfa_policy.get("optional_roles", []))
        }

    async def get_organization_hierarchy(self, db: AsyncSession, org_id: uuid.UUID) -> List[Dict[str, Any]]:
        regular_users = await user_repo.list_users_by_org(db, org_id)
        candidate_users = await candidate_repo.list_candidate_users(db, org_id)
        nodes: dict[str, dict] = {}

        def _add_node(uid: str, name: str, email: str, oid: str, role: str, joined_by_id: str | None, joined_at):
            nodes[uid] = {
                "id": uid,
                "name": name,
                "email": email,
                "role": role,
                "org_id": str(oid) if oid is not None else None,
                "joined_by_id": str(joined_by_id) if joined_by_id is not None else None,
                "joined_at": joined_at.isoformat() if hasattr(joined_at, "isoformat") else str(joined_at),
                "children": [],
            }

        for u in regular_users:
            parent = u.created_by if getattr(u, "created_by", None) is not None else None
            _add_node(str(u.id), u.full_name, u.email, u.org_id, u.role, parent, u.created_at)

        for c in candidate_users:
            parent = c.created_by if getattr(c, "created_by", None) is not None else None
            _add_node(str(c.id), c.full_name, c.email, c.org_id, c.role, parent, c.created_at)

        children_map: dict[str | None, list[dict]] = {}
        for n in nodes.values():
            parent = n["joined_by_id"]
            children_map.setdefault(parent, []).append(n)

        for lst in children_map.values():
            lst.sort(key=lambda x: x["joined_at"])

        def build_tree(node: dict) -> dict:
            node_children = children_map.get(node["id"], [])
            node["children"] = [build_tree(child) for child in node_children]
            return node

        roots = children_map.get(None, [])
        roots.sort(key=lambda x: x["joined_at"])
        return [build_tree(r) for r in roots]

    async def create_organization(self, db: AsyncSession, name: str, industry: Optional[str]) -> Organization:
        existing_org = await org_repo.get_organization_by_name(db, name)
        if existing_org:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this name already exists")
        new_org = await org_repo.create_organization(db, name=name, industry=industry)
        logger.info(f"Organization created: {new_org.name} (ID: {new_org.id})")
        return new_org

    async def create_organization_with_image(self, db: AsyncSession, name: str, industry: Optional[str], image: Optional[UploadFile]) -> Organization:
        existing_org = await org_repo.get_organization_by_name(db, name)
        if existing_org:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this name already exists")
        
        image_url = None
        if image:
            try:
                image_url = await save_image_to_disk(image=image, kind="organizations")
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
        new_org = await org_repo.create_organization(db, name=name, industry=industry, image_url=image_url)
        return new_org

    async def list_organizations(self, db: AsyncSession, current_user: User, skip: int, limit: int) -> List[Organization]:
        if current_user.role == "Admin":
            return await org_repo.list_organizations(db, skip=skip, limit=limit)
        
        if not current_user.org_id:
            return []
        own_org = await org_repo.get_organization_by_id(db, current_user.org_id)
        return [own_org] if own_org else []

    async def get_organization_by_id(self, db: AsyncSession, org_id: uuid.UUID) -> Organization:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return org

    async def update_organization(self, db: AsyncSession, org_id: uuid.UUID, org_data: Any) -> Organization:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        
        if org_data.name and org_data.name != org.name:
            existing_org = await org_repo.get_organization_by_name(db, org_data.name)
            if existing_org and existing_org.id != org_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this name already exists")
        
        update_data = org_data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        updated_org = await org_repo.update_organization(db, org=org, update_data=update_data)
        logger.info(f"Organization updated: {updated_org.name} (ID: {updated_org.id})")
        return updated_org

    async def update_organization_image(self, db: AsyncSession, org_id: uuid.UUID, image: UploadFile) -> Organization:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        try:
            new_image_url = await save_image_to_disk(image=image, kind="organizations")
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
        if org.image_url:
            delete_image_from_disk(org.image_url)
            
        updated_org = await org_repo.update_organization(db, org=org, update_data={"image_url": new_image_url})
        logger.info(f"Organization image updated: {updated_org.name} (ID: {updated_org.id})")
        return updated_org

    async def delete_organization(self, db: AsyncSession, org_id: uuid.UUID) -> None:
        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        
        users_count = await org_repo.get_org_users_count(db, org_id)
        if users_count > 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot delete organization with {users_count} associated users")
        
        await org_repo.delete_organization(db, org=org)
        logger.info(f"Organization deleted: {org.name} (ID: {org.id})")


organization_service = OrganizationService()
