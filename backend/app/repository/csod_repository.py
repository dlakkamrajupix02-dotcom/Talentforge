from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ApplicationError
from app.models.models import CSODConnection, CSODOU, CSODPipelinePush


async def get_csod_pipeline_pushes_export(db: AsyncSession, org_id: UUID) -> list[CSODPipelinePush]:
    """Retrieve all CSOD pipeline push records for given organization."""
    try:
        result = await db.execute(select(CSODPipelinePush).where(CSODPipelinePush.org_id == org_id))
        return list(result.scalars().all())
    except SQLAlchemyError as exc:
        raise ApplicationError(503, "Could not read CSOD pipeline pushes from database.") from exc


async def get_connections_by_org(db: AsyncSession, org_id: UUID) -> list[CSODConnection]:
    try:
        result = await db.execute(select(CSODConnection).where(CSODConnection.org_id == org_id))
        return list(result.scalars().all())
    except SQLAlchemyError as exc:
        raise ApplicationError(503, "Could not read CSOD configuration from database.") from exc


async def get_connection_by_name(db: AsyncSession, *, org_id: UUID, connection_name: str) -> CSODConnection | None:
    try:
        result = await db.execute(select(CSODConnection).where(CSODConnection.org_id == org_id,CSODConnection.connection_name == connection_name))
        return result.scalar_one_or_none()
    except SQLAlchemyError as exc:
        raise ApplicationError(503, "Could not read CSOD configuration from database.") from exc


async def create_connection(db: AsyncSession,*,org_id: UUID,connection_name: str,base_url_enc: str,auth_token_url_enc: str,
    client_id_enc: str,client_secret_enc: str,scope: str,export_type: str,default_openings: int = 1,default_expiry_days: int = 90,default_country: str = "US") -> CSODConnection:
    try:
        conn = CSODConnection(org_id=org_id,connection_name=connection_name,base_url_enc=base_url_enc,auth_token_url_enc=auth_token_url_enc,
            client_id_enc=client_id_enc,client_secret_enc=client_secret_enc,scope=scope,export_type=export_type,
            default_openings=default_openings,default_expiry_days=default_expiry_days,default_country=default_country,status="pending")
        db.add(conn)

        await db.commit()
        await db.refresh(conn)
        return conn
    except ApplicationError:
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ApplicationError(503, "Could not save CSOD configuration in database.") from exc


async def patch_connection(db: AsyncSession,conn: CSODConnection,*,connection_name: str | None = None,base_url_enc: str | None = None,auth_token_url_enc: str | None = None,
    client_id_enc: str | None = None,client_secret_enc: str | None = None,scope: str | None = None,export_type: str | None = None,
    default_openings: int | None = None,default_expiry_days: int | None = None,default_country: str | None = None) -> CSODConnection:
    try:
        if connection_name is not None:
            conn.connection_name = connection_name
        if base_url_enc is not None:
            conn.base_url_enc = base_url_enc
        if auth_token_url_enc is not None:
            conn.auth_token_url_enc = auth_token_url_enc
        if client_id_enc is not None:
            conn.client_id_enc = client_id_enc
        if client_secret_enc is not None:
            conn.client_secret_enc = client_secret_enc
        if scope is not None:
            conn.scope = scope
        if export_type is not None:
            conn.export_type = export_type
        if default_openings is not None:
            conn.default_openings = default_openings
        if default_expiry_days is not None:
            conn.default_expiry_days = default_expiry_days
        if default_country is not None:
            conn.default_country = default_country

        conn.status = "pending"
        conn.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(conn)
        return conn
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ApplicationError(503, "Could not update CSOD configuration in database.") from exc


async def delete_connection(db: AsyncSession, conn: CSODConnection) -> None:
    try:
        await db.delete(conn)
        await db.commit()
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ApplicationError(503, "Could not delete CSOD configuration from database.") from exc


async def update_test_status(db: AsyncSession,conn: CSODConnection,*,status: str,error: str | None = None) -> CSODConnection:
    try:
        conn.status = status
        conn.last_tested_at = datetime.now(timezone.utc)
        conn.last_error = error
        await db.commit()
        await db.refresh(conn)
        return conn
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ApplicationError(503, "Could not update CSOD connection test status.") from exc


async def upsert_csod_ou(db: AsyncSession, org_id: UUID, ou_data: dict) -> CSODOU:
    """
    Inserts or updates a CSOD Organizational Unit in the database.
    """
    try:
        csod_id = int(ou_data.get("id", 0))
        if csod_id <= 0:
            raise ApplicationError(400, "Invalid CSOD OU ID in response.")

        # Check for existing record
        stmt = select(CSODOU).where(CSODOU.org_id == org_id, CSODOU.csod_ou_id == csod_id)
        result = await db.execute(stmt)
        ou = result.scalar_one_or_none()

        if not ou:
            ou = CSODOU(org_id=org_id, csod_ou_id=csod_id)
            db.add(ou)

        # Update fields
        ou.name = str(ou_data.get("name", "Unknown"))
        ou.type_id = int(ou_data.get("typeId", 0))
        ou.parent_id = ou_data.get("parentId")
        ou.active = bool(ou_data.get("active", True))
        ou.external_id = ou_data.get("externalId")
        ou.description = ou_data.get("description")
        ou.full_data = ou_data # Store the whole thing as received
        ou.last_fetched_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(ou)
        return ou
    except SQLAlchemyError as exc:
        await db.rollback()
        raise ApplicationError(503, "Could not save CSOD OU in database.") from exc
