import json
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import CandidateUser, User
from app.schemas.schemas import NotificationResponse, NotificationCountResponse
from app.core.config import settings
from app.services.dependencies import (authenticate_websocket_connection,extract_websocket_token,get_current_user,get_current_regular_user,validate_websocket_token)
from app.repository import notification_repository as notify_repo
from app.core.logging import get_logger, log_exception_one_line
from app.services.notification_service import manager

logger = get_logger()

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def _safe_websocket_close(websocket: WebSocket, *, code: int, reason: str, user_id: str) -> None:
    if websocket.client_state != WebSocketState.CONNECTED:
        return
    try:
        await websocket.close(code=code, reason=reason)
    except RuntimeError as exc:
        log_exception_one_line("WebSocket close skipped", exc, user_id=user_id, code=code, reason=reason)
    except AttributeError as exc:
        log_exception_one_line("WebSocket close failed", exc, user_id=user_id, code=code, reason=reason)
    except Exception as exc:
        log_exception_one_line("WebSocket close unexpected error", exc, user_id=user_id, code=code, reason=reason)


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(unread_only: bool = Query(False),limit: int = Query(50, ge=1, le=100),offset: int = Query(0, ge=0),db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """List notifications for the current user."""
    notifications = await notify_repo.list_user_notifications(db, user_id=current_user.id, limit=limit, offset=offset, unread_only=unread_only)
    return notifications


@router.get("/unread-count", response_model=NotificationCountResponse)
async def get_unread_notification_count(db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """Get the count of unread notifications for the current user."""
    count = await notify_repo.get_unread_count(db, user_id=current_user.id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(notification_id: UUID,db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """Mark a specific notification as read."""
    success = await notify_repo.mark_as_read(db, notification_id=notification_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification marked as read"}


@router.patch("/read-all")
async def mark_all_notifications_as_read(db: AsyncSession = Depends(get_db),current_user: User | CandidateUser = Depends(get_current_user)):
    """Delete all notifications for the current user."""
    count = await notify_repo.delete_all_notifications(db, user_id=current_user.id)
    return {"status": "success", "message": f"{count} notifications deleted"}


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket,user_id: str,token: str | None = Query(None, description="JWT access token (recommended: ?token=<jwt>)")):
    """
    Real-time notifications for staff users.

    Standard browser connection:
      ws://host/notifications/ws/{user_id}?token={accessToken}

    Alternative: connect without token, receive {"type":"auth_required"}, then send:
      {"type":"auth","token":"<jwt>"}
    """
    client = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"
    headers = websocket.headers
    logger.info("WebSocket connection attempt user_id={} client={} host={} origin={} has_query_token={}",user_id,
        client,headers.get("host"),headers.get("origin"),bool(token or extract_websocket_token(websocket)))

    try:
        UUID(user_id)
    except ValueError:
        logger.warning("WebSocket rejected: invalid user_id format {}", user_id)
        await _safe_websocket_close(websocket, code=1008, reason="Invalid user id", user_id=user_id)
        return

    header_token = extract_websocket_token(websocket) or token
    if header_token and await validate_websocket_token(header_token, user_id):
        await websocket.accept()
        await manager.connect(websocket, user_id, already_accepted=True)
        logger.info("WebSocket authenticated and connected for user_id={}", user_id)
    else:
        await websocket.accept()
        if not await authenticate_websocket_connection(websocket, user_id, query_token=token):
            logger.warning("WebSocket auth failed for user_id={} require_token={}",user_id,settings.websocket_require_token_effective)
            await _safe_websocket_close(websocket, code=1008, reason="Authentication failed", user_id=user_id)
            return
        await manager.connect(websocket, user_id, already_accepted=True)
        logger.info("WebSocket authenticated and connected for user_id={}", user_id)

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                raise WebSocketDisconnect(code=message.get("code", 1000), reason=message.get("reason"))

            text = message.get("text")
            if text is None:
                continue

            payload = text.strip()
            if not payload:
                continue

            if payload.lower() == "ping":
                await websocket.send_text("pong")
                continue

            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                continue

            if isinstance(data, dict) and data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect as exc:
        logger.info("WebSocket disconnected user_id={} code={} reason={}",user_id,getattr(exc, "code", None),getattr(exc, "reason", None))
        manager.disconnect(websocket, user_id)
    except Exception as exc:
        log_exception_one_line("WebSocket error", exc, user_id=user_id)
        manager.disconnect(websocket, user_id)
