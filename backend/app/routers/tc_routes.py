from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_regular_user, get_current_user
from app.models.models import User
from app.schemas.schemas import TermsAndConditionsCreate, TermsAndConditionsUpdate, TermsAndConditionsResponse
from app.services.tc_service import tc_service
from app.core.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/terms-and-conditions", tags=["Terms and Conditions"])

@router.post("/", response_model=TermsAndConditionsResponse, status_code=status.HTTP_201_CREATED)
async def create_terms(data: TermsAndConditionsCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create a new Terms and Conditions record for the organization (Admin only)."""
    try:
        return await tc_service.create_terms(db, current_user=current_user, content=data.content, is_active=data.is_active)
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create terms and conditions.")

@router.get("/active", response_model=TermsAndConditionsResponse)
async def get_active_terms(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get the currently active Terms and Conditions for the organization."""
    tc = await tc_service.get_active_terms(db, org_id=current_user.org_id)
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active terms and conditions found for this organization.")
    return tc

@router.get("/", response_model=List[TermsAndConditionsResponse])
async def list_terms(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all Terms and Conditions records for the organization."""
    return await tc_service.list_terms(db, current_user=current_user)

@router.get("/{tc_id}", response_model=TermsAndConditionsResponse)
async def get_terms(tc_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific Terms and Conditions record."""
    try:
        return await tc_service.get_terms(db, tc_id=tc_id, current_user=current_user)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.patch("/{tc_id}", response_model=TermsAndConditionsResponse)
async def update_terms(tc_id: UUID,data: TermsAndConditionsUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update an existing Terms and Conditions record (Admin only)."""
    try:
        return await tc_service.update_terms(db, tc_id=tc_id, current_user=current_user, content=data.content, is_active=data.is_active)
    except (NotFoundError, ForbiddenError) as e:
        status_code = status.HTTP_404_NOT_FOUND if isinstance(e, NotFoundError) else status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update terms and conditions.")

@router.delete("/{tc_id}")
async def delete_terms(tc_id: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Delete a Terms and Conditions record (Admin only)."""
    try:
        return await tc_service.delete_terms(db, tc_id=tc_id, current_user=current_user)
    except (NotFoundError, ForbiddenError) as e:
        status_code = status.HTTP_404_NOT_FOUND if isinstance(e, NotFoundError) else status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=status_code, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete terms and conditions.")
