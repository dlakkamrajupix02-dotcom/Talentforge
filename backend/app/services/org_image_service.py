from uuid import UUID
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.file_storage import save_image_to_disk, delete_image_from_disk
from app.models.models import User
from app.services.dependencies import require_admin
from app.repository import org_image_repository as img_repo
from app.schemas.schemas import OrgImageUploadResponse, OrgImageListResponse

class OrgImageService:
    @staticmethod
    async def upload_org_image(db: AsyncSession, image: UploadFile, label: Optional[str], current_user: User) -> OrgImageUploadResponse:
        require_admin(current_user, detail="Only Admin can upload org images")
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin has no company assigned")
        try:
            image_url = await save_image_to_disk(image=image, kind="organizations")
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        if not image_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No image file received")
        record = await img_repo.create_org_image(db, org_id=current_user.org_id, uploaded_by=current_user.id, image_url=image_url, label=label)
        return OrgImageUploadResponse(id=record.id,org_id=record.org_id,uploaded_by=record.uploaded_by,uploader_name=current_user.full_name,uploader_role=current_user.role,image_url=record.image_url,label=record.label,created_at=record.created_at)

    @staticmethod
    async def list_org_images(db: AsyncSession, current_user: User) -> OrgImageListResponse:
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no company assigned")
        rows = await img_repo.list_org_images(db, org_id=current_user.org_id)
        return OrgImageListResponse(images=[OrgImageUploadResponse(**row) for row in rows], total=len(rows))

    @staticmethod
    async def delete_org_image(db: AsyncSession, image_id: UUID, current_user: User) -> None:
        require_admin(current_user, detail="Only Admin can delete org images")
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin has no company assigned")
        image = await img_repo.get_org_image_by_id(db, image_id=image_id, org_id=current_user.org_id)
        if not image:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        delete_image_from_disk(image.image_url)
        await img_repo.delete_org_image(db, image)

org_image_service = OrgImageService()
