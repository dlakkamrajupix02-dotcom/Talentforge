from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import SessionResponse
from app.services.dependencies import get_current_regular_user
from app.services.session_service import session_service

router = APIRouter(prefix="/sessions", tags=["Session Audit"])


@router.get("/me", response_model=List[SessionResponse], summary="My session history")
async def get_my_sessions(limit: int = Query(30, ge=1, le=100, description="Max sessions to return"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Returns the authenticated user's own session history, newest first.
    Includes both successful and failed login attempts.
    """
    return await session_service.get_my_sessions(db, current_user, limit)


@router.get("/active", response_model=List[SessionResponse], summary="All active sessions (Admin only)")
async def get_active_sessions(limit: int = Query(50, ge=1, le=200),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin-only: returns all sessions that have not been logged out yet.
    """
    return await session_service.get_active_sessions(db, current_user, limit)


@router.get("/all", response_model=List[SessionResponse], summary="Full audit log (Admin only)")
async def get_all_sessions(login_status: Optional[str] = Query(None, description="Filter by 'success' or 'failed'"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    limit: int = Query(100, ge=1, le=500),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin-only: full session audit log with optional filters.
    """
    return await session_service.get_all_sessions(db, current_user, login_status, ip_address, limit)
