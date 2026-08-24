from app.core.logging import get_logger
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.core.database import get_db
from app.core.http_client import get_http_client
from app.models.models import User
from app.services.dependencies import get_current_user, get_current_regular_user, require_admin, require_csod_staff
from app.repository import integration_repository as integration_repo

logger = get_logger()

router = APIRouter(prefix="/integrations", tags=["Integrations"],include_in_schema=False)


@router.get("/csod/status")
async def get_csod_status(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):
    """Return the current CSOD connection status for the user's organisation."""
    try:
        require_csod_staff(current_user, detail="Insufficient permissions")
        
        if not current_user.org_id:
            return {"connected": False, "message": "No organisation linked to your account"}

        conn = await integration_repo.get_csod_connection(db, current_user.org_id)

        if not conn:
            return {"connected": False, "message": "No CSOD connection configured"}

        return {
            "connected": conn.status == "active",
            "status": conn.status,
            "portal_url": conn.portal_url,
            "default_openings": conn.default_openings,
            "default_expiry_days": conn.default_expiry_days,
            "default_country": conn.default_country,
            "last_tested_at": conn.last_tested_at.isoformat() if conn.last_tested_at else None,
            "last_error": conn.last_error,
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("get_csod_status failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to retrieve CSOD connection status.",)


@router.post("/csod/connect")
async def connect_csod(data: dict,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user)):
    """Create or update a CSOD connection for the user's organisation."""
    require_admin(current_user)
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="You must be part of an organisation to connect CSOD",)

        portal_url = data.get("portal_url")
        client_id = data.get("client_id")
        client_secret = data.get("client_secret")

        if not all([portal_url, client_id, client_secret]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="portal_url, client_id, and client_secret are required",)

        conn = await integration_repo.upsert_csod_connection(db,org_id=current_user.org_id,portal_url=portal_url,client_id=client_id,client_secret=client_secret,default_openings=data.get("default_openings", 1),default_expiry_days=data.get("default_expiry_days", 90),default_country=data.get("default_country", "US"))

        return {"message": "CSOD connection saved successfully", "status": conn.status}

    except HTTPException:
        raise
    except Exception:
        logger.exception("connect_csod failed")
        await integration_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to save CSOD connection. Please try again.")


@router.post("/csod/test")
async def test_csod_connection(db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_regular_user),client: httpx.AsyncClient = Depends(get_http_client)):
    """Test the existing CSOD connection by attempting an OAuth token exchange."""
    require_admin(current_user)
    conn = None
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No organisation linked")

        conn = await integration_repo.get_csod_connection(db, current_user.org_id)

        if not conn:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="No CSOD connection found. Please configure one first.")

        token_url = f"{conn.portal_url.rstrip('/')}/services/api/oauth2/token"

        try:
            resp = await client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": conn.client_id,
                    "client_secret": conn.client_secret,
                    "scope": "requisition:manage",
                },
            )

            if resp.status_code == 200:
                await integration_repo.update_csod_test_result(db, conn, status="active")
                return {"success": True, "message": "Connection successful"}
            else:
                error_msg = resp.text[:500]
                await integration_repo.update_csod_test_result(db, conn, status="error", error=error_msg)
                return {"success": False, "message": f"Auth failed: {error_msg}"}

        except httpx.TimeoutException as exc:
            logger.warning("CSOD test timed out: %s", exc)
            await integration_repo.update_csod_test_result(db, conn, status="error", error=f"Connection timed out: {exc}")
            return {"success": False, "message": f"Connection timed out: {exc}"}

        except httpx.ConnectError as exc:
            logger.warning("CSOD test connection error: %s", exc)
            await integration_repo.update_csod_test_result(db, conn, status="error", error=f"Could not reach server: {exc}")
            return {"success": False, "message": f"Could not reach CSOD server: {exc}"}

        except Exception as exc:
            logger.exception("CSOD test unexpected error")
            await integration_repo.update_csod_test_result(db, conn, status="error", error=str(exc))
            return {"success": False, "message": f"Connection error: {exc}"}

    except HTTPException:
        raise
    except Exception:
        logger.exception("test_csod_connection failed")
        if conn:
            await integration_repo.rollback_db(db)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to test CSOD connection.")


@router.post("/csod/push")
async def push_jds_to_csod(data: dict,db: AsyncSession = Depends(get_db),current_user: User = Depends(get_current_user)):
    """
    Bulk push one or more finalised JDs to Cornerstone OnDemand.
    Expects: { "jd_ids": ["uuid1", "uuid2", ...] }
    """
    try:
        if not current_user.org_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No organisation linked")
        conn = await integration_repo.get_csod_connection(db, current_user.org_id)
        if not conn or conn.status != "active":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="No active CSOD connection. Please test your connection first.")
        jd_ids = data.get("jd_ids", [])
        if not jd_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No JD IDs provided")
        try:
            parsed_ids = [UUID(jid) for jid in jd_ids]
        except (ValueError, AttributeError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JD ID format: {exc}")
        jds = await integration_repo.get_final_jds_by_ids(db, parsed_ids, current_user.id)
        if not jds:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="No finalised JDs found for the given IDs",)
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,detail="CSOD push is not yet implemented. Please contact your administrator.",)
    except HTTPException:
        raise
    except Exception:
        logger.exception("push_jds_to_csod failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to push JDs to CSOD. Please try again.",)
