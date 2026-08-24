from __future__ import annotations
import asyncio
import re
import httpx
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.config import settings
from app.core.crypto import decrypt_str, encrypt_str
from app.core.logging import get_logger
from app.models.models import User, JobDescription as JobDescriptionModel, CSODPipelinePush
from sqlalchemy import select, func
from app.repository import csod_repository, jd_repository

logger = get_logger(__name__)

TRANSIENT_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}

# SSRF protection: only allow HTTPS URLs to known CSOD domains
_CSOD_URL_PATTERN = re.compile(r"^https://[a-zA-Z0-9._-]+\.csod\.com(/.*)?$")


def _validate_csod_url(url: str) -> None:
    """Reject URLs that don't point to a *.csod.com HTTPS endpoint."""
    if not _CSOD_URL_PATTERN.match(url):
        raise BadRequestError("base_url must be an HTTPS URL on a *.csod.com domain (e.g. https://yourportal.csod.com).")


def _required_str(data: dict, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise BadRequestError(f"'{key}' is required and must be a non-empty string.")
    return value.strip()


def _safe_error_text(response: httpx.Response) -> str:
    try:
        body = response.json()
        return str(body)[:900]
    except Exception:
        return (response.text or "No response body")[:900]


def _build_token_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/services/api/oauth2/token"


_csod_semaphore = asyncio.Semaphore(50)


async def _request_with_retry(client: httpx.AsyncClient,method: str,url: str,*,headers: dict[str, str] | None = None,data: dict | None = None,
    json_body: dict | None = None,timeout_s: float = 30.0,max_attempts: int = 5) -> httpx.Response:
    import random
    last_exc: Exception | None = None
    async with _csod_semaphore:
        for attempt in range(1, max_attempts + 1):
            try:
                resp = await client.request(method, url, headers=headers, data=data, json=json_body, timeout=timeout_s)
                if resp.status_code in TRANSIENT_STATUS_CODES and attempt < max_attempts:
                    backoff = min(2 ** attempt, 30)
                    jitter = random.uniform(0.5, 1.5)
                    await asyncio.sleep(backoff * jitter)  # exponential backoff with jitter
                    continue
                return resp
            except (httpx.TimeoutException, httpx.RequestError) as exc:
                last_exc = exc
                if attempt >= max_attempts:
                    break
                backoff = min(2 ** attempt, 30)
                jitter = random.uniform(0.5, 1.5)
                await asyncio.sleep(backoff * jitter)  # exponential backoff with jitter
        raise BadRequestError(f"CSOD request failed after {max_attempts} attempts: {last_exc}")


async def create_position_pipeline(data: dict, client: httpx.AsyncClient) -> dict:
    """
    One-shot pipeline that returns step-by-step results.
    Stops at first failure, but includes the partial results collected so far.
    """
    results: dict = {"steps": []}

    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    client_id = _required_str(data, "client_id")
    client_secret = _required_str(data, "client_secret")
    scope = str(data.get("scope") or "").strip() or settings.csod_default_scope.strip() or "ou:write ou:read"

    # Step 1: token
    token_url = _build_token_url(base_url)
    form = {"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret, "scope": scope}
    try:
        resp = await _request_with_retry(client, "POST", token_url, data=form)
        if resp.status_code != 200:
            raise BadRequestError(f"token_failed_http_{resp.status_code}: {_safe_error_text(resp)}")
        payload = resp.json()
        token = payload.get("access_token")
        if not isinstance(token, str) or not token.strip():
            raise BadRequestError("token_missing_access_token")
        results["steps"].append({"step": "token", "success": True})
    except Exception as exc:
        results["steps"].append({"step": "token", "success": False, "error": str(exc)})
        return results

    # Step 2: Use constant position type ID (Position = 4)
    detected_type_id = 4
    results["steps"].append({"step": "detect_type", "success": True, "detected_typeId": detected_type_id})

    # Step 3: create position
    type_id = data.get("typeId") if isinstance(data.get("typeId"), int) else detected_type_id
    name = str(data.get("name") or "talentForge").strip() or "talentForge"
    parent_id = data.get("parentId")
    if parent_id is not None and (not isinstance(parent_id, int) or parent_id <= 0):
        results["steps"].append({"step": "create_position", "success": False, "error": "parentId must be null or a positive integer"})
        return results
    description = str(data.get("description") or "")

    create_url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/ous"
    body = {"typeId": type_id, "name": name, "parentId": parent_id, "description": description}
    try:
        resp = await _request_with_retry(client, "POST", create_url, headers={"Authorization": f"Bearer {token}"}, json_body=body)
        if resp.status_code not in (200, 201):
            raise BadRequestError(f"create_failed_http_{resp.status_code}: {_safe_error_text(resp)}")
        created = resp.json()
        results["steps"].append(
            {
                "step": "create_position",
                "success": True,
                "used_typeId": type_id,
                "response": created,
            }
        )
        return results
    except Exception as exc:
        results["steps"].append({"step": "create_position", "success": False, "error": str(exc), "used_typeId": type_id})
        return results

async def get_connection_status(db: AsyncSession, current_user: User) -> dict:
    if not current_user.org_id:
        return {"connected": False, "message": "No organisation linked to your account."}

    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    if not conns:
        return {"connected": False, "message": "No CSOD connection configured."}

    connected_any = any(c.status == "active" for c in conns)
    return {
        "connected": connected_any,
        "connections": [
            {
                "connection_name": c.connection_name,
                "status": c.status,
                "export_type": c.export_type,
                "default_openings": c.default_openings,
                "default_expiry_days": c.default_expiry_days,
                "default_country": c.default_country,
                "last_tested_at": c.last_tested_at.isoformat() if c.last_tested_at else None,
                "last_error": c.last_error,
            }
            for c in conns
        ],
    }


async def save_connection(db: AsyncSession, current_user: User, data: dict) -> dict:
    if not current_user.org_id:
        raise BadRequestError("You must be part of an organisation to connect CSOD.")

    connection_name = _required_str(data, "connection_name")
    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    client_id = _required_str(data, "client_id")
    client_secret = _required_str(data, "client_secret")
    scope = str(data.get("scope") or "").strip() or settings.csod_default_scope.strip() or "ou:write"
    export_type_raw = data.get("export_type") or "Foundation"
    export_type = getattr(export_type_raw, "value", export_type_raw)
    export_type = str(export_type).strip() or "Foundation"
    auth_token_url = str(data.get("auth_token_url") or "").strip() or _build_token_url(base_url)
    existing = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=connection_name)
    if existing:
        raise BadRequestError(f"CSOD connection '{connection_name}' already exists for your organisation.")

    conn = await csod_repository.create_connection(db,org_id=current_user.org_id,connection_name=connection_name,base_url_enc=encrypt_str(base_url),
        auth_token_url_enc=encrypt_str(auth_token_url),client_id_enc=encrypt_str(client_id),client_secret_enc=encrypt_str(client_secret),scope=scope,
        export_type=export_type,default_openings=int(data.get("default_openings", 1)),default_expiry_days=int(data.get("default_expiry_days", 90)),default_country=str(data.get("default_country", "US")).strip() or "US")
    return {"message": "CSOD connection saved successfully.", "status": conn.status, "connection_name": conn.connection_name}


async def get_connection(db: AsyncSession, current_user: User, connection_name: str) -> dict:
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    conn = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=connection_name)
    if not conn:
        raise NotFoundError("No CSOD connection found with that name.")

    decrypted_id = decrypt_str(conn.client_id_enc)
    decrypted_secret = decrypt_str(conn.client_secret_enc)

    return {
        "connection_name": conn.connection_name,
        "base_url": decrypt_str(conn.base_url_enc),
        "auth_token_url": decrypt_str(conn.auth_token_url_enc),
        "client_id": decrypted_id[:4] + "****" + decrypted_id[-4:] if len(decrypted_id) > 8 else "****",
        "client_secret": "****" + decrypted_secret[-4:] if len(decrypted_secret) > 4 else "****",
        "scope": conn.scope,
        "export_type": conn.export_type,
        "status": conn.status,
        "default_openings": conn.default_openings,
        "default_expiry_days": conn.default_expiry_days,
        "default_country": conn.default_country,
        "last_tested_at": conn.last_tested_at.isoformat() if conn.last_tested_at else None,
        "last_error": conn.last_error,
    }


async def patch_connection(db: AsyncSession, current_user: User, connection_name: str, data: dict) -> dict:
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    conn = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=connection_name)
    if not conn:
        raise NotFoundError("No CSOD connection found with that name.")

    new_name = data.get("connection_name")
    if isinstance(new_name, str):
        new_name = new_name.strip()
        if new_name and new_name != connection_name:
            exists = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=new_name)
            if exists:
                raise BadRequestError(f"CSOD connection '{new_name}' already exists for your organisation.")
    else:
        new_name = None

    base_url = data.get("base_url")
    auth_token_url = data.get("auth_token_url")
    if isinstance(base_url, str) and base_url.strip() and not (isinstance(auth_token_url, str) and auth_token_url.strip()):
        # If base_url changes and token url not supplied, recompute default.
        auth_token_url = _build_token_url(base_url.strip())

    updated = await csod_repository.patch_connection(db,conn,connection_name=new_name,base_url_enc=encrypt_str(base_url.strip()) if isinstance(base_url, str) and base_url.strip() else None,
        auth_token_url_enc=encrypt_str(auth_token_url.strip())
        if isinstance(auth_token_url, str) and auth_token_url.strip()
        else None,
        client_id_enc=encrypt_str(data["client_id"].strip()) if isinstance(data.get("client_id"), str) and data["client_id"].strip() else None,
        client_secret_enc=encrypt_str(data["client_secret"].strip())
        if isinstance(data.get("client_secret"), str) and data["client_secret"].strip()
        else None,
        scope=str(data.get("scope")).strip() if isinstance(data.get("scope"), str) and str(data.get("scope")).strip() else None,
        export_type=(
            str(getattr(data.get("export_type"), "value", data.get("export_type"))).strip()
            if data.get("export_type") is not None
            and str(getattr(data.get("export_type"), "value", data.get("export_type"))).strip()
            else None),
        default_openings=data.get("default_openings") if isinstance(data.get("default_openings"), int) else None,
        default_expiry_days=data.get("default_expiry_days") if isinstance(data.get("default_expiry_days"), int) else None,
        default_country=str(data.get("default_country")).strip()
        if isinstance(data.get("default_country"), str) and str(data.get("default_country")).strip()
        else None)
    return {"message": "CSOD connection updated successfully.", "connection_name": updated.connection_name, "status": updated.status}


async def delete_connection(db: AsyncSession, current_user: User, connection_name: str) -> dict:
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    conn = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=connection_name)
    if not conn:
        raise NotFoundError("No CSOD connection found with that name.")

    await csod_repository.delete_connection(db, conn)
    return {"message": "CSOD connection deleted successfully."}


async def fetch_token_direct(data: dict, client: httpx.AsyncClient) -> dict:
    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    token_url = _build_token_url(base_url)
    form = {
        "grant_type": "client_credentials",
        "client_id": _required_str(data, "client_id"),
        "client_secret": _required_str(data, "client_secret"),
        "scope": (data.get("scope") or "ou:write"),
    }
    try:
        response = await client.post(token_url, data=form)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD token request failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD token endpoint: {exc}") from exc


async def fetch_token_from_connection(db: AsyncSession, current_user: User, client: httpx.AsyncClient, data: dict) -> dict:
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    connection_name = _required_str(data, "connection_name")
    conn = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=connection_name)
    if not conn:
        raise NotFoundError("No CSOD connection found. Configure connection first.")

    token_url = decrypt_str(conn.auth_token_url_enc)
    scope = str(data.get("scope") or "").strip() or (conn.scope or "").strip() or settings.csod_default_scope.strip() or "ou:write"
    form = {
        "grant_type": "client_credentials",
        "client_id": decrypt_str(conn.client_id_enc),
        "client_secret": decrypt_str(conn.client_secret_enc),
        "scope": scope,
    }
    try:
        response = await client.post(token_url, data=form)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD token-from-connection failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD token endpoint: {exc}") from exc


async def test_connection(db: AsyncSession, current_user: User, client: httpx.AsyncClient) -> dict:
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    # Keep behavior: test the most recently updated connection if multiple exist.
    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    if not conns:
        raise NotFoundError("No CSOD connection found. Please configure one first.")
    conn = sorted(conns, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]

    token_url = decrypt_str(conn.auth_token_url_enc)
    try:
        response = await client.post(token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": decrypt_str(conn.client_id_enc),
                "client_secret": decrypt_str(conn.client_secret_enc),
                "scope": conn.scope or "all",
            })
        if response.status_code == 200:
            await csod_repository.update_test_status(db, conn, status="active")
            return {"success": True, "message": "Connection successful."}

        error = _safe_error_text(response)
        await csod_repository.update_test_status(db, conn, status="error", error=error)
        return {"success": False, "message": f"Auth failed: {error}"}
    except httpx.RequestError as exc:
        await csod_repository.update_test_status(db, conn, status="error", error=str(exc))
        return {"success": False, "message": f"Connection error: {exc}"}


async def check_position_type(data: dict, client: httpx.AsyncClient) -> dict:
    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    token = _required_str(data, "token")
    url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/types"
    try:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()
        payload = response.json()
        for record in payload.get("data", []):
            if str(record.get("name", "")).lower() == "position":
                return record
        raise NotFoundError("No OU type with name 'Position' found.")
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD check-position failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD types endpoint: {exc}") from exc


async def get_position(data: dict, client: httpx.AsyncClient) -> dict:
    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    token = _required_str(data, "token")
    position_id = data.get("position_id")
    if not isinstance(position_id, int) or position_id <= 0:
        raise BadRequestError("'position_id' must be a positive integer.")

    url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/ous/{position_id}"
    try:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD get-position failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD OU endpoint: {exc}") from exc


async def create_position(data: dict, client: httpx.AsyncClient) -> dict:
    base_url = _required_str(data, "base_url")
    _validate_csod_url(base_url)
    token = _required_str(data, "token")
    type_id = data.get("typeId")
    parent_id = data.get("parentId")
    name = _required_str(data, "name")
    description = str(data.get("description", ""))
    external_id = data.get("externalId")
    active = data.get("active", True)
    reconcilable = data.get("reconcilable", True)
    custom_fields = data.get("customFields", [])

    if not isinstance(type_id, int) or type_id <= 0:
        raise BadRequestError("'typeId' must be a positive integer.")
    
    # Allow parent_id to be None or empty
    if parent_id is not None and parent_id != "" and (not isinstance(parent_id, int) or parent_id <= 0):
        raise BadRequestError("'parentId' must be null, empty, or a positive integer.")
    if parent_id == "":
        parent_id = None

    url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/ous"
    body = {
        "typeId": type_id,
        "active": active,
        "name": name,
        "externalId": external_id,
        "parentId": parent_id,
        "reconcilable": reconcilable,
        "description": description,
        "customFields": custom_fields
    }
    try:
        response = await client.post(url, headers={"Authorization": f"Bearer {token}"}, json=body)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD create-position failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD OU endpoint: {exc}") from exc
async def bulk_create_ous(db: AsyncSession, current_user: User, client: httpx.AsyncClient, data: dict) -> dict:
    """Bulk create OUs in CSOD."""
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    conn_name = data.get("connection_name")
    ous = data.get("ous", [])
    type_id = data.get("typeId")

    # SECURITY: Multi-tenant isolation - ensure connection belongs to the organization
    conn = await csod_repository.get_connection_by_name(db, org_id=current_user.org_id, connection_name=conn_name)
    if not conn:
        raise NotFoundError(f"CSOD connection '{conn_name}' not found for your organisation.")

    # Get token
    token_resp = await fetch_token_from_connection(db, current_user, client, {"connection_name": conn_name})
    token = token_resp["access_token"]
    base_url = decrypt_str(conn.base_url_enc)

    # If type_id not provided, use standard CSOD Position ID (4)
    if not type_id:
        type_id = 4

    results = []
    for ou in ous:
        ou_name = ou.get("name")
        parent_id = ou.get("parentId")
        description = ou.get("description", "")
        
        try:
            res = await create_position({
                "base_url": base_url,
                "token": token,
                "typeId": type_id,
                "active": ou.get("active", True),
                "name": ou_name,
                "externalId": ou.get("externalId"),
                "parentId": parent_id,
                "reconcilable": ou.get("reconcilable", True),
                "description": description,
                "customFields": ou.get("customFields", [])
            }, client)
            results.append({"name": ou_name, "success": True, "data": res})
        except Exception as e:
            results.append({"name": ou_name, "success": False, "error": str(e)})

    return {
        "summary": {
            "total": len(ous),
            "success": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]])
        },
        "results": results
    }


def _is_stable_section_key(key: str) -> bool:
    return bool(re.match(r"^section_\d+$", str(key or "").strip()))


def _section_points(section_data: Any) -> list[str]:
    """Normalize stable section_data into display strings."""
    if section_data is None:
        return []
    if isinstance(section_data, str):
        text = section_data.strip()
        return [text] if text else []
    if isinstance(section_data, list):
        points: list[str] = []
        for item in section_data:
            if isinstance(item, dict):
                point = str(item.get("point") or item.get("text") or item.get("title") or "").strip()
                weight = item.get("weight")
                if point:
                    points.append(f"{point} - {weight}%" if weight is not None else point)
            else:
                text = str(item).strip()
                if text:
                    points.append(text)
        return points
    if isinstance(section_data, dict):
        point = str(section_data.get("point") or section_data.get("text") or "").strip()
        return [point] if point else []
    text = str(section_data).strip()
    return [text] if text else []


def _render_section_html(title: str, section_data: Any, max_content_chars: int) -> str:
    """Render one CSOD section block with a content character budget."""
    title = str(title or "Section").strip()
    header = f"<b>{title.upper()}</b><br/>"
    budget = max(40, max_content_chars - len(header) - 10)
    if budget <= 0:
        return header + "<br/>"

    points = _section_points(section_data)
    if points:
        items: list[str] = ["<ul>"]
        for point in points:
            if budget <= 0:
                break
            clean = point[:budget]
            items.append(f"<li>{clean}</li>")
            budget -= len(clean) + 10
        items.append("</ul>")
        body = "".join(items)
    else:
        body = ""
    return header + body + "<br/>"


def format_jd_to_html(content: dict, max_chars: int = 4000, sections_metadata: dict | None = None) -> str:
    """
    Transform stable JD content into HTML for CSOD.
    Includes every section with metadata.push_to_csod=true and non-empty data,
    allocating character budget evenly so later sections are not dropped entirely.
    """
    content = dict(content or {})
    sections_metadata = sections_metadata or {}

    sections_order = content.get("sections_order") or sorted(
        [k for k in content.keys() if _is_stable_section_key(k)],
        key=lambda k: int(k.split("_")[1]),
    )

    eligible: list[tuple[str, Any]] = []
    for key in sections_order:
        if not _is_stable_section_key(key):
            continue
        sec_obj = content.get(key)
        if not isinstance(sec_obj, dict):
            continue

        push_csod = sec_obj.get("metadata", {}).get("push_to_csod")
        if push_csod is None:
            per_meta = sections_metadata.get(key)
            if isinstance(per_meta, dict):
                push_csod = per_meta.get("push_to_csod")
        if push_csod is False:
            continue

        section_data = sec_obj.get("section_data")
        if not _section_points(section_data):
            continue

        title = sec_obj.get("name") or (sections_metadata.get("labels") or {}).get(key) or key
        eligible.append((str(title), section_data))

    if not eligible:
        return ""

    # Reserve space for each section header so every pushed section appears in CSOD
    header_overhead = sum(len(title) + 60 for title, _ in eligible)
    remaining = max(max_chars - header_overhead, len(eligible) * 80)
    per_section_budget = max(80, remaining // len(eligible))

    html_parts = [_render_section_html(title, data, per_section_budget) for title, data in eligible]
    combined = "".join(html_parts)
    if len(combined) <= max_chars:
        return combined

    # Final proportional trim while keeping every section header present
    ratio = max_chars / len(combined)
    trimmed = [
        _render_section_html(title, data, max(60, int(per_section_budget * ratio)))
        for title, data in eligible
    ]
    return "".join(trimmed)[:max_chars]


def check_jd_lengths(jds: List[JobDescriptionModel], max_chars: int = 4000) -> tuple[List[JobDescriptionModel], List[Dict[str, Any]]]:
    """
    Separates JDs into valid and oversized lists based on CSOD HTML output length.
    Returns (valid_jds, oversized_info_list).
    """
    valid = []
    oversized = []
    for jd in jds:
        html_length = len(format_jd_to_html(
            getattr(jd, "_content", None) or jd.content or {},
            max_chars=max_chars,
            sections_metadata=getattr(jd, "sections_metadata", None) or {},
        ))

        if html_length > max_chars:
            oversized.append({
                "jd_id": str(jd.id),
                "job_id": jd.job_id or "N/A",
                "title": jd.title or "Untitled",
                "length": html_length,
                "error": f"CSOD HTML length ({html_length}) exceeds CSOD limit of {max_chars} characters."
            })
        else:
            valid.append(jd)
    return valid, oversized


async def push_jd_to_csod(db: AsyncSession, current_user: User, client: httpx.AsyncClient, data: dict, batch_index: int | None = None) -> dict:
    """Push a Job Description to CSOD as a Position OU."""
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    jd_id = data.get("jd_id")
    conn_name = data.get("connection_name")
    parent_id = data.get("parentId")

    jd = await jd_repository.get_jd_by_id_and_org(db, jd_id=jd_id, org_id=current_user.org_id)
    if not jd:
        raise NotFoundError("Job Description not found.")

    # SECURITY: Sanitization - Strip internal watermark tags
    from app.repository.jd_repository import _clean_jd_watermarks
    _clean_jd_watermarks(jd)

    # Transform JD content to clean HTML for CSOD
    final_description = format_jd_to_html(
        getattr(jd, "_content", None) or jd.content or {},
        sections_metadata=getattr(jd, "sections_metadata", None) or {},
    )

    # Fetch global success count for 'infinite' IDs
    if batch_index is None:
        push_count_result = await db.execute(
            select(func.count(CSODPipelinePush.id))
        )
        global_success_count = push_count_result.scalar() or 0
        target_index = global_success_count + 1
    else:
        target_index = batch_index

    import uuid
    clean_ref_id = f"TALENTFORGE_{target_index:02d}_{uuid.uuid4().hex[:8]}"

    from datetime import datetime, timezone

    # Create the position
    bulk_data = {
        "connection_name": conn_name,
        "ous": [
            {
                "active": True,
                "name": f"{jd.title} -- {str(jd.id)}",
                "externalId": clean_ref_id,
                "parentId": parent_id,
                "reconcilable": True,
                "description": final_description,
                "customFields": [
                    {"id": 88, "value": clean_ref_id},
                    {"id": 10, "value": "Yes"},
                    {"id": 121, "value": "Yes"},
                    {"id": 122, "value": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
                ]
            }
        ]
    }
    
    res = await bulk_create_ous(db, current_user, client, bulk_data)
    result = res["results"][0]

    if result.get("success"):
        payload = result.get("data") or {}
        data_block = payload.get("data") if isinstance(payload, dict) else None
        data_block = data_block if isinstance(data_block, dict) else payload
        ou_id = None
        if isinstance(data_block, dict):
            ou_id = data_block.get("id") or data_block.get("Id") or data_block.get("ouId")

        await jd_repository.update_job_description(
            db,
            jd=jd,
            update_data={
                "csod_ou_id": str(ou_id) if ou_id else None,
                "csod_pushed_at": datetime.now(timezone.utc),
                "status": "pushed_to_csod",
            },
        )
        logger.info("JD %s pushed to CSOD and marked pushed_to_csod", jd_id)

    return result


async def bulk_push_jds(db: AsyncSession, current_user: User, client: httpx.AsyncClient, data: dict) -> dict:
    """Bulk push multiple Job Descriptions to CSOD."""
    conn_name = data.get("connection_name")
    jds_to_push = data.get("jds", [])
    
    # Fetch global success count for 'infinite' IDs
    push_count_result = await db.execute(select(func.count(CSODPipelinePush.id)))
    global_success_count = push_count_result.scalar() or 0

    results = []
    for idx, item in enumerate(jds_to_push, start=global_success_count + 1):
        try:
            res = await push_jd_to_csod(db, current_user, client, {
                "jd_id": item["jd_id"],
                "connection_name": conn_name,
                "parentId": item["parentId"]
            }, batch_index=idx)
            results.append({"jd_id": item["jd_id"], "success": True, "data": res})
        except Exception as e:
            results.append({"jd_id": item["jd_id"], "success": False, "error": str(e)})

    return {
        "summary": {
            "total": len(jds_to_push),
            "success": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]])
        },
        "results": results
    }

async def fetch_and_store_ou(db: AsyncSession, current_user: User, client: httpx.AsyncClient, ou_id: int) -> dict:
    """
    Fetches an OU from CSOD by ID, stores it in the database, and returns the response.
    """
    payload = await get_ou_details_by_id(db, current_user, client, ou_id)
    ou_data = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
    # Store in database
    await csod_repository.upsert_csod_ou(db, current_user.org_id, ou_data)
    return payload


async def get_ou_details_by_id(db: AsyncSession, current_user: User, client: httpx.AsyncClient, ou_id: int, connection_name: str | None = None) -> dict:
    """
    Fetches an OU from CSOD by ID using the active connection or specified connection name.
    Does NOT store it in the database.
    """
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    # Get the connections
    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    if not conns:
        raise NotFoundError("No CSOD connection configured for your organisation.")
    
    if connection_name:
        conn = next((c for c in conns if c.connection_name == connection_name), None)
        if not conn:
            raise NotFoundError(f"CSOD connection '{connection_name}' not found.")
    else:
        # Use the most recently updated active connection
        active_conns = [c for c in conns if c.status == "active"]
        if not active_conns:
            raise BadRequestError("No active CSOD connection found. Please test your connection first.")
        conn = sorted(active_conns, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]
    
    # Get token
    token_resp = await fetch_token_from_connection(db, current_user, client, {"connection_name": conn.connection_name})
    token = token_resp["access_token"]
    base_url = decrypt_str(conn.base_url_enc)

    # Fetch from CSOD
    url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/ous/{ou_id}"
    try:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD fetch failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD OU endpoint: {exc}") from exc


async def get_ou_details_by_external_id(db: AsyncSession, current_user: User, client: httpx.AsyncClient, ou_ref_id: str, connection_name: str | None = None) -> dict:
    """
    Fetches an OU from CSOD by externalId (ou_ref_id) using the active connection or specified connection name.
    Does NOT store it in the database.
    """
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    # Get the connections
    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    if not conns:
        raise NotFoundError("No CSOD connection configured for your organisation.")
    
    if connection_name:
        conn = next((c for c in conns if c.connection_name == connection_name), None)
        if not conn:
            raise NotFoundError(f"CSOD connection '{connection_name}' not found.")
    else:
        # Use the most recently updated active connection
        active_conns = [c for c in conns if c.status == "active"]
        if not active_conns:
            raise BadRequestError("No active CSOD connection found. Please test your connection first.")
        conn = sorted(active_conns, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]
    
    # Get token
    token_resp = await fetch_token_from_connection(db, current_user, client, {"connection_name": conn.connection_name})
    token = token_resp["access_token"]
    base_url = decrypt_str(conn.base_url_enc)

    # Fetch from CSOD by externalId
    url = f"{base_url.rstrip('/')}/services/api/x/organizations/v1/ous?externalId={ou_ref_id}"
    try:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise BadRequestError(f"CSOD fetch failed with status {exc.response.status_code}: {_safe_error_text(exc.response)}") from exc
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD OU endpoint: {exc}") from exc


async def fetch_and_store_ou_by_external_id(db: AsyncSession, current_user: User, client: httpx.AsyncClient, ou_ref_id: str) -> dict:
    """
    Fetches an OU from CSOD by externalId (ou_ref_id), stores it in the database, and returns the response.
    """
    payload = await get_ou_details_by_external_id(db, current_user, client, ou_ref_id)
    ou_data = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
    if isinstance(ou_data, list):
        if not ou_data:
            raise NotFoundError(f"No OU found with externalId '{ou_ref_id}'")
        ou_data = ou_data[0]
    # Store in database
    await csod_repository.upsert_csod_ou(db, current_user.org_id, ou_data)
    return payload


async def get_job_applications(db: AsyncSession,current_user: User,client: httpx.AsyncClient,connection_name: str | None = None,params: dict | None = None) -> dict:
    """
    Fetches job requisition/application details directly from CSOD using the active connection or specified connection name.
    """
    if not current_user.org_id:
        raise BadRequestError("No organisation linked to your account.")

    # Get the connections
    conns = await csod_repository.get_connections_by_org(db, current_user.org_id)
    if not conns:
        raise NotFoundError("No CSOD connection configured for your organisation.")
    
    if connection_name:
        conn = next((c for c in conns if c.connection_name == connection_name), None)
        if not conn:
            raise NotFoundError(f"CSOD connection '{connection_name}' not found.")
    else:
        # Use the most recently updated active connection
        active_conns = [c for c in conns if c.status == "active"]
        if not active_conns:
            raise BadRequestError("No active CSOD connection found. Please test your connection first.")
        conn = sorted(active_conns, key=lambda c: (c.updated_at or c.created_at), reverse=True)[0]
    
    # Get token
    token_resp = await fetch_token_from_connection(db, current_user, client, {"connection_name": conn.connection_name})
    token = token_resp["access_token"]
    base_url = decrypt_str(conn.base_url_enc)

    # Fetch from CSOD
    url = f"{base_url.rstrip('/')}/services/api/Recruiting/JobRequisitionDetails"
    try:
        response = await client.get(url, 
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }, params=params)
        response.raise_for_status()
        
        try:
            return response.json()
        except Exception as e:
            text_preview = response.text[:2000] if response.text else ""
            return {
                "success": False,
                "error": f"Failed to parse CSOD response as JSON: {str(e)}",
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "raw_response_preview": text_preview
            }
            
    except httpx.HTTPStatusError as exc:
        try:
            err_body = exc.response.json()
        except Exception:
            err_body = exc.response.text or "No response body"
            
        return {
            "success": False,
            "error": f"CSOD job applications fetch failed with status {exc.response.status_code}",
            "status_code": exc.response.status_code,
            "details": err_body
        }
    except httpx.RequestError as exc:
        raise BadRequestError(f"Could not reach CSOD JobRequisitionDetails endpoint: {exc}") from exc


