from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User
from app.schemas.schemas import SessionResponse
from app.services.dependencies import require_admin
from app.repository import session_repository as session_repo

class SessionService:
    @staticmethod
    async def get_my_sessions(db: AsyncSession, current_user: User, limit: int) -> List[SessionResponse]:
        return await session_repo.get_user_sessions(db, user_id=current_user.id, limit=limit)

    @staticmethod
    async def get_active_sessions(db: AsyncSession, current_user: User, limit: int) -> List[SessionResponse]:
        require_admin(current_user)
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin has no organization assigned")
        return await session_repo.get_active_sessions(db, org_id=current_user.org_id, limit=limit)

    @staticmethod
    async def get_all_sessions(db: AsyncSession, current_user: User, login_status: Optional[str], ip_address: Optional[str], limit: int) -> List[SessionResponse]:
        require_admin(current_user)
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin has no organization assigned")
        return await session_repo.get_all_sessions(db,org_id=current_user.org_id,login_status=login_status,ip_address=ip_address,limit=limit)

session_service = SessionService()
