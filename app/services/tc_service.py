from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User, TermsAndConditions
from app.repository import tc_repository as tc_repo
from app.core.exceptions import NotFoundError, ForbiddenError

class TermsAndConditionsService:
    async def create_terms(self, db: AsyncSession, *, current_user: User, content: str, is_active: bool = True) -> TermsAndConditions:
        """Create a new Terms and Conditions record (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can manage Terms and Conditions.")
        
        tc = await tc_repo.create_tc(db, org_id=current_user.org_id, content=content, is_active=is_active)
        if is_active:
            await tc_repo.deactivate_others(db, org_id=current_user.org_id, current_tc_id=tc.id)
        return tc

    async def get_terms(self, db: AsyncSession, tc_id: UUID, current_user: User) -> TermsAndConditions:
        """Get a specific Terms and Conditions record."""
        tc = await tc_repo.get_tc_by_id(db, tc_id)
        if not tc:
            raise NotFoundError("Terms and Conditions record not found.")
        
        if tc.org_id != current_user.org_id:
            raise ForbiddenError("You can only access Terms and Conditions for your own organization.")
        
        return tc

    async def list_terms(self, db: AsyncSession, current_user: User) -> List[TermsAndConditions]:
        """List all Terms and Conditions for the current user's organization."""
        return await tc_repo.list_tc_by_org(db, current_user.org_id)

    async def get_active_terms(self, db: AsyncSession, org_id: UUID) -> Optional[TermsAndConditions]:
        """Get the currently active Terms and Conditions for an organization."""
        return await tc_repo.get_active_tc_by_org(db, org_id)

    async def update_terms(self, db: AsyncSession, *, tc_id: UUID, current_user: User, content: Optional[str] = None, is_active: Optional[bool] = None) -> TermsAndConditions:
        """Update a Terms and Conditions record (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can manage Terms and Conditions.")
        
        tc = await tc_repo.get_tc_by_id(db, tc_id)
        if not tc or tc.org_id != current_user.org_id:
            raise NotFoundError("Terms and Conditions record not found or access denied.")
        
        updated_tc = await tc_repo.update_tc(db, tc, content=content, is_active=is_active)
        if is_active:
            await tc_repo.deactivate_others(db, org_id=current_user.org_id, current_tc_id=updated_tc.id)
        return updated_tc

    async def delete_terms(self, db: AsyncSession, tc_id: UUID, current_user: User) -> dict:
        """Delete a Terms and Conditions record (Admin only)."""
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can manage Terms and Conditions.")
        
        tc = await tc_repo.get_tc_by_id(db, tc_id)
        if not tc or tc.org_id != current_user.org_id:
            raise NotFoundError("Terms and Conditions record not found or access denied.")
        
        await tc_repo.delete_tc(db, tc)
        return {"message": "Terms and Conditions record deleted successfully."}

tc_service = TermsAndConditionsService()
