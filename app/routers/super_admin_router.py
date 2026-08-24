from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Form, UploadFile, File, status
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_super_admin, get_current_user
from app.schemas.schemas import OrganizationResponse, OrganizationAccessUpdate, OrgJDAnalyticsResponse, PlatformOverviewResponse, FeedbackAnalyticsResponse, BroadcastMessageCreate, BroadcastMessageUpdate, BroadcastMessageResponse, OrganizationUpdate, OrgMemberDetail, OrgMembersGroupedResponse, OrganizationWithAdminCreate, SuperAdminCreateOrgMemberRequest
from app.services.feedback_service import feedback_service
from app.services.super_admin_service import super_admin_service

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

@router.post("/organizations/with-admin", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_org_with_admin(org_name: str = Form(..., min_length=2, max_length=100),org_industry: Optional[str] = Form(None, max_length=100),org_image: Optional[UploadFile] = File(None),admin_full_name: str = Form(..., min_length=3, max_length=50),admin_email: EmailStr = Form(...),admin_password: str = Form(..., min_length=8),admin_country: str = Form(..., min_length=2, max_length=120),admin_color_code: Optional[str] = Form(None),db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Create a new organization and its default admin user in one step using multipart/form-data. Accessible only by Super Admin."""
    payload = OrganizationWithAdminCreate(org_name=org_name,org_industry=org_industry,admin_full_name=admin_full_name,admin_email=admin_email,admin_password=admin_password,admin_country=admin_country,admin_color_code=admin_color_code,org_image_url=None)
    return await super_admin_service.create_org_with_admin(db, payload, org_image, current_user)

@router.get("/organizations/members-by-name", response_model=OrgMembersGroupedResponse)
async def get_org_members_by_name(org_name: str = Query(..., min_length=1, description="The organization name to query"),db: AsyncSession = Depends(get_db),current_user = Depends(get_current_super_admin)):
    """Get all admins, managers, HR, and end-users details for an organization by name."""
    return await super_admin_service.get_org_members_by_name(db, org_name)

@router.post("/organizations/{org_id}/members", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_org_member(org_id: UUID, payload: SuperAdminCreateOrgMemberRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Add Admin, Manager, HR, or End User to an organization. Created by is set to the Super Admin."""
    return await super_admin_service.create_org_member(db, org_id, payload, current_user)

@router.patch("/organizations/{org_id}", response_model=OrganizationResponse)
async def patch_organization(org_id: UUID,payload: OrganizationUpdate,db: AsyncSession = Depends(get_db),current_user = Depends(get_current_super_admin)):
    """Partially update organization details (name, industry, image_url). Accessible only by Super Admin."""
    return await super_admin_service.patch_organization(db, org_id, payload)

@router.get("/organizations", response_model=List[OrganizationResponse])
async def get_all_organizations(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Get a list of all organizations. Accessible only by Super Admin."""
    return await super_admin_service.get_all_organizations(db)

@router.patch("/organizations/{org_id}/access", response_model=OrganizationResponse)
async def update_organization_access(org_id: UUID,payload: OrganizationAccessUpdate,db: AsyncSession = Depends(get_db),current_user = Depends(get_current_super_admin)):
    """Update organization access (active status and expiry date). Accessible only by Super Admin."""
    return await super_admin_service.update_organization_access(db, org_id, payload)

@router.get("/analytics/jds", response_model=List[OrgJDAnalyticsResponse])
async def get_jd_analytics(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Get Job Description creation analytics (daily, monthly, yearly) by organization. Accessible only by Super Admin."""
    return await super_admin_service.get_jd_analytics(db)

@router.get("/analytics/platform-overview", response_model=PlatformOverviewResponse)
async def get_platform_overview(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Platform-wide analytics, tenant health, and maintenance signals for Super Admin."""
    return await super_admin_service.get_platform_overview(db)

@router.get("/analytics/feedback", response_model=FeedbackAnalyticsResponse)
async def get_feedback_analytics(
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_super_admin),
):
    """Platform feedback analytics and recent submissions for Super Admin."""
    return await feedback_service.get_analytics_overview(db, limit=limit)

@router.post("/broadcasts", response_model=BroadcastMessageResponse)
async def create_broadcast(payload: BroadcastMessageCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Create a new broadcast message."""
    return await super_admin_service.create_broadcast(db, payload, current_user)

@router.get("/broadcasts", response_model=List[BroadcastMessageResponse])
async def get_all_broadcasts(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Get all broadcast messages (active and inactive)."""
    return await super_admin_service.get_all_broadcasts(db)

@router.patch("/broadcasts/{broadcast_id}", response_model=BroadcastMessageResponse)
async def update_broadcast(broadcast_id: UUID, payload: BroadcastMessageUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Update a broadcast message (e.g. toggle is_active)."""
    return await super_admin_service.update_broadcast(db, broadcast_id, payload)

@router.delete("/broadcasts/{broadcast_id}", status_code=204)
async def delete_broadcast(broadcast_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_super_admin)):
    """Delete a broadcast message."""
    await super_admin_service.delete_broadcast(db, broadcast_id)

@router.get("/broadcasts/active", response_model=List[BroadcastMessageResponse])
async def get_active_broadcasts(db: AsyncSession = Depends(get_db),current_user = Depends(get_current_user)):
    """
    Get all currently active broadcast messages.
    This endpoint is public for authenticated users to see platform announcements.
    """
    return await super_admin_service.get_active_broadcasts(db)

@router.get("/broadcasts/active/public", response_model=List[BroadcastMessageResponse])
async def get_public_active_broadcasts(db: AsyncSession = Depends(get_db)):
    """Public read-only list of active broadcasts (e.g. maintenance notice on login page)."""
    return await super_admin_service.get_active_broadcasts(db)
