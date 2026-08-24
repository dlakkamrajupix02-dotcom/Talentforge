from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import OrgImageUploadResponse, OrgImageListResponse
from app.services.dependencies import get_current_regular_user
from app.services.org_image_service import org_image_service

router = APIRouter(prefix="/organizations/images", tags=["organization images"], dependencies=[Depends(get_current_regular_user)])


@router.post("/", response_model=OrgImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_org_image(image: UploadFile = File(...),label: Optional[str] = Form(None),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin only: Upload an image to the organization's shared image library.
    All org members can view and use these images on their JDs.
    """
    return await org_image_service.upload_org_image(db, image, label, current_user)


@router.get("/", response_model=OrgImageListResponse)
async def list_org_images(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    List all images in the organization's shared image library.
    Available to all org members (Admin, Manager, HR).
    """
    return await org_image_service.list_org_images(db, current_user)


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org_image(image_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin only: Delete an image from the organization's shared image library.
    Also removes the file from disk.
    """
    await org_image_service.delete_org_image(db, image_id, current_user)
