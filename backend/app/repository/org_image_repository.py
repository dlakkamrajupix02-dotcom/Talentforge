from __future__ import annotations
import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import OrgImage, User


async def create_org_image(db: AsyncSession, *, org_id: uuid.UUID, uploaded_by: uuid.UUID,
    image_url: str, label: Optional[str] = None) -> OrgImage:
    img = OrgImage(org_id=org_id, uploaded_by=uploaded_by, image_url=image_url, label=label)
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return img


async def list_org_images(db: AsyncSession, org_id: uuid.UUID) -> list[dict]:
    res = await db.execute(select(OrgImage, User.full_name, User.role).outerjoin(User, OrgImage.uploaded_by == User.id)
        .where(OrgImage.org_id == org_id).order_by(OrgImage.created_at.desc()))
    rows = res.all()
    results = []
    for img, uploader_name, uploader_role in rows:
        results.append({
            "id": img.id,
            "org_id": img.org_id,
            "uploaded_by": img.uploaded_by,
            "uploader_name": uploader_name,
            "uploader_role": uploader_role,
            "image_url": img.image_url,
            "label": img.label,
            "created_at": img.created_at,
        })
    return results


async def get_org_image_by_id(db: AsyncSession, image_id: uuid.UUID, org_id: uuid.UUID) -> Optional[OrgImage]:
    res = await db.execute(select(OrgImage).where(OrgImage.id == image_id, OrgImage.org_id == org_id))
    return res.scalar_one_or_none()


async def get_org_image_with_uploader(db: AsyncSession, image_id: uuid.UUID, org_id: uuid.UUID) -> Optional[dict]:
    res = await db.execute(select(OrgImage, User.full_name, User.role).outerjoin(User, OrgImage.uploaded_by == User.id)
        .where(OrgImage.id == image_id, OrgImage.org_id == org_id))
    row = res.first()
    if not row:
        return None
    img, uploader_name, uploader_role = row
    return {
        "id": img.id,
        "org_id": img.org_id,
        "uploaded_by": img.uploaded_by,
        "uploader_name": uploader_name,
        "uploader_role": uploader_role,
        "image_url": img.image_url,
        "label": img.label,
        "created_at": img.created_at,
    }


async def delete_org_image(db: AsyncSession, image: OrgImage) -> None:
    await db.delete(image)
    await db.commit()
