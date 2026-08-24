from __future__ import annotations
import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.core.exceptions import BadRequestError
from app.core.database import get_db
from app.core.crypto import decrypt_str
from app.core.rate_limiter import limiter
from app.models.models import User
from app.models.models import JobDescription as JobDescriptionModel
from app.services.csod_service import format_jd_to_html, check_jd_lengths
from app.services.dependencies import get_current_regular_user, require_admin, is_admin_or_super_admin
from app.repository import csod_repository
from app.schemas.schemas import FoundationPipelineRequest, FoundationSummarySchema, CSODPipelinePushResponse


logger = get_logger(__name__)

router = APIRouter(prefix="/foundation", tags=["Foundation Pipeline"])

OU_TYPE_ID = 4
MAX_CONCURRENT_OU_POSTS = 150
MAX_OU_RETRIES = 6


@dataclass
class FoundationResult:
    """Result for individual JD processing."""
    jd_id: str
    status: str = "pending"   # 'success' or 'failed'
    created_at: datetime = None
    ou_id: Optional[str] = None
    ou_ref_id: Optional[str] = None  # CSOD reference ID sent to CSOD
    stage_of_failure: Optional[str] = None
    our_error: Optional[str] = None
    csod_error_code: Optional[str] = None
    csod_error_message: Optional[str] = None
    csod_error_fields: Optional[List[Dict[str, Any]]] = None
    csod_http_status: Optional[int] = None
    csod_response_timestamp: Optional[str] = None
    csod_response_link: Optional[str] = None
    connection_name: Optional[str] = None
    pushed_by: Optional[str] = None
    pushed_by_name: Optional[str] = None
    org_id: Optional[str] = None


@dataclass
class FoundationSummary:
    """Summary of foundation pipeline execution."""
    total_submitted: int
    total_succeeded: int
    total_failed: int
    failure_breakdown: Dict[str, int]
    failed_jd_ids: List[str]
    failed_records: List[Dict[str, str]]


async def get_jd_by_id(db: AsyncSession, jd_id: str) -> Optional[JobDescriptionModel]:
    """Fetch JD by ID from TalentForge."""
    try:
        result = await db.execute(select(JobDescriptionModel).where(JobDescriptionModel.id == uuid.UUID(jd_id)))
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to fetch JD {jd_id}: {e}")
        raise BadRequestError(f"Failed to fetch JD {jd_id}: {e}") from e


async def verify_ou_creation(client, base: str, token: str, ou_id: str) -> bool:
    """Verify OU was created in CSOD via GET request."""
    try:
        url = f"{base.rstrip('/')}/services/api/x/organizations/v1/ous/{ou_id}"
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            logger.info(f"Verified OU {ou_id} exists in CSOD")
            return True
        else:
            logger.error(f"OU verification failed for {ou_id}: HTTP {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"OU verification error for {ou_id}: {e}")
        return False


async def process_single_jd(db: AsyncSession, client, base: str, token: str, jd_id: str, result: FoundationResult, jd_obj: JobDescriptionModel | None = None, batch_index: int = 1) -> None:
    """Process a single JD through the complete foundation pipeline."""

    # Stage 1: Fetch JD
    jd = jd_obj or await get_jd_by_id(db, jd_id)
    if not jd:
        result.status = "failed"
        result.stage_of_failure = "fetch"
        result.our_error = "JD not found in TalentForge"
        result.created_at = datetime.now(timezone.utc)
        return

    # Stage 2: Convert to HTML
    try:
        html_content = format_jd_to_html(
            getattr(jd, "_content", None) or jd.content or {},
            sections_metadata=getattr(jd, "sections_metadata", None) or {},
        )
    except Exception as e:
        result.status = "failed"
        result.stage_of_failure = "conversion"
        result.our_error = f"HTML conversion failed: {e}"
        result.created_at = datetime.now(timezone.utc)
        logger.error(f"JD {jd_id} HTML conversion failed: {e}")
        return

    # Stage 3: Create OU in CSOD
    try:
        # Use standard CSOD Position ID (4)
        position_type_id = OU_TYPE_ID

        # Prepare externalId - must be unique for CSOD
        # Use only UUID without dashes, prefixed with TALENTFORGE for clarity
        clean_ref_id = f"TALENTFORGE_{result.jd_id.replace('-', '')}_{uuid.uuid4().hex[:8]}"
        
        # Set ou_ref_id in result for tracking (same as externalId for CSOD)
        result.ou_ref_id = clean_ref_id
        
        raw_name = jd.job_id or "Untitled"
        # name: use the JD job_id, max 1000 chars, no < >
        clean_name = "".join(c for c in raw_name if c not in "<>")[:1000]

        ou_payload = {
            "typeId": position_type_id,
            "active": True,
            "name": clean_name,
            "externalId": result.ou_ref_id,
            "parentId": None,
            "reconcilable": True,
            "description": html_content[:4000], 
            "customFields": [
                {
                    "id": 88,
                    "value": clean_ref_id
                },
                {
                    "id": 10,
                    "value": "Yes"
                },
                {
                    "id": 121,
                    "value": "Yes"
                },
                {
                    "id": 122,
                    "value": datetime.now(timezone.utc).strftime("%Y-%m-%d")
                }
            ]
        }

        url = f"{base.rstrip('/')}/services/api/x/organizations/v1/ous"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        for attempt in range(MAX_OU_RETRIES):
            try:
                response = await client.post(url, json=ou_payload, headers=headers)

                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    wait_time = float(retry_after) if retry_after else 2.0 ** (attempt + 1)
                    wait_time = min(wait_time, 8.0)
                    logger.warning(f"Rate limited for JD {jd_id}, attempt {attempt + 1}, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue

                if 200 <= response.status_code < 300:
                    ou_data = response.json()
                    data_block = ou_data.get("data") or ou_data
                    ou_id = (data_block.get("id")or data_block.get("Id")or data_block.get("ouId"))

                    # Parse CSOD response details
                    result.csod_response_timestamp = ou_data.get("timestamp")
                    links = data_block.get("links") or {}
                    if isinstance(links, dict):
                        result.csod_response_link = links.get("href")

                    if ou_id:
                        # Stage 4: Verify the OU actually exists in CSOD
                        verified = await verify_ou_creation(client, base, token, ou_id)
                        result.ou_id = str(ou_id)
                        result.created_at = datetime.now(timezone.utc)
                        if verified:
                            result.status = "success"
                            result.stage_of_failure = None
                            logger.info(f"JD {jd_id} → OU {ou_id} created and verified ✓")
                        else:
                            result.status = "failed"
                            result.stage_of_failure = "csod_verify"
                            result.our_error = "OU verification failed — GET returned non-200"
                            logger.error(f"JD {jd_id} OU {ou_id} verification failed")
                    else:
                        # CSOD returned 2xx but no OU ID — treat as failure
                        result.status = "failed"
                        result.stage_of_failure = "csod_create"
                        result.csod_http_status = response.status_code
                        result.csod_error_message = f"CSOD returned {response.status_code} but no OU ID. Body: {response.text[:500]}"
                        result.created_at = datetime.now(timezone.utc)
                        logger.error(f"JD {jd_id} CSOD returned {response.status_code} but no OU ID. Body: {response.text[:500]}")
                    return  # ← always exit after a 2xx response (success or no-id failure)

                else:
                    # HTTP error (4xx / 5xx)
                    try:
                        error_response = response.json()
                    except Exception:
                        error_response = response.text

                    result.status = "failed"
                    result.stage_of_failure = "csod_create"
                    result.csod_http_status = response.status_code
                    result.csod_error_message = str(error_response)[:1000]
                    result.created_at = datetime.now(timezone.utc)

                    if isinstance(error_response, dict):
                        result.csod_error_code = str(error_response.get("error", {}).get("code", ""))
                        result.csod_error_fields = error_response.get("error", {}).get("fields")

                    logger.error(
                        f"JD {jd_id} CSOD create failed HTTP {response.status_code}: "
                        f"{str(error_response)[:500]}"
                    )
                    return  #  non-retryable HTTP error, exit immediately

            except Exception as e:
                logger.error(f"JD {jd_id} network error attempt {attempt + 1}/{MAX_OU_RETRIES}: {e}")
                if attempt >= MAX_OU_RETRIES - 1:
                    result.status = "failed"
                    result.stage_of_failure = "csod_create"
                    result.our_error = f"Network error after {MAX_OU_RETRIES} retries: {e}"
                    result.created_at = datetime.now(timezone.utc)
                    return
                wait_time = min(2.0 ** attempt, 8.0)
                logger.warning(f"JD {jd_id} retrying in {wait_time}s (attempt {attempt + 2}/{MAX_OU_RETRIES})")
                await asyncio.sleep(wait_time)

    except Exception as e:
        result.status = "failed"
        result.stage_of_failure = "csod_create"
        result.our_error = f"Unexpected error in CSOD stage: {e}"
        result.created_at = datetime.now(timezone.utc)
        logger.error(f"JD {jd_id} unexpected CSOD stage error: {e}")


async def persist_result(db: AsyncSession, result: FoundationResult) -> None:
    """
    Persist every pipeline result to the CSODPipelinePush table.
    On success: also stamp csod_ou_id, csod_pushed_at, and status='pushed_to_csod' on the JD row.
    """
    from app.models.models import CSODPipelinePush

    logger.info(
        f"Pipeline result | jd_id={result.jd_id} status={result.status} "
        f"ou_id={result.ou_id} stage={result.stage_of_failure} error={result.our_error}")

    try:
        # 1) Insert a row into the push audit table
        push_record = CSODPipelinePush(
            org_id=uuid.UUID(result.org_id) if result.org_id else None,
            pushed_by=uuid.UUID(result.pushed_by) if result.pushed_by else None,
            pushed_by_name=result.pushed_by_name,
            jd_id=uuid.UUID(result.jd_id),
            pipeline_type="foundation",
            ou_ref_id=result.ou_ref_id,
            connection_name=result.connection_name,
            status=result.status,
            stage_of_failure=result.stage_of_failure,
            csod_ou_id=result.ou_id,
            csod_response_timestamp=result.csod_response_timestamp,
            csod_response_link=result.csod_response_link,
            our_error=result.our_error,
            csod_error_code=result.csod_error_code,
            csod_error_message=result.csod_error_message,
            csod_error_fields=result.csod_error_fields,
            csod_http_status=result.csod_http_status,
            pushed_at=result.created_at or datetime.now(timezone.utc),
        )
        db.add(push_record)

        # 2) On success, also update the JD row regardless of OU ID availability
        if result.status == "success":
            await db.execute(update(JobDescriptionModel).where(JobDescriptionModel.id == uuid.UUID(result.jd_id),JobDescriptionModel.org_id == uuid.UUID(result.org_id)).values(csod_ou_id=str(result.ou_id) if result.ou_id else None,csod_pushed_at=result.created_at or datetime.now(timezone.utc),status="pushed_to_csod",updated_at=datetime.now(timezone.utc)))
            logger.info(f"JD {result.jd_id} → stamped csod_ou_id={result.ou_id}, status=pushed_to_csod")
        await db.commit()
        # Ensure cache for this JD is invalidated so updates are visible quickly
        try:
            from app.services.cache_service import cache_service
            await cache_service.invalidate_jd_cache(str(result.jd_id))
            await cache_service.clear_cache_by_pattern(f"query:*{str(result.org_id)}*")
        except Exception:
            logger.debug(f"Failed to invalidate cache for JD {result.jd_id}")
    except Exception as e:
        logger.error(f"Failed to persist result for JD {result.jd_id}: {e}")
        await db.rollback()


@router.get("/push-records",response_model=List[CSODPipelinePushResponse],
    summary="List CSOD pipeline push records for your organisation",
    description=("Returns CSOD pipeline push records for your organisation.\n\n"))
async def get_pipeline_push_records(pipeline_type: Optional[str] = Query(None, description="Filter by pipeline type: 'foundation' or 'bulk'"),
    status: Optional[str] = Query(None, description="Filter by status: 'success' or 'failed'"),
    current_user: User = Depends(get_current_regular_user),db: AsyncSession = Depends(get_db)) -> List[CSODPipelinePushResponse]:
    """Get CSOD pipeline push records. Admins see all org records; others see only their own."""
    from app.models.models import CSODPipelinePush
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="No organisation linked to your account.")
    query = select(CSODPipelinePush).where(CSODPipelinePush.org_id == current_user.org_id)
    if not is_admin_or_super_admin(current_user):
        query = query.where(CSODPipelinePush.pushed_by == current_user.id)
    if pipeline_type:
        query = query.where(CSODPipelinePush.pipeline_type == pipeline_type)
    if status:
        query = query.where(CSODPipelinePush.status == status)
    query = query.order_by(CSODPipelinePush.pushed_at.desc())
    result = await db.execute(query)
    records = result.scalars().all()
    return [
        CSODPipelinePushResponse(
            id=str(r.id),
            org_id=str(r.org_id),
            pushed_by=str(r.pushed_by) if r.pushed_by else None,
            pushed_by_name=r.pushed_by_name,
            jd_id=str(r.jd_id),
            pipeline_type=r.pipeline_type,
            connection_name=r.connection_name,
            batch_id=getattr(r, 'batch_id', None),
            ou_ref_id=r.ou_ref_id,
            status=r.status,
            stage_of_failure=r.stage_of_failure,
            csod_ou_id=r.csod_ou_id,
            csod_response_timestamp=r.csod_response_timestamp,
            csod_response_link=r.csod_response_link,
            our_error=r.our_error,
            csod_error_code=r.csod_error_code,
            csod_error_message=r.csod_error_message,
            csod_http_status=r.csod_http_status,
            pushed_at=r.pushed_at.isoformat() if r.pushed_at else None,
        )
        for r in records
    ]


@router.post("/process",response_model=FoundationSummarySchema,summary="Push JDs to CSOD as Position OUs (Foundation Pipeline)",
    description=(
        "Push up to **150 Job Descriptions** to CSOD as individual Position OUs in parallel.\n\n"
        "**Prerequisites (must be done in order):**\n"
        "1. Authenticate → get Bearer token via POST /auth/login\n"
        "2. Save CSOD credentials → POST /csod/connect\n"
        "3. Test the connection (sets status=active) → POST /csod/test-connection\n"
        "4. Ensure JD UUIDs exist → POST /job-descriptions/generate\n\n"
        "The most recently tested active connection is used automatically unless connection_name is provided."))
@limiter.limit("10/minute")
async def process_foundation_jds(request: Request, body: FoundationPipelineRequest,current_user: User = Depends(get_current_regular_user),db: AsyncSession = Depends(get_db)) -> FoundationSummarySchema:
    """
    Process up to 150 JDs in parallel as individual Position OUs.
    Each JD is processed independently with isolated error handling.
    """
    # SECURITY: RBAC - Only Admin/Super_Admin can trigger foundation pipeline
    require_admin(current_user, detail="Only administrators can access the foundation pipeline.")
    jd_ids = body.jd_ids
    requested_connection = body.connection_name
    # Validate input
    if len(jd_ids) > 150:
        raise HTTPException(status_code=400, detail="Maximum 150 JDs allowed per foundation pipeline batch")
    logger.info(
        f"Starting foundation pipeline for {len(jd_ids)} JDs. "
        f"Requester IP: {request.client.host if request.client else 'unknown'}, "
        f"UA: {request.headers.get('user-agent', 'unknown')}"
    )

    # Resolve active CSOD connection for this org
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=401, detail="No organisation linked to your account.")
        conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
        active = [c for c in conns if c.status == "active"]
        # Filter by connection_name if specified
        if requested_connection:
            active = [c for c in active if c.connection_name == requested_connection]
            if not active:
                raise HTTPException(status_code=404, detail=f"No active CSOD connection named '{requested_connection}' found.")
        if not active:
            raise HTTPException(status_code=401, detail="No active CSOD connection found. Save one via POST /csod/connect and test it via POST /csod/test-connection.")

        credential = sorted(active, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]
        base = decrypt_str(credential.base_url_enc)
        token_url = decrypt_str(credential.auth_token_url_enc)
        client_id = decrypt_str(credential.client_id_enc)
        client_secret = decrypt_str(credential.client_secret_enc)
        scope = credential.scope or "ou:write"
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve CSOD credential: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication setup failed: {e}")

    # Fetch OAuth token from CSOD
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30.0) as token_client:
            resp = await token_client.post(token_url,
                data={"grant_type": "client_credentials", "client_id": client_id,"client_secret": client_secret, "scope": scope})
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"CSOD token fetch failed: HTTP {resp.status_code}")
            token = resp.json().get("access_token", "")
            if not token:
                raise HTTPException(status_code=502, detail="CSOD returned empty access_token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSOD token error: {e}")
        raise HTTPException(status_code=502, detail=f"Could not reach CSOD token endpoint: {e}")
    
    # Fetch JDs and Validate lengths - SECURITY: Filter by org_id
    try:
        uuids = [uuid.UUID(jid) for jid in jd_ids]
        result = await db.execute(select(JobDescriptionModel).where(JobDescriptionModel.id.in_(uuids),JobDescriptionModel.org_id == current_user.org_id))
        all_fetched_jds = result.scalars().all()
        
        # SECURITY: Log if user tried to access JDs from other orgs
        if len(all_fetched_jds) < len(uuids):
            found_ids = {str(jd.id) for jd in all_fetched_jds}
            missing_ids = [jid for jid in jd_ids if jid not in found_ids]
            if missing_ids:
                logger.warning(
                    f"SECURITY: User {current_user.id} ({current_user.email}) attempted to access "
                    f"{len(missing_ids)} JD(s) not in their org: {missing_ids[:5]}{'...' if len(missing_ids) > 5 else ''}"
                )
    except Exception as e:
        logger.error(f"Failed to fetch JDs: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # NEW: Validate JD lengths (Step 0)
    valid_jds_list, oversized_jds = check_jd_lengths(all_fetched_jds, max_chars=4000)
    valid_jd_map = {str(jd.id): jd for jd in valid_jds_list}

    # Process JDs in parallel
    import httpx as _httpx
    async with _httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        results = []
        tasks = []

        from app.models.models import CSODPipelinePush
        from sqlalchemy import func
        # Fetch global success count to ensure 'infinite' incrementing IDs
        push_count_result = await db.execute(select(func.count(CSODPipelinePush.id)))
        global_success_count = push_count_result.scalar() or 0

        for idx, jd_id in enumerate(jd_ids, start=global_success_count + 1):
            res = FoundationResult(jd_id=jd_id,created_at=datetime.now(timezone.utc),org_id=str(current_user.org_id) if current_user.org_id else None,pushed_by=str(current_user.id),pushed_by_name=current_user.full_name,connection_name=requested_connection or credential.connection_name)
            results.append(res)

            # Check if oversized
            oversized_info = next((o for o in oversized_jds if o["jd_id"] == jd_id), None)
            if oversized_info:
                res.status = "failed"
                res.stage_of_failure = "validation"
                res.our_error = oversized_info["error"]
                logger.warning(f"JD {jd_id} rejected: {oversized_info['error']}")
                continue

            # Check if missing
            jd_obj = valid_jd_map.get(jd_id)
            if not jd_obj:
                res.status = "failed"
                res.stage_of_failure = "fetch"
                res.our_error = "JD not found in database"
                continue

            # SECURITY: Sanitization - Strip internal watermark tags
            from app.repository.jd_repository import _clean_jd_watermarks
            _clean_jd_watermarks(jd_obj)

            # Add valid task with index
            tasks.append(process_single_jd(db, client, base, token, jd_id, res, jd_obj, batch_index=idx))

        # Execute valid tasks in parallel
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        # Build summary
        summary = FoundationSummary(total_submitted=len(jd_ids),total_succeeded=0,total_failed=0,failure_breakdown={},failed_jd_ids=[], failed_records=[])

        for result in results:
            await persist_result(db, result)
            logger.info(f"Result for JD {result.jd_id}: status={result.status}, ou_ref_id={result.ou_ref_id}")
            if result.status == "success":
                summary.total_succeeded += 1
            else:
                summary.total_failed += 1
                summary.failed_jd_ids.append(result.jd_id)
                error_msg = result.csod_error_message or result.our_error or "Unknown error"
                summary.failed_records.append({"jd_id": result.jd_id, "error": error_msg})
                stage = result.stage_of_failure or "unknown"
                summary.failure_breakdown[stage] = summary.failure_breakdown.get(stage, 0) + 1

        logger.info(
            f"Foundation pipeline completed: "
            f"Submitted={summary.total_submitted} "
            f"Succeeded={summary.total_succeeded} "
            f"Failed={summary.total_failed} "
            f"Breakdown={summary.failure_breakdown}"
        )

        return FoundationSummarySchema(total_submitted=summary.total_submitted,total_succeeded=summary.total_succeeded,
            total_failed=summary.total_failed,failure_breakdown=summary.failure_breakdown,failed_jd_ids=summary.failed_jd_ids, failed_records=summary.failed_records)
