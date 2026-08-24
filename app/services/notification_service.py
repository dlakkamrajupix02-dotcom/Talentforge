import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set
from uuid import UUID
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from app.repository import notification_repository as notify_repo
from app.core.logging import get_logger
from app.models.models import Notification

logger = get_logger()


class ConnectionManager:
    def __init__(self):
        # Maps user_id (str) -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Maps user_id (str) -> set of recently-broadcast notification IDs
        # Prevents the same notification being sent twice when a user has
        # multiple sockets open (e.g. React Strict-Mode double-mount race)
        self._recently_sent: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, *, already_accepted: bool = False):
        if not already_accepted:
            await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        # Deduplicate socket objects – the same object must not appear twice
        if websocket not in self.active_connections[user_id]:
            self.active_connections[user_id].append(websocket)

        logger.info("WS connected user={} total_conns={}", user_id, len(self.active_connections[user_id]))

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WS disconnected  user={user_id}")


    def _is_recently_sent(self, user_id: str, notification_id: str) -> bool:
        """Return True if this notification was already broadcast to this user."""
        return notification_id in self._recently_sent.get(user_id, set())

    def _mark_sent(self, user_id: str, notification_id: str, ttl_seconds: int = 10):
        """Record that this notification was sent; auto-expire after ttl_seconds."""
        if user_id not in self._recently_sent:
            self._recently_sent[user_id] = set()
        self._recently_sent[user_id].add(notification_id)

        # Schedule automatic cleanup so the set doesn't grow forever
        async def _cleanup():
            await asyncio.sleep(ttl_seconds)
            if user_id in self._recently_sent:
                self._recently_sent[user_id].discard(notification_id)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_cleanup())
        except RuntimeError:
            pass  # No running loop – cleanup will happen on next boot

    async def broadcast_to_user(self, message: dict, user_id: str):
        """
        Send *message* to every active socket for *user_id*.

        If the message carries a notification id that was already sent to this
        user within the last 10 seconds the entire broadcast is skipped – this
        is the definitive guard against double-toasts caused by multiple sockets.
        """
        if user_id not in self.active_connections:
            return

        # Per-user dedup on notification id
        notif_id = (message.get("notification") or {}).get("id")
        if notif_id:
            if self._is_recently_sent(user_id, notif_id):
                logger.info(f"WS broadcast SKIPPED (duplicate)  "f"user={user_id}  notif_id={notif_id}")
                return
            self._mark_sent(user_id, notif_id)

        connections = list(self.active_connections[user_id])
        stale = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.error(f"WS send error  user={user_id}: {exc}")
                stale.append(ws)

        for ws in stale:
            self.disconnect(ws, user_id)


# Singleton – one manager for the entire process
manager = ConnectionManager()


class NotificationService:
    @staticmethod
    async def send_notification(db: AsyncSession,*,user_id: UUID,org_id: UUID,type: str,title: str,message: str,sender_id: Optional[UUID] = None,link: Optional[str] = None) -> Notification:
        """
        1. Save to database (with 10-second dedup guard in the repository).
        2. If the record is brand-new, broadcast via WebSocket.
           If it is a duplicate that was suppressed, skip the broadcast.
        """
        # 1. Persist (dedup logic lives in the repository)
        notification, was_newly_created = await notify_repo.create_notification_db(db,user_id=user_id,org_id=org_id,type=type,title=title,message=message,sender_id=sender_id,link=link)

        # 2. Only broadcast for genuinely new notifications
        if not was_newly_created:
            logger.info(f"DB-level duplicate suppressed  "f"user={user_id}  type={type}  link={link}")
            return notification

        try:
            ws_payload = {
                "type": "new_notification",
                "notification": {
                    "id": str(notification.id),
                    "user_id": str(notification.user_id),
                    "org_id": str(notification.org_id),
                    "type": notification.type,
                    "title": notification.title,
                    "message": notification.message,
                    "link": notification.link,
                    "is_read": notification.is_read,
                    "created_at": (
                        notification.created_at.isoformat()
                        if notification.created_at
                        else None
                    ),
                },
            }
            # broadcast_to_user has its own per-user dedup layer
            await manager.broadcast_to_user(ws_payload, str(user_id))
        except Exception as exc:
            logger.error(f"WS broadcast failed  user={user_id}: {exc}")

        return notification


notification_service = NotificationService()
