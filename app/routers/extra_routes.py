from pathlib import Path
from uuid import uuid4
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User, JobDescription, CandidateUser, Template
from app.services.dependencies import get_current_user, get_current_regular_user, require_admin
from app.core.database import get_db
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, PasswordValidationError
from app.core.logging import get_logger, log_exception_one_line
from app.schemas.validators import validate_email, validate_full_name
from app.schemas.schemas import RoleUpdateRequest, OrgUserMfaToggleRequest, CompetencyCreate, CompetencyUpdate, CompetencyResponse, CustomFieldCreate, CustomFieldUpdate, CustomFieldResponse, EmailGroupCreate, EmailGroupUpdate, EmailGroupResponse
from app.services.auth_service import hash_password
from app.services.async_email_service import async_email_service
from app.services.extra_service import extra_service
from app.services.analytics_service import analytics_service
from app.repository import extra_repository as extra_repo
from app.repository import candidate_user_repository as candidate_repo
from app.repository import organization_repository as org_repo
from app.repository import user_repository as user_repo
from app.services import competency_service
from typing import Optional, List
from uuid import UUID


logger = get_logger()

router = APIRouter(prefix="/extra", tags=["Extra Admin Functions"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EXCEL_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
BULK_USER_MAX_ROWS = 500
REGULAR_USER_ROLES = {"Admin", "HR", "Manager"}
REGULAR_USER_REQUIRED_COLUMNS = ("SLNO", "FULL NAME", "EMAIL", "PASSWORD", "ROLE")
END_USER_REQUIRED_COLUMNS = ("SLNO", "FULL NAME", "EMAIL", "PASSWORD", "EMPLOYEE ID")


def _normalize_excel_cell(value) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def _normalize_excel_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = [str(col).strip().upper() for col in normalized.columns]
    return normalized


async def _read_bulk_user_excel(file: UploadFile, required_columns: tuple[str, ...]) -> pd.DataFrame:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise BadRequestError("Only Excel files (.xlsx, .xls) are accepted")

    try:
        from io import BytesIO

        df = pd.read_excel(BytesIO(await file.read()), sheet_name=0)
    except Exception as exc:
        log_exception_one_line("Bulk user Excel read failed", exc, filename=file.filename)
        raise BadRequestError("Unable to read Excel file")

    df = _normalize_excel_columns(df)
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        raise BadRequestError(f"Missing required columns: {', '.join(missing)}")

    data_rows = df.dropna(how="all")
    if len(data_rows) > BULK_USER_MAX_ROWS:
        raise BadRequestError(f"Excel can contain a maximum of {BULK_USER_MAX_ROWS} data rows")
    return data_rows


async def _ensure_bulk_admin(current_user: User) -> None:
    require_admin(current_user, detail="Only Admin can bulk create users")
    if not current_user.org_id:
        raise BadRequestError("Admin has no company assigned")


async def _email_exists_anywhere(db: AsyncSession, email: str) -> bool:
    user_exists = await user_repo.get_user_by_email(db, email)
    candidate_exists = await candidate_repo.get_candidate_user_by_email(db, email)
    return bool(user_exists or candidate_exists)


def _bulk_failure(row_number: int, email: str, reason: str) -> dict:
    return {"row": row_number, "email": email or None, "reason": reason}


def _bulk_success(user_id: UUID, full_name: str, email: str, role: str, employee_id: Optional[str] = None) -> dict:
    result = {"id": str(user_id), "full_name": full_name, "email": email, "role": role}
    if employee_id:
        result["employee_id"] = employee_id
    return result


def _download_excel_template(relative_path: str, filename: str) -> FileResponse:
    file_path = PROJECT_ROOT / relative_path
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Excel template not found")
    return FileResponse(path=file_path, filename=filename, media_type=EXCEL_MEDIA_TYPE)


@router.get("/download-template/regular")
async def download_regular_user_template(current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return _download_excel_template("private/uploads/REGULAR_USER/REGULAR_USER.xlsx","REGULAR_USER.xlsx")


@router.get("/download-template/enduser")
async def download_end_user_template(current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return _download_excel_template("private/uploads/END_USER/END_USER.xlsx","END_USER.xlsx")


@router.post("/bulk-create/regular-users")
async def bulk_create_regular_users(file: UploadFile = File(...),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Bulk create Admin/HR/Manager users from the fixed REGULAR_USER Excel template."""
    await _ensure_bulk_admin(current_user)
    rows = await _read_bulk_user_excel(file, REGULAR_USER_REQUIRED_COLUMNS)
    created: list[dict] = []
    failed: list[dict] = []
    seen_emails: set[str] = set()

    for idx, row in rows.iterrows():
        row_number = int(idx) + 2
        full_name_raw = _normalize_excel_cell(row.get("FULL NAME"))
        email_raw = _normalize_excel_cell(row.get("EMAIL"))
        password = _normalize_excel_cell(row.get("PASSWORD"))
        role = _normalize_excel_cell(row.get("ROLE"))

        try:
            if not full_name_raw:
                raise ValueError("Full name is required")
            full_name = validate_full_name(full_name_raw)

            email = validate_email(email_raw)
            if email in seen_emails:
                raise ValueError("Duplicate email in uploaded Excel")
            seen_emails.add(email)

            if not password:
                raise ValueError("Password is required")
            if role not in REGULAR_USER_ROLES:
                raise ValueError(f"Role must be one of: {', '.join(sorted(REGULAR_USER_ROLES))}")

            if await _email_exists_anywhere(db, email):
                raise ValueError("Email already exists in the system")

            new_user = await user_repo.create_user(db,user_id=uuid4(),full_name=full_name,email=email,
                hashed_password=hash_password(password),role=role,region=current_user.region,org_id=current_user.org_id,
                created_by=current_user.id, creator_name=current_user.full_name)

            created.append(_bulk_success(new_user.id, new_user.full_name, new_user.email, new_user.role))

            try:
                org = await org_repo.get_organization_by_id(db, current_user.org_id)
                async_email_service.send_user_account_email(recipient_email=email,username=full_name,password=password,
                    company_name=org.name if org else "Your Company",user_role=role)
            except Exception as email_exc:
                log_exception_one_line("Bulk regular user welcome email scheduling failed", email_exc, email=email)

        except (ValueError, PasswordValidationError) as exc:
            failed.append(_bulk_failure(row_number, email_raw, str(exc)))
        except Exception as exc:
            await db.rollback()
            log_exception_one_line("Bulk regular user row failed", exc, row=row_number, email=email_raw)
            failed.append(_bulk_failure(row_number, email_raw, str(exc)))

    return {
        "status": "completed",
        "type": "regular_users",
        "total_rows": len(rows),
        "created_count": len(created),
        "failed_count": len(failed),
        "created": created,
        "failed": failed,
    }


@router.post("/bulk-create/end-users")
async def bulk_create_end_users(file: UploadFile = File(...),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Bulk create candidate/end users from the fixed END_USER Excel template."""
    await _ensure_bulk_admin(current_user)
    rows = await _read_bulk_user_excel(file, END_USER_REQUIRED_COLUMNS)
    created: list[dict] = []
    failed: list[dict] = []
    seen_emails: set[str] = set()
    org = await org_repo.get_organization_by_id(db, current_user.org_id)
    company_name = org.name if org else None

    for idx, row in rows.iterrows():
        row_number = int(idx) + 2
        full_name_raw = _normalize_excel_cell(row.get("FULL NAME"))
        email_raw = _normalize_excel_cell(row.get("EMAIL"))
        password = _normalize_excel_cell(row.get("PASSWORD"))
        employee_id = _normalize_excel_cell(row.get("EMPLOYEE ID"))

        try:
            if not full_name_raw:
                raise ValueError("Full name is required")
            full_name = validate_full_name(full_name_raw)

            email = validate_email(email_raw)
            if email in seen_emails:
                raise ValueError("Duplicate email in uploaded Excel")
            seen_emails.add(email)

            if not password:
                raise ValueError("Password is required")

            if await _email_exists_anywhere(db, email):
                raise ValueError("Email already exists in the system")

            candidate = await candidate_repo.create_candidate_user(db,org_id=current_user.org_id,full_name=full_name,
                email=email,hashed_password=hash_password(password),created_by=current_user.id,creator_name=current_user.full_name,
                company_name=company_name,employee_id=employee_id or None)

            created.append(_bulk_success(candidate.id, candidate.full_name, candidate.email, candidate.role, candidate.employee_id))

            try:
                async_email_service.send_candidate_account_email(recipient_email=email,username=full_name,password=password,
                    company_name=company_name or "Your Company")
            except Exception as email_exc:
                log_exception_one_line("Bulk end user welcome email scheduling failed", email_exc, email=email)

        except (ValueError, PasswordValidationError) as exc:
            failed.append(_bulk_failure(row_number, email_raw, str(exc)))
        except Exception as exc:
            await db.rollback()
            log_exception_one_line("Bulk end user row failed", exc, row=row_number, email=email_raw)
            failed.append(_bulk_failure(row_number, email_raw, str(exc)))

    return {
        "status": "completed",
        "type": "end_users",
        "total_rows": len(rows),
        "created_count": len(created),
        "failed_count": len(failed),
        "created": created,
        "failed": failed,
    }


@router.patch("/user/role")
async def update_user_role(payload: RoleUpdateRequest,email: Optional[str] = Query(None, description="User email address"),
    db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Admin only: Update the role of any user in the organization by email.
    """
    require_admin(current_user, detail="Only Admin can update user roles")
    
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Validate role
    valid_roles = ["Admin", "HR", "Manager", "User"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=422, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    try:
        result = await extra_service.update_user_role(db, email, payload.role, current_user.org_id, current_user.id)
        logger.info(f"Admin {current_user.id} updated user {result['email']} role to {payload.role}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user role: {e}")
        await extra_repo.rollback_db(db)
        raise HTTPException(status_code=500, detail="Failed to update user role")


@router.patch("/toggle-status/{email}")
async def toggle_status_by_email(email: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Admin only: Toggle the status of a user or candidate within the current organization by email."""
    require_admin(current_user)
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Admin user has no company assigned")

    try:
        return await extra_service.toggle_status_by_email(db, email, current_user.org_id, current_user.id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/user/mfa")
async def toggle_user_mfa_by_email(payload: OrgUserMfaToggleRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Admin only: Toggle MFA for a user in the same organization by email."""
    require_admin(current_user)
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Admin user has no company assigned")

    normalized_email = payload.email.lower().strip()
    target_user = await user_repo.get_user_by_email(db, normalized_email)
    if target_user:
        if target_user.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="User does not belong to your organization")

        if payload.mfa:
            updated_user = await user_repo.update_user_mfa_state(db, target_user, enabled=True, verified=False)
        else:
            updated_user = await user_repo.update_user_mfa_state(db, target_user, enabled=False, verified=False, secret=None, backup_codes=None)

        return {
            "email": updated_user.email,
            "id": str(updated_user.id),
            "mfa": updated_user.mfa_enabled,
            "org_id": str(updated_user.org_id) if updated_user.org_id else None,
        }

    target_candidate = await candidate_repo.get_candidate_user_by_email(db, normalized_email, current_user.org_id)
    if not target_candidate:
        raise HTTPException(status_code=404, detail="User not found")
    if target_candidate.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="User does not belong to your organization")

    if payload.mfa:
        updated_candidate = await candidate_repo.update_candidate_mfa_state(db, target_candidate, enabled=True, verified=False)
    else:
        updated_candidate = await candidate_repo.update_candidate_mfa_state(db, target_candidate, enabled=False, verified=False)

    return {
        "email": updated_candidate.email,
        "id": str(updated_candidate.id),
        "mfa": updated_candidate.mfa_enabled,
        "org_id": str(updated_candidate.org_id) if updated_candidate.org_id else None,
    }


@router.get("/search-by-email/{email}")
async def search_by_email(email: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Admin only: Search for a user or candidate by email within the current organization."""
    require_admin(current_user)
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Admin user has no company assigned")

    try:
        return await extra_service.search_by_email(db, email, current_user.org_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/competencies", response_model=CompetencyResponse, status_code=status.HTTP_201_CREATED, tags=["Extra Admin Functions"])
async def add_competency(payload: CompetencyCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Add a new competency (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage competencies")
        
    # Security: Always use current_user.org_id to prevent cross-org data manipulation
    return await competency_service.add_competency(db, payload, current_user, current_user.org_id)

@router.get("/competencies", response_model=List[CompetencyResponse], tags=["Extra Admin Functions"])
async def get_competencies(categoryName: Optional[str] = Query(None, alias="categoryName"),db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get competencies with filtering by Category Name (org-scoped to current user)."""
    # Security: Always filter by current_user.org_id to prevent cross-org data access
    return await competency_service.get_competencies(db, category_name=categoryName, org_id=current_user.org_id)

@router.patch("/competencies/{competencyId}", response_model=CompetencyResponse, tags=["Extra Admin Functions"])
async def update_competency(competencyId: UUID,payload: CompetencyUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update a competency (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage competencies")

    return await competency_service.update_competency(db, competencyId, payload, current_user, current_user.org_id)

@router.delete("/competencies/{competencyId}", tags=["Extra Admin Functions"])
async def delete_competency(competencyId: UUID,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Delete a competency (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage competencies")
        
    # Security: Verify competency belongs to user's org before deletion
    await competency_service.delete_competency(db, competencyId, current_user.org_id)
    return {"message": "Competency deleted successfully"}


@router.post("/custom-fields", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED, tags=["Extra Admin Functions"])
async def create_custom_field(payload: CustomFieldCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Create a custom JD field definition for the organization."""
    require_admin(current_user, detail="Only Admin can manage custom fields")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")

    org = await org_repo.get_organization_by_id(db, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    custom_field = await extra_service.create_custom_field_definition(db, payload, current_user, org.name)
    return CustomFieldResponse.model_validate(custom_field)


@router.get("/custom-fields", response_model=List[CustomFieldResponse], tags=["Extra Admin Functions"])
async def list_custom_fields(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """List custom JD field definitions for the user's organization."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")

    org_fields = await extra_service.list_custom_field_definitions(db, current_user.org_id, current_user)
    return [CustomFieldResponse.model_validate(field) for field in org_fields]


@router.patch("/custom-fields/{section_name}", response_model=CustomFieldResponse, tags=["Extra Admin Functions"])
async def update_custom_field(section_name: str, payload: CustomFieldUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Update a custom JD field definition by section name for the organization."""
    require_admin(current_user, detail="Only Admin can manage custom fields")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")

    updated = await extra_service.update_custom_field_definition(db, current_user.org_id, section_name, payload)
    return CustomFieldResponse.model_validate(updated)


@router.get("/dashboard-stats", tags=["Extra Admin Functions"])
async def get_dashboard_stats(response: Response,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """
    Get dashboard statistics for the admin's organization.
    """
    require_admin(current_user, detail="Only Admin can access dashboard statistics")
        
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="Admin has no organization assigned")
        
    org_id = current_user.org_id

    return await analytics_service.get_unified_engine_overview(response=response, db=db, org_id=str(org_id))


@router.post("/email-groups", response_model=EmailGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_email_group(payload: EmailGroupCreate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create a new email group for the organization (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage email groups")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    try:
        group = await extra_repo.create_email_group(db, current_user.org_id, payload)
        return group
    except Exception as e:
        if "uq_email_group_name_per_org" in str(e):
            raise HTTPException(status_code=409, detail=f"Email group '{payload.group_name}' already exists in your organization")
        logger.error(f"Failed to create email group: {e}")
        await extra_repo.rollback_db(db)
        raise HTTPException(status_code=500, detail="Failed to create email group")


@router.get("/email-groups", response_model=List[EmailGroupResponse])
async def list_email_groups(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """List all email groups for the current user's organization."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    return await extra_repo.get_email_groups(db, current_user.org_id)


@router.get("/email-groups/{group_name}", response_model=EmailGroupResponse)
async def get_email_group(group_name: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Get a specific email group by name."""
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    group = await extra_repo.get_email_group_by_name(db, group_name, current_user.org_id)
    if not group:
        raise HTTPException(status_code=404, detail="Email group not found")
    return group


@router.patch("/email-groups/{group_name}", response_model=EmailGroupResponse)
async def update_email_group(group_name: str,payload: EmailGroupUpdate,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Update an email group (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage email groups")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    group = await extra_repo.get_email_group_by_name(db, group_name, current_user.org_id)
    if not group:
        raise HTTPException(status_code=404, detail="Email group not found")
    try:
        updated = await extra_repo.update_email_group(db, group, payload)
        return updated
    except Exception as e:
        if "uq_email_group_name_per_org" in str(e):
            raise HTTPException(status_code=409, detail=f"Email group '{payload.group_name}' already exists in your organization")
        logger.error(f"Failed to update email group: {e}")
        await extra_repo.rollback_db(db)
        raise HTTPException(status_code=500, detail="Failed to update email group")


@router.delete("/email-groups/{group_name}")
async def delete_email_group(group_name: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Delete an email group (Admin only)."""
    require_admin(current_user, detail="Only Admin can manage email groups")
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User has no company assigned")
    group = await extra_repo.get_email_group_by_name(db, group_name, current_user.org_id)
    if not group:
        raise HTTPException(status_code=404, detail="Email group not found")
    await extra_repo.delete_email_group(db, group)
    return {"message": f"Email group '{group.group_name}' deleted successfully"}
