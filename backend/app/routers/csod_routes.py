from __future__ import annotations
from datetime import datetime
import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.http_client import get_http_client
from app.core.logging import get_logger
from app.core.rate_limiter import limiter
from app.models.models import User
from app.repository.csod_repository import get_csod_pipeline_pushes_export
from app.schemas.schemas import (CSODBulkOURequest,CSODBulkPushJDRequest,CSODCheckPositionRequest,CSODConnectRequest,CSODConnectionPatch,CSODCreatePositionPipelineRequest,
    CSODCreatePositionRequest,CSODGetPositionRequest,CSODPushJDRequest,CSODTokenFromConnectionRequest,CSODTokenRequest)
from app.services.csod_service import (bulk_create_ous,bulk_push_jds,check_position_type,create_position,create_position_pipeline,delete_connection,
    fetch_and_store_ou,fetch_and_store_ou_by_external_id,fetch_token_direct,fetch_token_from_connection,get_connection,get_connection_status,get_job_applications,get_ou_details_by_id,
    get_position,patch_connection,push_jd_to_csod,save_connection,test_connection)
from app.services.dependencies import get_current_regular_user, require_admin, require_csod_staff

router = APIRouter(prefix="/csod",tags=["CSOD"],dependencies=[Depends(get_current_regular_user)])
logger = get_logger(__name__)


@router.get("/ous/{ouid}")
async def csod_fetch_ou(ouid: int,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Fetch an Organizational Unit from CSOD and store it in the database."""
    require_admin(current_user)
    return await fetch_and_store_ou(db, current_user, client, ouid)


@router.get("/ou-details/{ouid}")
async def csod_get_ou_details(ouid: int,connection_name: str | None = None,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Fetch OU details directly from CSOD using an active connection."""
    require_csod_staff(current_user)
    return await get_ou_details_by_id(db, current_user, client, ouid, connection_name)


@router.get("/ous/by-external-id/{ou_ref_id}")
async def csod_fetch_ou_by_external_id(ou_ref_id: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Fetch an Organizational Unit from CSOD by externalId (ou_ref_id) and store it in the database."""
    require_admin(current_user)
    return await fetch_and_store_ou_by_external_id(db, current_user, client, ou_ref_id)


@router.get("/status")
async def csod_status(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    require_csod_staff(current_user)
    return await get_connection_status(db, current_user)


@router.post("/connect")
async def csod_connect(data: CSODConnectRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await save_connection(db, current_user, data.model_dump())


@router.get("/connection/{connection_name}")
async def csod_get_connection(connection_name: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await get_connection(db, current_user, connection_name)


@router.patch("/connection/{connection_name}")
async def csod_patch_connection(connection_name: str,data: CSODConnectionPatch,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await patch_connection(db, current_user, connection_name, data.model_dump(exclude_unset=True))


@router.delete("/connection/{connection_name}")
async def csod_delete_connection(connection_name: str,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await delete_connection(db, current_user, connection_name)


@router.post("/token")
@limiter.limit("10/minute")
async def csod_token(request: Request,data: CSODTokenRequest,client: AsyncClient = Depends(get_http_client),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await fetch_token_direct(data.model_dump(), client)


@router.post("/token/from-connection")
@limiter.limit("10/minute")
async def csod_token_from_connection(request: Request,data: CSODTokenFromConnectionRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    require_admin(current_user)
    return await fetch_token_from_connection(db, current_user, client, data.model_dump())


@router.post("/test-connection")
async def csod_test_connection(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Test the most recently updated CSOD connection for the user's org."""
    require_admin(current_user)
    return await test_connection(db, current_user, client)


@router.post("/check-position")
@limiter.limit("20/minute")
async def csod_check_position(request: Request,data: CSODCheckPositionRequest,client: AsyncClient = Depends(get_http_client),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await check_position_type(data.model_dump(), client)


@router.post("/get-position")
@limiter.limit("20/minute")
async def csod_get_position(request: Request,data: CSODGetPositionRequest,client: AsyncClient = Depends(get_http_client),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await get_position(data.model_dump(), client)


@router.post("/create-position")
@limiter.limit("10/minute")
async def csod_create_position(request: Request,data: CSODCreatePositionRequest,client: AsyncClient = Depends(get_http_client),current_user: User = Depends(get_current_regular_user)):
    require_admin(current_user)
    return await create_position(data.model_dump(), client)


@router.post("/pipeline/create-position")
@limiter.limit("10/minute")
async def csod_pipeline_create_position(request: Request,data: CSODCreatePositionPipelineRequest,client: AsyncClient = Depends(get_http_client),current_user: User = Depends(get_current_regular_user)):
    """One-shot CSOD pipeline: token -> detect Position typeId -> create position."""
    require_admin(current_user)
    return await create_position_pipeline(data.model_dump(), client)


@router.post("/bulk/create-ous")
@limiter.limit("5/minute")
async def csod_bulk_create_ous(request: Request,data: CSODBulkOURequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Bulk create OUs (Positions) in CSOD."""
    require_admin(current_user)
    logger.info("CSOD Bulk OU creation triggered by Admin %s. IP: %s, UA: %s",current_user.id,request.client.host if request.client else "unknown",request.headers.get("user-agent", "unknown"))
    return await bulk_create_ous(db, current_user, client, data.model_dump())


@router.post("/push-jd")
@limiter.limit("10/minute")
async def csod_push_jd(request: Request,data: CSODPushJDRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Transform and push a specific Job Description to CSOD as a Position."""
    require_admin(current_user)
    logger.info("CSOD JD Push triggered by Admin %s for JD %s. IP: %s, UA: %s",current_user.id,data.jd_id,request.client.host if request.client else "unknown",request.headers.get("user-agent", "unknown"))
    return await push_jd_to_csod(db, current_user, client, data.model_dump())


@router.post("/bulk/push-jds")
@limiter.limit("5/minute")
async def csod_bulk_push_jds(request: Request,data: CSODBulkPushJDRequest,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Bulk transform and push multiple Job Descriptions to CSOD."""
    require_admin(current_user)
    logger.info("CSOD Bulk JD Push triggered by Admin %s for %s JDs. IP: %s, UA: %s",current_user.id,len(data.jds),request.client.host if request.client else "unknown",request.headers.get("user-agent", "unknown"))
    return await bulk_push_jds(db, current_user, client, data.model_dump())


@router.get("/job-applications")
async def csod_get_job_applications(request: Request,connection_name: str | None = None,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: AsyncClient = Depends(get_http_client)):
    """Fetch job requisition / application details directly from CSOD using an active connection."""
    require_csod_staff(current_user)
    params = {k: v for k, v in request.query_params.items() if k != "connection_name"}
    return await get_job_applications(db, current_user, client, connection_name, params=params)


@router.get("/export-pipeline-pushes")
async def csod_export_pipeline_pushes(format: str = "csv",db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Export CSOD pipeline push records for the organization as CSV or Excel."""
    require_admin(current_user)
    records = await get_csod_pipeline_pushes_export(db, current_user.org_id)
    wanted_columns = [
        "pushed_by_name",
        "jd_id",
        "pipeline_type",
        "connection_name",
        "ou_ref_id",
        "status",
        "stage_of_failure",
        "csod_ou_id",
        "csod_response_timestamp",
        "csod_response_link",
        "our_error",
        "csod_error_code",
        "csod_error_message",
        "csod_error_fields",
        "csod_http_status",
        "pushed_at",
    ]
    data = [{c: getattr(r, c) for c in wanted_columns} for r in records]
    df = pd.DataFrame(data, columns=wanted_columns)
    if format.lower() == "excel":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="xlsxwriter") as writer:
            df.to_excel(writer, index=False, sheet_name="Pushes")
        buffer.seek(0)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"TalentForge_CSOD_EXPORT_{current_user.org_id}_{datetime.utcnow().isoformat()}.xlsx"
    else:
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        buffer.seek(0)
        media_type = "text/csv"
        filename = f"csod_pushes_{current_user.org_id}_{datetime.utcnow().isoformat()}.csv"
    return StreamingResponse(buffer,media_type=media_type,headers={"Content-Disposition": f"attachment; filename={filename}"})
