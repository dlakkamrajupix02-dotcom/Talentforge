from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import OrganizationCreate, OrganizationResponse, OrganizationUpdate, CreateOrgMemberRequest, MFAPolicyRequest, MFAPolicyResponse
from app.services.dependencies import get_current_regular_user, require_admin, is_super_admin_role, require_csod_staff, is_admin_or_super_admin
from app.services.organization_service import organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"], dependencies=[Depends(get_current_regular_user)])


@router.get("/managers", include_in_schema=True)
async def list_managers(status: Optional[str] = Query(None, description="Filter managers by status: active or inactive", pattern="^(active|inactive)$"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """List managers in the current organization with basic profile and status details."""
    require_csod_staff(current_user, detail="Only Admin, Manager, and HR can view managers")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    return await organization_service.list_managers(db, current_user.org_id, status)


@router.get("/members", include_in_schema=True)
async def list_org_members(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    List all users in the organization.
    Returns both regular users and candidate users.
    Non-admin users can only see their own data.
    """
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    return await organization_service.list_org_members(db, current_user)


@router.post("/members", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_org_member(payload: CreateOrgMemberRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Create a new organization member.
    Admins, Managers, HR are stored in talentforge_users table.
    Users (candidates) are stored in candidate_users table.
    """
    require_admin(current_user, detail="Only Admin can create members")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Admin has no company assigned")
    return await organization_service.create_org_member(db, current_user, payload)


@router.get("/mfa-policy", response_model=MFAPolicyResponse, include_in_schema=True)
async def get_org_mfa_policy(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user, detail="Only Admin can manage MFA policy")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    policy_data = await organization_service.get_org_mfa_policy(db, current_user.org_id)
    return MFAPolicyResponse(**policy_data)


@router.patch("/mfa-policy", response_model=MFAPolicyResponse, include_in_schema=True)
async def update_org_mfa_policy(payload: MFAPolicyRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user, detail="Only Admin can manage MFA policy")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    policy_data = await organization_service.update_org_mfa_policy(db, current_user.org_id, payload)
    return MFAPolicyResponse(**policy_data)


@router.get("/organization_hierarchy", include_in_schema=True)
async def organization_hierarchy(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Return an organization hierarchy based on who created/added whom."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    require_admin(current_user, detail="Only Admin can access organization hierarchy")
    return await organization_service.get_organization_hierarchy(db, current_user.org_id)


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(org_data: OrganizationCreate,db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Create a new organization. Admin only."""
    require_admin(current_user, detail="Only Admin can create organizations")
    new_org = await organization_service.create_organization(db, org_data.name, org_data.industry)
    return OrganizationResponse(id=new_org.id,name=new_org.name,industry=new_org.industry,created_at=new_org.created_at, updated_at=new_org.updated_at)


@router.post("/with_image", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization_with_image(name: str = Form(...),industry: str | None = Form(None),image: UploadFile | None = File(None),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create organization with optional image stored on disk. Admin only."""
    require_admin(current_user, detail="Only Admin can create organizations")
    new_org = await organization_service.create_organization_with_image(db, name, industry, image)
    return OrganizationResponse.model_validate(new_org)


@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(skip: int = Query(0, ge=0),limit: int = Query(100, ge=1, le=100),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get organizations with pagination."""
    organizations = await organization_service.list_organizations(db, current_user, skip, limit)
    return [
        OrganizationResponse(id=org.id,name=org.name,industry=org.industry,image_url=org.image_url,created_at=org.created_at,updated_at=org.updated_at)
        for org in organizations
        if org is not None
    ]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get organization by ID."""
    if not is_admin_or_super_admin(current_user) and current_user.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own organization")
    org = await organization_service.get_organization_by_id(db, org_id)
    image_base64 = None
    if org and org.image_url:
        from app.core.file_storage import get_image_base64_from_disk
        image_base64 = await get_image_base64_from_disk(org.image_url)
    return OrganizationResponse(id=org.id,name=org.name,industry=org.industry,image_url=org.image_url,image_base64=image_base64,created_at=org.created_at,updated_at=org.updated_at)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(org_id: UUID,org_data: OrganizationUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update organization details. Admin only, must belong to the org."""
    require_admin(current_user, detail="Only Admin can update organizations")
    if current_user.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own organization")
    org = await organization_service.update_organization(db, org_id, org_data)
    return OrganizationResponse(id=org.id,name=org.name,industry=org.industry,image_url=org.image_url,created_at=org.created_at,updated_at=org.updated_at)


@router.patch("/{org_id}/image", response_model=OrganizationResponse)
async def update_organization_image(org_id: UUID,image: UploadFile = File(...),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update organization image. Admin only."""
    require_admin(current_user, detail="Only Admin can update organization image")
    if current_user.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own organization image")
    org = await organization_service.update_organization_image(db, org_id, image)
    return OrganizationResponse.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(org_id: UUID, db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Delete organization (soft delete). Admin only."""
    require_admin(current_user, detail="Only Admin can delete organizations")
    if current_user.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own organization")
    await organization_service.delete_organization(db, org_id)
