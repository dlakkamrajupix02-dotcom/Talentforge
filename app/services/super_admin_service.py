from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.repository.super_admin_repository import super_admin_repository, normalize_broadcast_expiry_for_storage
from app.models.models import Organization, BroadcastMessage, User
from app.schemas.schemas import OrganizationAccessUpdate, BroadcastMessageCreate, BroadcastMessageUpdate, OrganizationUpdate, OrganizationWithAdminCreate, SuperAdminCreateOrgMemberRequest

class SuperAdminService:
    
    @staticmethod
    async def create_org_with_admin(db: AsyncSession, payload: OrganizationWithAdminCreate, org_image: Optional[UploadFile], current_user: User) -> dict:
        from app.repository import organization_repository as org_repo
        from app.repository import user_repository as user_repo
        from app.repository import auth_repository as auth_repo
        from app.services.auth_service import hash_password
        from uuid import uuid4
        from sqlalchemy.exc import IntegrityError
        from app.core.logging import log_exception_one_line
        
        existing_org = await org_repo.get_organization_by_name(db, payload.org_name)
        if existing_org:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this name already exists")
            
        existing_user = await user_repo.get_user_by_email(db, payload.admin_email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")
            
        try:
            image_url = None
            if org_image and org_image.filename:
                chunk = await org_image.read(10)
                await org_image.seek(0)
                if chunk:
                    from app.core.file_storage import save_image_to_disk
                    try:
                        image_url = await save_image_to_disk(image=org_image, kind="organizations")
                    except ValueError as e:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
            org = await org_repo.create_organization(db, name=payload.org_name, industry=payload.org_industry, image_url=image_url)
            
            if not org:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create organization")
            admin_user = await user_repo.create_user(db, user_id=uuid4(), full_name=payload.admin_full_name, email=payload.admin_email, hashed_password=hash_password(payload.admin_password), role="Admin", region=payload.admin_country, org_id=org.id, color_code=payload.admin_color_code, created_by=current_user.id, creator_name=current_user.full_name)
            
            from app.services.async_email_service import async_email_service
            email_sent = await async_email_service.send_org_admin_welcome_email_await(
                recipient_email=payload.admin_email,
                username=payload.admin_full_name,
                password=payload.admin_password,
                company_name=payload.org_name,
            )
            return {
                "message": "Organization and admin user created successfully",
                "organization_id": str(org.id),
                "admin_user_id": str(admin_user.id),
                "email_sent": email_sent,
            }
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Creation failed due to duplicate data")
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log_exception_one_line("create_org_with_admin failed", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred. Please try again.")


    
    @staticmethod
    async def get_all_organizations(db: AsyncSession) -> List[Organization]:
        return await super_admin_repository.get_all_organizations(db)

    @staticmethod
    async def update_organization_access(db: AsyncSession, org_id: UUID, payload: OrganizationAccessUpdate) -> Organization:
        org = await super_admin_repository.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
        return await super_admin_repository.update_organization_access(db, org, payload.is_active, payload.access_valid_until)

    @staticmethod
    async def get_org_members_by_name(db: AsyncSession, org_name: str) -> dict:
        org = await super_admin_repository.get_organization_by_name(db, org_name)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        users = await super_admin_repository.get_users_by_org(db, org.id)
        candidates = await super_admin_repository.get_candidates_by_org(db, org.id)
        admins = []
        managers = []
        hr = []
        end_users = []
        
        from app.schemas.schemas import OrgMemberDetail
        
        for u in users:
            detail = OrgMemberDetail(id=u.id,name=u.full_name,email=u.email,status=u.status,user_type="regular")
            if u.role == "Admin":
                admins.append(detail)
            elif u.role == "Manager":
                managers.append(detail)
            elif u.role == "HR":
                hr.append(detail)
            elif u.role == "User":
                end_users.append(detail)
                
        for c in candidates:
            detail = OrgMemberDetail(id=c.id,name=c.full_name,email=c.email,status=c.status,user_type="candidate")
            end_users.append(detail)
            
        return {
            "organization_id": org.id,
            "organization_name": org.name,
            "admins": admins,
            "managers": managers,
            "hr": hr,
            "end_users": end_users
        }

    @staticmethod
    async def create_org_member(
        db: AsyncSession,
        org_id: UUID,
        payload: SuperAdminCreateOrgMemberRequest,
        current_user: User,
    ) -> dict:
        from app.repository import organization_repository as org_repo
        from app.repository import user_repository as user_repo
        from app.repository import candidate_user_repository as candidate_repo
        from app.services.auth_service import hash_password
        from app.services.async_email_service import async_email_service
        from app.core.exceptions import PasswordValidationError
        from uuid import uuid4

        org = await org_repo.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        user_exists = await user_repo.get_user_by_email(db, payload.email)
        candidate_exists = await candidate_repo.get_candidate_user_by_email(db, payload.email)
        if user_exists or candidate_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists in the system")

        region = payload.country or getattr(current_user, "region", None) or "India"
        company_name = org.name
        creator_id = current_user.id
        creator_name = current_user.full_name or "Super Admin"

        try:
            if payload.role == "User":
                new_user = await candidate_repo.create_candidate_user(
                    db,
                    org_id=org.id,
                    full_name=payload.full_name,
                    email=payload.email,
                    hashed_password=hash_password(payload.password),
                    created_by=creator_id,
                    creator_name=creator_name,
                    company_name=company_name,
                )
                async_email_service.send_candidate_account_email(
                    recipient_email=payload.email,
                    username=payload.full_name,
                    password=payload.password,
                    company_name=company_name,
                )
                return {
                    "message": "End user created successfully",
                    "user_id": str(new_user.id),
                    "full_name": new_user.full_name,
                    "email": new_user.email,
                    "role": new_user.role,
                    "email_sent": True,
                }

            new_user = await user_repo.create_user(
                db,
                user_id=uuid4(),
                full_name=payload.full_name,
                email=payload.email,
                hashed_password=hash_password(payload.password),
                role=payload.role,
                region=region,
                org_id=org.id,
                color_code=payload.color_code,
                created_by=creator_id,
                creator_name=creator_name,
            )
            async_email_service.send_user_account_email(
                recipient_email=payload.email,
                username=payload.full_name,
                password=payload.password,
                company_name=company_name,
                user_role=payload.role,
            )
            return {
                "message": f"{payload.role} member created successfully",
                "user_id": str(new_user.id),
                "full_name": new_user.full_name,
                "email": new_user.email,
                "role": new_user.role,
                "email_sent": True,
            }
        except PasswordValidationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @staticmethod
    async def patch_organization(db: AsyncSession, org_id: UUID, payload: OrganizationUpdate) -> Organization:
        org = await super_admin_repository.get_organization_by_id(db, org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        if payload.name and payload.name != org.name:
            existing_org = await super_admin_repository.get_organization_by_name(db, payload.name)
            if existing_org and existing_org.id != org_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Organization with this name already exists")
                
        update_data = payload.model_dump(exclude_unset=True)
        return await super_admin_repository.update_organization(db, org, update_data)

    @staticmethod
    async def get_jd_analytics(db: AsyncSession) -> List[dict]:
        return await super_admin_repository.get_jd_analytics(db)

    @staticmethod
    async def get_platform_overview(db: AsyncSession) -> dict:
        from datetime import timedelta

        orgs = await super_admin_repository.get_all_organizations(db)
        analytics_rows = await super_admin_repository.get_jd_analytics(db)
        active_broadcasts = await super_admin_repository.get_active_broadcasts(db)
        analytics_by_id = {row["org_id"]: row for row in analytics_rows}

        now = datetime.now(timezone.utc)
        expiring_cutoff = now + timedelta(days=30)

        maintenance_alerts = []
        organizations = []
        suspended_organizations = 0
        expiring_organizations = 0
        idle_organizations = 0
        active_organizations = 0
        role_totals = {"admin": 0, "hr": 0, "manager": 0, "enduser": 0}

        for org in orgs:
            stats = analytics_by_id.get(org.id, {})
            health = "healthy"
            access_until = org.access_valid_until
            if access_until and access_until.tzinfo is None:
                access_until = access_until.replace(tzinfo=timezone.utc)

            if not org.is_active:
                health = "suspended"
                suspended_organizations += 1
                maintenance_alerts.append(
                    {
                        "type": "suspended",
                        "severity": "critical",
                        "org_id": org.id,
                        "org_name": org.name,
                        "message": f"{org.name} is suspended. All tenant users are blocked from login.",
                    }
                )
            elif access_until and access_until < now:
                health = "expired"
                suspended_organizations += 1
                maintenance_alerts.append(
                    {
                        "type": "expired",
                        "severity": "critical",
                        "org_id": org.id,
                        "org_name": org.name,
                        "message": f"{org.name} access expired on {access_until.strftime('%b %d, %Y')}.",
                    }
                )
            elif access_until and access_until <= expiring_cutoff:
                health = "expiring"
                expiring_organizations += 1
                maintenance_alerts.append(
                    {
                        "type": "expiring",
                        "severity": "warning",
                        "org_id": org.id,
                        "org_name": org.name,
                        "message": f"{org.name} access expires on {access_until.strftime('%b %d, %Y')}.",
                    }
                )
            else:
                active_organizations += 1

            if health == "healthy" and stats.get("daily_count", 0) == 0 and stats.get("monthly_count", 0) == 0:
                health = "idle"
                idle_organizations += 1
                maintenance_alerts.append(
                    {
                        "type": "idle",
                        "severity": "info",
                        "org_id": org.id,
                        "org_name": org.name,
                        "message": f"{org.name} has no JD activity this month. Consider a tenant health check.",
                    }
                )

            role_totals["admin"] += stats.get("admin_count", 0) or 0
            role_totals["hr"] += stats.get("hr_count", 0) or 0
            role_totals["manager"] += stats.get("manager_count", 0) or 0
            role_totals["enduser"] += stats.get("enduser_count", 0) or 0

            organizations.append(
                {
                    "org_id": org.id,
                    "org_name": org.name,
                    "industry": org.industry,
                    "is_active": org.is_active,
                    "access_valid_until": org.access_valid_until,
                    "health": health,
                    "daily_count": stats.get("daily_count", 0) or 0,
                    "monthly_count": stats.get("monthly_count", 0) or 0,
                    "yearly_count": stats.get("yearly_count", 0) or 0,
                    "total_count": stats.get("total_count", 0) or 0,
                    "total_users": stats.get("total_users", 0) or 0,
                    "admin_count": stats.get("admin_count", 0) or 0,
                    "hr_count": stats.get("hr_count", 0) or 0,
                    "manager_count": stats.get("manager_count", 0) or 0,
                    "enduser_count": stats.get("enduser_count", 0) or 0,
                }
            )

        if active_broadcasts:
            maintenance_alerts.insert(
                0,
                {
                    "type": "broadcast",
                    "severity": "info",
                    "org_id": None,
                    "org_name": None,
                    "message": f"{len(active_broadcasts)} active broadcast(s) are currently visible to users.",
                },
            )

        total_jds = sum(row.get("total_count", 0) or 0 for row in analytics_rows)
        daily_jds = sum(row.get("daily_count", 0) or 0 for row in analytics_rows)
        monthly_jds = sum(row.get("monthly_count", 0) or 0 for row in analytics_rows)
        yearly_jds = sum(row.get("yearly_count", 0) or 0 for row in analytics_rows)
        total_users = sum(row.get("total_users", 0) or 0 for row in analytics_rows)

        penalty = suspended_organizations * 18 + expiring_organizations * 8 + idle_organizations * 4
        platform_health_score = max(0, min(100, 100 - penalty))

        velocity_trend = sorted(
            [
                {
                    "org_name": row["org_name"],
                    "daily": row.get("daily_count", 0) or 0,
                    "monthly": row.get("monthly_count", 0) or 0,
                    "yearly": row.get("yearly_count", 0) or 0,
                    "total_users": row.get("total_users", 0) or 0,
                }
                for row in analytics_rows
            ],
            key=lambda item: item["monthly"],
            reverse=True,
        )

        return {
            "total_organizations": len(orgs),
            "active_organizations": active_organizations,
            "suspended_organizations": suspended_organizations,
            "expiring_organizations": expiring_organizations,
            "idle_organizations": idle_organizations,
            "total_users": total_users,
            "total_jds": total_jds,
            "daily_jds": daily_jds,
            "monthly_jds": monthly_jds,
            "yearly_jds": yearly_jds,
            "active_broadcasts": len(active_broadcasts),
            "platform_health_score": platform_health_score,
            "role_totals": role_totals,
            "maintenance_alerts": maintenance_alerts[:12],
            "organizations": organizations,
            "velocity_trend": velocity_trend,
        }

    @staticmethod
    async def create_broadcast(db: AsyncSession, payload: BroadcastMessageCreate, current_user: User) -> BroadcastMessage:
        broadcast = BroadcastMessage(
            title=payload.title,
            message=payload.message,
            type=payload.type,
            is_active=payload.is_active,
            expires_at=normalize_broadcast_expiry_for_storage(payload.expires_at),
            created_by_id=current_user.id,
        )
        return await super_admin_repository.create_broadcast(db, broadcast)

    @staticmethod
    async def get_all_broadcasts(db: AsyncSession) -> List[BroadcastMessage]:
        return await super_admin_repository.get_all_broadcasts(db)

    @staticmethod
    async def get_active_broadcasts(db: AsyncSession) -> List[BroadcastMessage]:
        return await super_admin_repository.get_active_broadcasts(db)

    @staticmethod
    async def update_broadcast(db: AsyncSession, broadcast_id: UUID, payload: BroadcastMessageUpdate) -> BroadcastMessage:
        broadcast = await super_admin_repository.get_broadcast_by_id(db, broadcast_id)
        if not broadcast:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast message not found")
        update_data = payload.model_dump(exclude_unset=True)
        if "expires_at" in update_data:
            update_data["expires_at"] = normalize_broadcast_expiry_for_storage(update_data["expires_at"])
        return await super_admin_repository.update_broadcast(db, broadcast, update_data)

    @staticmethod
    async def delete_broadcast(db: AsyncSession, broadcast_id: UUID) -> None:
        broadcast = await super_admin_repository.get_broadcast_by_id(db, broadcast_id)
        if not broadcast:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Broadcast message not found")
        await super_admin_repository.delete_broadcast(db, broadcast)

super_admin_service = SuperAdminService()
