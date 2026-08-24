"""
Secure file serving endpoints with authentication and ownership checks.
All private uploads are served through these endpoints with proper access control.
"""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_regular_user, get_current_candidate
from app.models.models import User, CandidateUser
from app.core.logging import get_logger

logger = get_logger()
router = APIRouter(prefix="/private", tags=["Secure File Access"])

# Private uploads directory
UPLOADS_ROOT = Path("private/uploads")


def _validate_path(file_path: str) -> Path:
    """Validate file path to prevent directory traversal attacks."""
    try:
        # Remove leading slash and construct full path
        relative_path = file_path.lstrip("/")
        full_path = UPLOADS_ROOT / relative_path.replace("private/uploads/", "")
        
        # Resolve to absolute path and verify it's within uploads root
        resolved_path = full_path.resolve()
        if not str(resolved_path).startswith(str(UPLOADS_ROOT.resolve())):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        if not resolved_path.exists() or not resolved_path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
        return resolved_path
    except Exception as e:
        logger.warning("Invalid file path access attempt: %s", file_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")


@router.get("/uploads/digital_signatures/{filename}")
async def serve_digital_signature(filename: str,current_candidate: CandidateUser = Depends(get_current_candidate),db: AsyncSession = Depends(get_db)):
    """
    Serve digital signature files with candidate authentication.
    Only the candidate who owns the signature can access it.
    """
    try:
        file_path = _validate_path(f"/private/uploads/digital_signatures/{filename}")
        
        # Security: Verify the signature belongs to this candidate
        # The filename should be stored in the candidate's record
        if current_candidate.digital_signature_url:
            expected_filename = current_candidate.digital_signature_url.split("/")[-1]
            if filename != expected_filename:
                logger.warning("Candidate %s attempted to access unauthorized signature: %s", 
                             current_candidate.id, filename)
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No signature on record")
        
        logger.info("Serving digital signature for candidate %s", current_candidate.id)
        return FileResponse(file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error serving digital signature: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to serve file")


@router.get("/uploads/org_images/{filename}")
async def serve_org_image(filename: str,current_user: User = Depends(get_current_regular_user),db: AsyncSession = Depends(get_db)):
    """
    Serve organization image files with user authentication.
    Users can only access images from their own organization.
    """
    try:
        file_path = _validate_path(f"/private/uploads/org_images/{filename}")
        
        # Security: Verify the organization image belongs to user's organization
        from app.repository import organization_repository as org_repo
        org = await org_repo.get_organization_by_id(db, current_user.org_id)
        if not org or not org.image_url or filename not in org.image_url:
            logger.warning("User %s attempted to access unauthorized org image: %s", current_user.id, filename)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        logger.info("Serving org image for user %s from org %s", current_user.id, current_user.org_id)
        return FileResponse(file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error serving org image: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to serve file")


@router.get("/uploads/jd_images/{filename}")
async def serve_jd_image(filename: str,current_user: User = Depends(get_current_regular_user),db: AsyncSession = Depends(get_db)):
    """
    Serve job description image files with user authentication.
    Users can only access JD images from their own organization.
    """
    try:
        file_path = _validate_path(f"/private/uploads/jd_images/{filename}")
        
        # Security: Verify the JD belongs to user's organization
        from app.repository import jd_repository as jd_repo
        from sqlalchemy import select
        from app.models.models import JobDescription
        result = await db.execute(select(JobDescription).where(JobDescription.image_url.like(f"%{filename}%")))
        jd = result.scalar_one_or_none()
        if not jd or jd.org_id != current_user.org_id:
            logger.warning("User %s attempted to access unauthorized JD image: %s", current_user.id, filename)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        logger.info("Serving JD image for user %s from org %s", current_user.id, current_user.org_id)
        return FileResponse(file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error serving JD image: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to serve file")
