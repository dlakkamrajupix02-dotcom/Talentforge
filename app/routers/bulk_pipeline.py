from __future__ import annotations
import asyncio
import uuid
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.core.exceptions import BadRequestError
from app.core.database import get_db
from app.core.crypto import decrypt_str
from app.core.rate_limiter import limiter
from app.models.models import JobDescription as JobDescriptionModel, BulkImportReport
from app.services.csod_service import format_jd_to_html, check_jd_lengths
from app.repository import organization_repository as org_repo
from app.services.dependencies import get_current_regular_user, require_admin
from app.repository import csod_repository
from app.models.models import User
from app.schemas.schemas import BulkPipelineRequest, BulkSummarySchema, BulkChunkResultSchema


logger = get_logger(__name__)

router = APIRouter(prefix="/bulk", tags=["Bulk Pipeline"])

DEFAULT_CHUNK_SIZE = 100
MAX_RECORDS_PER_IMPORT = 1_000_000
MAX_PAYLOAD_SIZE_MB = 20


@dataclass
class BulkChunkResult:
    """Result for a chunk of JDs in bulk processing."""
    chunk_id: str
    total_jds: int
    total_succeeded: int
    total_failed: int
    failure_breakdown: Dict[str, Any]
    successful_jd_ids: List[str] = None  # List of TalentForge JD UUIDs successfully "Loaded" by CSOD


@dataclass
class BulkResult:
    """Result for individual JD processing within bulk pipeline."""
    jd_id: str
    batch_id: str
    status: str = "pending"   
    created_at: datetime = None
    ou_id: Optional[str] = None
    stage_of_failure: Optional[str] = None
    our_error: Optional[str] = None
    csod_error_code: Optional[str] = None
    csod_error_message: Optional[str] = None
    csod_error_fields: Optional[List[Dict[str, Any]]] = None
    csod_http_status: Optional[int] = None


@dataclass
class BulkSummary:
    """Summary of bulk pipeline execution."""
    total_submitted: int
    total_succeeded: int
    total_failed: int
    batches_processed: int
    per_batch_results: List[BulkChunkResult]
    failed_jd_ids: List[str] = None


async def get_jd_by_id(db: AsyncSession, jd_id: str) -> Optional[JobDescriptionModel]:
    """Fetch JD by ID from TalentForge."""
    try:
        result = await db.execute(select(JobDescriptionModel).where(JobDescriptionModel.id == uuid.UUID(jd_id)))
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Failed to fetch JD {jd_id}: {e}")
        raise BadRequestError(f"Failed to fetch JD {jd_id}: {e}") from e


async def create_bulk_job(client, base: str, token: str, jd_data: List[Dict[str, Any]], job_number: int = 1) -> Dict[str, Any]:
    """Create bulk import job in CSOD."""
    label = f"Bulk Import from TalentForge #{job_number}"
    datetime.now(timezone.utc).isoformat()
    
    job_payload = {
        "label": label,
        "imports": [{
            "type": "ou.position",
            "label": f"Position Import #{job_number}",
            "settings": {
                "AllowInactiveOuAndUser": True,
                "AllowReconcile": False,
                "use_default_when_missing": True,
                "default_culture": "en-US",
                "datetime_culture": "en-US",
                "number_culture": "en-US",
            }
        }]
    }
    
    url = f"{base.rstrip('/')}/services/api/x/bulk-api/v1/jobs"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    try:
        response = await client.post(url, json=job_payload, headers=headers)

        if response.status_code not in (200, 201, 202):
            error_response = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            raise BadRequestError(f"Bulk job creation failed: HTTP {response.status_code}: {error_response}")

        job_data = response.json()
        return {
            "job_id": job_data.get("job_id"),
            "imports": job_data.get("imports", []),
        }
    except BadRequestError:
        raise
    except Exception as e:
        raise BadRequestError(f"Network error creating bulk job: {e}") from e


async def get_bulk_schema(client, base: str, token: str) -> Dict[str, Any]:
    """Step 2: Get Position Schema (Mandatory for initialization)."""
    url = f"{base.rstrip('/')}/services/api/x/bulk-api/v1/schemas"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "type": "ou.position",
        "include_protected_properties": True,
        "settings": {
            "default_culture": "en-US",
            "use_default_when_missing": True
        }
    }
    try:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code not in (200, 201):
            logger.error(f"Schema fetch failed: HTTP {response.status_code}")
            return {}
        return response.json()
    except Exception as e:
        logger.error(f"Schema fetch error: {e}")
        return {}


async def upload_chunk(client, base: str, token: str, import_id: str, chunk_data: List[Dict[str, Any]], jd_ids_in_chunk: List[str]) -> BulkChunkResult:
    """Upload a chunk of JDs to CSOD bulk import using the import_id from job creation."""
    chunk_id = str(uuid.uuid4())
    
    # Step 3: Upload to /imports/{import_id} (NOT job_id)
    url = f"{base.rstrip('/')}/services/api/x/bulk-api/v1/imports/{import_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    try:
        response = await client.post(url, json=chunk_data, headers=headers)
        
        if response.status_code not in (200, 201, 202, 204):
            error_response = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            # Mark all JDs in this chunk as failed with upload error
            failure_breakdown = {}
            for jd_id in jd_ids_in_chunk:
                failure_breakdown[jd_id] = {
                    "csod_error": f"Upload failed: HTTP {response.status_code}",
                    "csod_status": response.status_code,
                }
            return BulkChunkResult(
                chunk_id=chunk_id,
                total_jds=len(chunk_data),
                total_succeeded=0,
                total_failed=len(chunk_data),
                failure_breakdown=failure_breakdown,
            )
        
        response_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        logger.info(f"Chunk {chunk_id} upload acknowledged: {response_data.get('message', 'ok')}")
        
        return BulkChunkResult(
            chunk_id=chunk_id,
            total_jds=len(chunk_data),
            total_succeeded=0,  # Will be updated after job status check
            total_failed=0,     # Will be updated after job status check
            failure_breakdown={},
            successful_jd_ids=[],  # Will be populated after job status check
        )
    except Exception as e:
        logger.error(f"Chunk upload failed {chunk_id}: {e}")
        failure_breakdown = {}
        for jd_id in jd_ids_in_chunk:
            failure_breakdown[jd_id] = {
                "csod_error": f"Network error: {e}",
                "csod_status": None,
            }
        return BulkChunkResult(chunk_id=chunk_id,total_jds=len(chunk_data),total_succeeded=0,total_failed=len(chunk_data),failure_breakdown=failure_breakdown)


async def check_job_status(client, base: str, token: str, job_id: str) -> Dict[str, Any]:
    """Step 4: Check bulk job status via GET /jobs/{job_id}."""
    url = f"{base.rstrip('/')}/services/api/x/bulk-api/v1/jobs/{job_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Job status check failed: HTTP {response.status_code}")
            return {}
    except Exception as e:
        logger.error(f"Job status check error: {e}")
        return {}


async def get_import_report_with_retry(client, base: str, token: str, import_id: str, max_retries: int = 15, initial_delay: int = 10) -> Optional[str]:
    """Fetch CSV report for a specific import with retry logic.
    
    CSOD Bulk API returns CSV format. The report may not be immediately available
    after job completion, so we retry with exponential backoff.
    
    Returns the full CSV text if successful, None if all retries fail.
    """
    url = f"{base.rstrip('/')}/services/api/x/bulk-api/v1/imports/{import_id}/report"
    headers = {"Authorization": f"Bearer {token}"}
    for attempt in range(max_retries):
        try:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                csv_text = response.text
                logger.info(f"Successfully fetched CSV report for import {import_id} (attempt {attempt + 1}/{max_retries})")
                # Security: Do not log full CSV content - may contain sensitive data
                logger.debug(f"CSV Report length: {len(csv_text)} characters")
                return csv_text
            elif response.status_code == 404:
                # Report not ready yet, wait and retry
                delay = initial_delay * (2 ** attempt)  # Exponential backoff: 30, 60, 120, 240...
                logger.warning(f"Report not ready (404) for import {import_id} - retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(delay)
            else:
                logger.error(f"Error report fetch failed: HTTP {response.status_code}")
                if attempt == max_retries - 1:
                    return None
                await asyncio.sleep(initial_delay)
        except Exception as e:
            logger.error(f"Error report fetch error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                return None
            await asyncio.sleep(initial_delay)
    
    logger.error(f"Failed to fetch report after {max_retries} attempts for import {import_id}")
    return None


async def persist_bulk_results(db: AsyncSession,chunk_results: List[BulkChunkResult],current_user: User,connection_name: Optional[str] = None,pending_jd_ids: List[str] = None,ou_ref_id_map: Dict[str, str] = None) -> None:
    """
    Persist bulk pipeline results:
    1) Write each JD result to CSODPipelinePush audit table.
    2) On success: stamp csod_pushed_at and status='pushed_to_csod' on JD rows.
    3) On pending (status unknown): create failed verification records for tracking.
    """
    from app.models.models import CSODPipelinePush

    total = sum(cr.total_jds for cr in chunk_results)
    succeeded = sum(cr.total_succeeded for cr in chunk_results)
    failed = sum(cr.total_failed for cr in chunk_results)
    logger.info(f"Bulk pipeline results | total={total} succeeded={succeeded} failed={failed}")

    all_successful_ids = []
    all_failed_records = []
    all_pending_ids = pending_jd_ids or []

    for cr in chunk_results:
        # Successful JDs
        if cr.successful_jd_ids:
            all_successful_ids.extend(cr.successful_jd_ids)

        # Failed JDs from failure_breakdown
        for jd_id, failure_info in cr.failure_breakdown.items():
            # Only include if jd_id looks like a valid UUID (skip aggregate keys like "upload_failed")
            try:
                uuid.UUID(jd_id)
                all_failed_records.append((jd_id, failure_info))
            except (ValueError, AttributeError):
                logger.warning(f"Skipping non-UUID failure_breakdown key: {jd_id}")

    now = datetime.now(timezone.utc)
    try:
        # 1) Insert push audit rows for all successful JDs
        for jd_id in all_successful_ids:
            ou_ref_id = ou_ref_id_map.get(jd_id) if ou_ref_id_map else None
            push_record = CSODPipelinePush(org_id=current_user.org_id,pushed_by=current_user.id,pushed_by_name=current_user.full_name,jd_id=uuid.UUID(jd_id),
                pipeline_type="bulk",connection_name=connection_name,ou_ref_id=ou_ref_id,status="success",stage_of_failure=None,csod_ou_id=None,pushed_at=now)
            db.add(push_record)

        # Update JD rows for successful pushes
        if all_successful_ids:
            await db.execute(update(JobDescriptionModel).where(JobDescriptionModel.org_id == current_user.org_id,JobDescriptionModel.id.in_([uuid.UUID(j) for j in all_successful_ids]),).values(csod_pushed_at=now, status="pushed_to_csod", updated_at=now))
        for jd_id, failure_info in all_failed_records:
            ou_ref_id = ou_ref_id_map.get(jd_id) if ou_ref_id_map else None
            push_record = CSODPipelinePush(
                org_id=current_user.org_id,
                pushed_by=current_user.id,
                pushed_by_name=current_user.full_name,
                jd_id=uuid.UUID(jd_id),
                pipeline_type="bulk",
                connection_name=connection_name,
                ou_ref_id=ou_ref_id,
                status="failed",
                stage_of_failure="csod_create",
                csod_error_code=failure_info.get("csod_error_code"),
                csod_error_message=str(failure_info.get("csod_error", ""))[:1000],
                csod_http_status=failure_info.get("csod_status"),
                pushed_at=now,
            )
            db.add(push_record)

        # 3) Insert push audit rows for pending JDs (status unknown). The audit
        # status constraint supports success/failed only, so unknown verification
        # is recorded as a failed csod_verify stage and the JD remains push_to_csod.
        for jd_id in all_pending_ids:
            # Skip if already in success or failed lists
            if jd_id in all_successful_ids or any(fid == jd_id for fid, _ in all_failed_records):
                continue
            
            ou_ref_id = ou_ref_id_map.get(jd_id) if ou_ref_id_map else None
            push_record = CSODPipelinePush(
                org_id=current_user.org_id,
                pushed_by=current_user.id,
                pushed_by_name=current_user.full_name,
                jd_id=uuid.UUID(jd_id),
                pipeline_type="bulk",
                connection_name=connection_name,
                ou_ref_id=ou_ref_id,
                status="failed",
                stage_of_failure="csod_verify",
                csod_ou_id=None,
                csod_error_message="Job status could not be determined - pending verification",
                pushed_at=now,
            )
            db.add(push_record)

        if all_pending_ids:
            logger.info(f"Bulk Pipeline → created {len(all_pending_ids)} pending records for JDs with unknown status")
        
        if all_successful_ids:
            logger.info(f"Bulk Pipeline → stamped csod_pushed_at + status=pushed_to_csod for {len(all_successful_ids)} JDs ✓")

        await db.commit()
        # Invalidate JD caches for updated JDs so clients see changes immediately
        try:
            from app.services.cache_service import cache_service
            for jd_id in all_successful_ids:
                try:
                    await cache_service.invalidate_jd_cache(str(jd_id))
                except Exception:
                    logger.debug(f"Failed to invalidate cache for JD {jd_id}")
            # Clear any query caches related to this organisation
            await cache_service.clear_cache_by_pattern(f"query:*{str(current_user.org_id)}*")
        except Exception:
            logger.debug("Cache invalidation after bulk pipeline commit failed")
    except Exception as e:
        logger.error(f"Failed to persist bulk results: {e}")
        await db.rollback()


async def store_bulk_import_report(db: AsyncSession,csv_text: str,org_id: uuid.UUID,job_id: str,import_id: str,jd_id_map: Dict[str, str],  # Maps ouRefId to TalentForge JD ID
    all_jd_ids: List[str],  ou_ref_id_map: Dict[str, str] = None,  connection_name: Optional[str] = None) -> None:
    """
    Parse CSV report (contains only errors) and store both success and failure records.
    
    The CSV report from CSOD only contains rows with errors. JDs not in the report are successful.
    
    Args:
        csv_text: Full CSV report text from CSOD
        org_id: Organization ID
        job_id: CSOD job ID
        import_id: CSOD import ID
        jd_id_map: Dictionary mapping ouRefId to TalentForge JD UUID
        all_jd_ids: List of all JD IDs that were submitted for import
        connection_name: CSOD connection name
    """
    if not csv_text.strip():
        logger.warning("Empty CSV report - treating all JDs as successful")
        # If no report, treat all as successful
        for jd_id in all_jd_ids:
            try:
                ou_ref_id = ou_ref_id_map.get(jd_id) if ou_ref_id_map else None
                jd_uuid = uuid.UUID(jd_id)
                report_record = BulkImportReport(org_id=org_id,job_id=job_id,import_id=import_id,
                    jd_id=jd_uuid,report_data="No report available - treated as success",
                    loaded_status="Loaded",errors=None,warnings=None,
                    ou_ref_id=ou_ref_id,connection_name=connection_name)
                db.add(report_record)
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid JD ID {jd_id}: {e}")
        await db.commit()
        return
    
    try:
        reader = csv.DictReader(StringIO(csv_text))
        failed_jd_ids = set()
        rows_stored = 0
        
        # First, parse CSV to get failed JDs
        for row in reader:
            ou_ref_id = row.get("ouRefId", "").strip()
            errors = row.get("Errors", "").strip()
            
            # Find the corresponding JD ID from the map
            # Try exact match first, then try matching the JD ID part after "--"
            jd_id_str = jd_id_map.get(ou_ref_id)
            if not jd_id_str:
                # Try extracting JD ID from ouRefId if it contains "--"
                if "--" in ou_ref_id:
                    jd_part = ou_ref_id.split("--")[-1]
                    # Search for this JD ID in the map values
                    for ref_id, mapped_jd_id in jd_id_map.items():
                        if jd_part in mapped_jd_id:
                            jd_id_str = mapped_jd_id
                            break
            
            if not jd_id_str:
                logger.warning(f"No JD ID found for ouRefId {ou_ref_id} - skipping row")
                continue
            
            try:
                jd_uuid = uuid.UUID(jd_id_str)
                failed_jd_ids.add(jd_id_str)
                
                # Store failure record
                report_record = BulkImportReport(org_id=org_id,job_id=job_id,import_id=import_id,jd_id=jd_uuid,report_data=csv_text,loaded_status="Failed",
                    errors=errors if errors else "Unknown error",warnings=row.get("Warnings", "").strip(),ou_ref_id=ou_ref_id if ou_ref_id else None,connection_name=connection_name)
                db.add(report_record)
                rows_stored += 1
                
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid JD ID {jd_id_str} for ouRefId {ou_ref_id}: {e}")
                continue
        
        # Now, calculate successful JDs = all submitted - failed
        successful_jd_ids = set(all_jd_ids) - failed_jd_ids
        
        # Store success records for JDs not in the error report
        for jd_id in successful_jd_ids:
            try:
                ou_ref_id = ou_ref_id_map.get(jd_id) if ou_ref_id_map else None
                jd_uuid = uuid.UUID(jd_id)
                report_record = BulkImportReport(org_id=org_id,job_id=job_id,import_id=import_id,jd_id=jd_uuid,report_data=csv_text,loaded_status="Loaded",errors=None,warnings=None,ou_ref_id=ou_ref_id,connection_name=connection_name)
                db.add(report_record)
                rows_stored += 1
            except (ValueError, AttributeError) as e:
                logger.warning(f"Invalid JD ID {jd_id}: {e}")
        await db.commit()
        logger.info(f"Stored {rows_stored} bulk import report records ({len(successful_jd_ids)} success, {len(failed_jd_ids)} failed)")
    except Exception as e:
        logger.error(f"Failed to store bulk import report: {e}")
        await db.rollback()


async def _process_bulk_jds_impl(jd_ids: List[str],current_user: User,db: AsyncSession) -> BulkSummary:
    """
    Process up to 1,000 JDs as bulk imports with automatic chunking.
    """
    import httpx

    logger.info(f"Starting bulk pipeline for {len(jd_ids)} JDs")

    # Validate input
    if len(jd_ids) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1,000 JDs allowed per bulk pipeline batch")

    # Resolve active CSOD connection
    if not current_user.org_id:
        raise HTTPException(status_code=401, detail="No organisation linked to your account.")

    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    active = [c for c in conns if c.status == "active"]
    if not active:
        raise HTTPException(status_code=401, detail="No active CSOD connection. Configure and test one first.")
    credential = sorted(active, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]
    base = decrypt_str(credential.base_url_enc)
    token_url = decrypt_str(credential.auth_token_url_enc)
    client_id = decrypt_str(credential.client_id_enc)
    client_secret = decrypt_str(credential.client_secret_enc)
    scope = credential.scope or "ou:write"
    # Fetch OAuth token
    try:
        async with httpx.AsyncClient(timeout=30.0) as token_client:
            resp = await token_client.post(token_url,
                data={"grant_type": "client_credentials", "client_id": client_id,
                      "client_secret": client_secret, "scope": scope})
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"CSOD token fetch failed: HTTP {resp.status_code}")
            token = resp.json().get("access_token", "")
            if not token:
                raise HTTPException(status_code=502, detail="CSOD returned empty access_token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach CSOD token endpoint: {e}")
    
    # Fetch all JDs in a single query for efficiency - SECURITY: Filter by org_id
    try:
        uuids = [uuid.UUID(jid) for jid in jd_ids]
        result = await db.execute(select(JobDescriptionModel).where(
                JobDescriptionModel.id.in_(uuids),JobDescriptionModel.org_id == current_user.org_id))
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
        logger.error(f"Failed to fetch JDs from database: {e}")
        raise HTTPException(status_code=500, detail=f"Database fetch failed: {e}")

    # NEW: Validate JD lengths (Step 0) - COMMENTED OUT AS REQUESTED
    # valid_jds_list, oversized_jds = check_jd_lengths(all_fetched_jds, max_chars=4000)
    valid_jds_list = all_fetched_jds
    oversized_jds = []
    
    # Initialize result tracking
    chunk_results: List[BulkChunkResult] = []
    
    # Pre-populate failures for oversized JDs - COMMENTED OUT
    # if oversized_jds:
    #     logger.warning(f"Found {len(oversized_jds)} JDs exceeding 4000 character limit. Skipping them.")
    #     oversized_chunk = BulkChunkResult(
    #         chunk_id="Validation_Limit_Check",
    #         total_jds=len(oversized_jds),
    #         total_succeeded=0,
    #         total_failed=len(oversized_jds),
    #         failure_breakdown={
    #             item["jd_id"]: {
    #                 "csod_error": item["error"],
    #                 "csod_error_code": "LENGTH_EXCEEDED",
    #                 "csod_status": None
    #             } for item in oversized_jds
    #         }
    #     )
    #     chunk_results.append(oversized_chunk)

    # Map valid JDs for quick lookup
    valid_jd_map = {str(jd.id): jd for jd in valid_jds_list}
    jds_data = []
    successful_jd_ids = []

    for jd_id in jd_ids:
        jd = valid_jd_map.get(jd_id)
        if not jd:
            # If not in valid map, it's either oversized or missing
            continue
            
        from app.repository.jd_repository import _clean_jd_watermarks
        # SECURITY: Sanitization - Strip internal watermark tags before sending to CSOD
        _clean_jd_watermarks(jd)

        # Prepare fields according to strict schema rules
        raw_ref_id = jd.job_id if jd.job_id else str(jd.id)
        # ouRefId: max 100 chars, no < > '
        clean_ref_id = "".join(c for c in raw_ref_id if c not in "<>'")[:100]
        
        raw_name = jd.job_id or "Untitled"
        # ouName: use the JD job_id, max 1000 chars, no < >
        clean_name = "".join(c for c in raw_name if c not in "<>")[:1000]

        # Re-applying truncation to stay within CSOD's 4000 character limit
        description = format_jd_to_html(
            getattr(jd, "_content", None) or jd.content or {},
            sections_metadata=getattr(jd, "sections_metadata", None) or {},
        )
        
        # ouDescription: Strictly capped at 4000 characters
        clean_description = description[:4000]

        jds_data.append({
            "ouRefId": f"TALENTFORGE_{str(jd.id).replace('-', '')}_{uuid.uuid4().hex[:8]}",
            "ouName": clean_name,
            "active": True,
            "allowReconcile": False,
            "ouDescription": clean_description,
            "CF_Checkbox#10": True,
            "CF_Checkbox#121": False,
            "CF_LocalizedShortTextBox#88": clean_ref_id[:100],
            "CF_DateField#122": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
        successful_jd_ids.append(jd_id)
    
    # We use clean_ref_id mapping to track back to JD IDs
    ref_id_to_jd_id = {data["ouRefId"]: jd_id for jd_id, data in zip(jd_ids, jds_data) if data is not None}
    successful_jd_ids = list(ref_id_to_jd_id.values())
    jds_to_process = [data for data in jds_data if data is not None]

    if not jds_to_process:
        logger.warning("No valid JDs to process")
        return BulkSummary(total_submitted=len(jd_ids),total_succeeded=0,total_failed=len(jd_ids),
            batches_processed=0,per_batch_results=[],failed_jd_ids=jd_ids)

    chunks = [jds_to_process[i:i + DEFAULT_CHUNK_SIZE] for i in range(0, len(jds_to_process), DEFAULT_CHUNK_SIZE)]

    # Get current job count for sequential labeling
    from sqlalchemy import func, distinct
    from app.models.models import CSODPipelinePush
    try:
        stmt = select(func.count(distinct(CSODPipelinePush.pushed_at))).where(CSODPipelinePush.pipeline_type == "bulk")
        result = await db.execute(stmt)
        job_count = result.scalar() or 0
    except Exception:
        job_count = 0
    next_job_number = job_count + 1

    # Create bulk job and process chunks
    chunk_results: List[BulkChunkResult] = []
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        try:
            job_data = await create_bulk_job(client, base, token, jds_to_process, job_number=next_job_number)
            job_id = job_data.get("job_id")
            imports_data = job_data.get("imports", [])
            if not imports_data:
                raise HTTPException(status_code=502, detail="No imports found in bulk job creation response")
            # Extract import_id from the first import — this is what Step 3 uses
            import_id = imports_data[0].get("import_id")
            if not import_id:
                raise HTTPException(status_code=502, detail="No import_id in bulk job creation response")
            logger.info(f"Created bulk job {job_id}, import_id={import_id}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create bulk job: {e}")
            raise HTTPException(status_code=500, detail=f"Bulk job creation failed: {e}")

        # Step 2: Get Position Schema (Mandatory initialization)
        try:
            logger.info("Step 2: Initializing schema...")
            await get_bulk_schema(client, base, token)
        except Exception as e:
            logger.warning(f"Step 2 (Schema) warning: {e} — continuing anyway")

        # Step 3: Upload JDs in chunks to /imports/{import_id}
        logger.info(f"Uploading {len(jds_to_process)} JDs in {len(chunks)} chunks...")
        
        for i, chunk in enumerate(chunks):
            chunk_jd_ids = successful_jd_ids[i * DEFAULT_CHUNK_SIZE : (i + 1) * DEFAULT_CHUNK_SIZE]
            logger.info(f"Uploading chunk {i+1}/{len(chunks)} ({len(chunk)} JDs)...")
            chunk_result = await upload_chunk(client, base, token, import_id, chunk, chunk_jd_ids)
            chunk_results.append(chunk_result)

        # Step 4: Check job status — CSOD processes asynchronously
        # Poll for completion (with retries)
        max_status_retries = 12
        poll_interval = 15  # seconds
        job_status_data = {}
        
        # Terminal statuses that mean we should stop polling
        TERMINAL_STATUSES = ("Completed", "Failed", "Completed With Errors", "Error")

        for attempt in range(max_status_retries):
            await asyncio.sleep(poll_interval)
            job_status_data = await check_job_status(client, base, token, job_id)
            
            # Handle rate limiting (429) or connection issues
            if not job_status_data:
                logger.warning("Job status check returned no data (possibly 429 or network error) — slowing down...")
                await asyncio.sleep(poll_interval)
                continue

            imports_status = job_status_data.get("imports", [])
            if imports_status:
                current_status = imports_status[0].get("status")
                logger.info(f"Job {job_id} status: {current_status} — retry {attempt+1}/{max_status_retries}")
                
                if current_status in TERMINAL_STATUSES:
                    break

        # Parse job status results to determine per-JD success/failure
        if imports_status:
            imp = imports_status[0]
            imp_status = imp.get("status", "")
            successful_records = imp.get("successful_records", 0)
            error_records = imp.get("error_records", 0)
            logger.info(f"Job {job_id} final status: {imp_status}, success={successful_records}, errors={error_records}")

            if imp_status in ("Completed", "Completed With Errors"):
                if successful_records > 0:
                    # Mark the single chunk as successful if they didn't have structural upload errors
                    if chunk_result.total_failed == 0 and chunk_result.total_succeeded == 0:
                        chunk_result.total_succeeded = chunk_result.total_jds
                        chunk_result.successful_jd_ids = successful_jd_ids
            
            elif imp_status in ("Failed", "Error"):
                # Entire job failed structurally
                if chunk_result.total_succeeded == 0:
                    chunk_result.total_failed = chunk_result.total_jds
                    for jid in successful_jd_ids:
                        chunk_result.failure_breakdown[jid] = {
                            "csod_error": "Structural error in job processing.",
                            "csod_error_code": imp_status,
                            "csod_status": None,
                        }

            # Always try to fetch the CSV report regardless of error_records count
            # The report may take time to be available after job completion
            logger.info(f"Fetching CSV report for import {import_id} with retry logic...")
            csv_report = await get_import_report_with_retry(client, base, token, import_id, max_retries=15, initial_delay=10)
            
            # Create reverse mapping: JD ID -> ouRefId for store_bulk_import_report
            jd_id_to_ref_id = {jd_id: ref_id for ref_id, jd_id in ref_id_to_jd_id.items()}
            
            if csv_report:
                # Store the CSV report in the database
                logger.info(f"Storing CSV report in database for job {job_id}, import {import_id}")
                await store_bulk_import_report(db=db,csv_text=csv_report,org_id=current_user.org_id,job_id=job_id,ou_ref_id_map=jd_id_to_ref_id,
                    import_id=import_id,jd_id_map=ref_id_to_jd_id,all_jd_ids=successful_jd_ids, connection_name=credential.connection_name)
                
                # Parse CSV to determine individual JD success/failure
                reader = csv.DictReader(StringIO(csv_report))
                for row in reader:
                    ou_ref_id = row.get("ouRefId", "").strip()
                    loaded_status = row.get("Loaded", "").strip()
                    errors = row.get("Errors", "").strip()
                    
                    # Find the corresponding JD ID
                    failed_jd_uuid = ref_id_to_jd_id.get(ou_ref_id)
                    
                    if failed_jd_uuid:
                        # If there's an error or not loaded, mark as failed
                        if errors or loaded_status.lower() != "loaded":
                            # Mark failed JD in the single chunk
                            for idx, jd_id in enumerate(chunk_result.successful_jd_ids or []):
                                if str(jd_id) == str(failed_jd_uuid):
                                    chunk_result.successful_jd_ids.pop(idx)
                                    chunk_result.total_succeeded -= 1
                                    chunk_result.total_failed += 1
                                    chunk_result.failure_breakdown[str(failed_jd_uuid)] = {
                                        "csod_error": errors or "Not loaded",
                                        "csod_error_code": "CSV_ERROR",
                                        "csod_status": None,
                                    }
                                    break
            else:
                logger.warning(f"Could not fetch CSV report after retries for import {import_id}")
                # If we couldn't get the report but job completed with success count, trust the job status
                if imp_status in ("Completed", "Completed With Errors") and successful_records > 0:
                    if chunk_result.total_failed == 0 and chunk_result.total_succeeded == 0:
                        chunk_result.total_succeeded = successful_records
                        chunk_result.successful_jd_ids = successful_jd_ids[:successful_records]

        # If job status couldn't be determined, treat all acknowledged uploads as pending
        total_upload_acked = sum(1 for cr in chunk_results if cr.total_failed == 0 and cr.total_succeeded == 0)
        pending_jd_ids = []
        if total_upload_acked > 0 and not imports_status:
            logger.warning(f"Could not determine job status for {job_id} — treating {total_upload_acked} chunks as pending/unknown")
            # Collect all JD IDs from chunks that are still pending (0 succeeded, 0 failed)
            for cr in chunk_results:
                if cr.total_failed == 0 and cr.total_succeeded == 0 and cr.successful_jd_ids is not None:
                    pending_jd_ids.extend(cr.successful_jd_ids)

    # Persist / log results
    await persist_bulk_results(db, chunk_results, current_user, connection_name=credential.connection_name, pending_jd_ids=pending_jd_ids, ou_ref_id_map=jd_id_to_ref_id)

    total_succeeded = sum(cr.total_succeeded for cr in chunk_results)
    
    # Collect all failed JD IDs
    all_failed_ids = []
    # 1. From pre-check validation (oversized)
    for o in oversized_jds:
        all_failed_ids.append(o["jd_id"])
    
    # 2. From CSOD job results (structural or record errors)
    for cr in chunk_results:
        if cr.chunk_id != "Validation_Limit_Check":  # Already covered above
            # JDs in chunk_results.failure_breakdown are the failures
            for fid in cr.failure_breakdown.keys():
                # Ensure it's a valid JD ID (not an aggregate error key)
                try:
                    uuid.UUID(fid)
                    all_failed_ids.append(fid)
                except:
                    pass

    summary = BulkSummary(total_submitted=len(jd_ids),total_succeeded=total_succeeded,total_failed=len(all_failed_ids),batches_processed=len(chunks),per_batch_results=chunk_results,failed_jd_ids=all_failed_ids)

    logger.info(
        f"Bulk pipeline completed: Submitted={summary.total_submitted} "
        f"Succeeded={summary.total_succeeded} Failed={summary.total_failed} "
        f"Batches={summary.batches_processed}"
    )
    return summary


@router.post("/process",response_model=BulkSummarySchema,summary="Push JDs to CSOD via Bulk Import API",
    description=(
        "Push up to **1,000 Job Descriptions** to CSOD using the Bulk Import API with automatic chunking.\n\n"
        "**Prerequisites (must be done in order):**\n"
        "1. Authenticate → get Bearer token via POST /auth/login \n"
        "2. Save CSOD credentials → POST /csod/connect\n"
        "3. Test the connection (sets status=active) → POST /csod/test-connection \n"
        "4. Ensure JD UUIDs exist → POST /job-descriptions/generate \n\n"
        "JDs are processed in chunks of 100. The most recently tested active connection is used automatically "
        "unless connection_name is specified."
    ))
@limiter.limit("10/minute")
async def process_bulk_jds(request: Request, body: BulkPipelineRequest,current_user: User = Depends(get_current_regular_user),db: AsyncSession = Depends(get_db)) -> BulkSummarySchema:
    """
    Process up to 1,000 JDs as bulk imports with automatic chunking.
    Each chunk is processed independently with detailed error tracking.
    """
    # SECURITY: RBAC - Only Admin/Super_Admin can trigger bulk pipeline
    require_admin(current_user, detail="Only administrators can access the bulk push pipeline.")

    logger.info(
        f"Starting bulk pipeline for {len(body.jd_ids)} JDs. "
        f"Requester IP: {request.client.host if request.client else 'unknown'}, "
        f"UA: {request.headers.get('user-agent', 'unknown')}"
    )

    result = await _process_bulk_jds_impl(body.jd_ids, current_user, db)
    return BulkSummarySchema(
        total_submitted=result.total_submitted,
        total_succeeded=result.total_succeeded,
        total_failed=result.total_failed,
        batches_processed=result.batches_processed,
        per_batch_results=[
            BulkChunkResultSchema(chunk_id=cr.chunk_id,total_jds=cr.total_jds,total_succeeded=cr.total_succeeded,total_failed=cr.total_failed,failure_breakdown=cr.failure_breakdown)
            for cr in result.per_batch_results
        ],
        failed_jd_ids=result.failed_jd_ids or [])
