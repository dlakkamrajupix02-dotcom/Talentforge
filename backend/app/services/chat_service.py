from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User
from app.repository import chat_repository as chat_repo
from app.repository import user_repository as user_repo
from app.repository import organization_repository as org_repo
from app.core.exceptions import NotFoundError, ForbiddenError
from uuid import UUID
from typing import List, Optional

class ChatService:
    async def send_message(self, db: AsyncSession, *, sender: User, recipient_id: Optional[UUID], content: str) -> dict:
        """Sends a message to a user or the whole organization."""
        if recipient_id:
            # Private Message
            recipient = await user_repo.get_user_by_id(db, recipient_id, sender.org_id)
            if not recipient:
                raise NotFoundError("Recipient not found.")
            if recipient.org_id != sender.org_id:
                raise ForbiddenError("You can only chat with users in your own organization.")
        
        message = await chat_repo.create_message(db,org_id=sender.org_id,sender_id=sender.id,
            recipient_id=recipient_id,content=content)
        
        return {
            "id": message.id,
            "org_id": message.org_id,
            "sender_id": message.sender_id,
            "recipient_id": message.recipient_id,
            "content": message.content,
            "is_read": message.is_read,
            "created_at": message.created_at
        }

    async def get_chat_history(self, db: AsyncSession, *, user: User, other_user_id: Optional[UUID], limit: int, offset: int) -> List[dict]:
        """Retrieves history. other_user_id=None for organization chat."""
        if other_user_id:
            other_user = await user_repo.get_user_by_id(db, other_user_id, user.org_id)
            if not other_user:
                raise ForbiddenError("You can only view chats with users in your own organization.")
            # Additional org check is redundant but kept for defense in depth
            if other_user.org_id != user.org_id:
                raise ForbiddenError("You can only view chats with users in your own organization.")
            # Mark messages as read
            await chat_repo.mark_as_read(db, recipient_id=user.id, sender_id=other_user_id)
        
        messages = await chat_repo.get_messages(db, user_id=user.id, other_user_id=other_user_id, org_id=user.org_id, limit=limit, offset=offset)
        
        return [
            {
                "id": m.id,
                "org_id": m.org_id,
                "sender_id": m.sender_id,
                "recipient_id": m.recipient_id,
                "content": m.content,
                "is_read": m.is_read,
                "created_at": m.created_at
            }
            for m in messages
        ]

    async def list_conversations(self, db: AsyncSession, *, user: User) -> List[dict]:
        """Lists active conversations and the Organization Group Chat."""
        conversations = await chat_repo.get_conversations(db, user.id)
        
        from app.services.redis_service import redis_service
        for conv in conversations:
            conv["presence"] = await redis_service.get_presence(str(conv["other_user_id"]))
            
        # Add Organization Group Chat
        org = await org_repo.get_organization_by_id(db, user.org_id)
        if org:
            last_org_msg = await chat_repo.get_org_last_message(db, user.org_id)
            conversations.insert(0, {
                "other_user_id": None, # Represents Organization Group
                "other_user_name": f"{org.name} (Global)",
                "last_message": last_org_msg.content if last_org_msg else "Welcome to your company chat!",
                "last_message_at": last_org_msg.created_at if last_org_msg else org.created_at,
                "unread_count": 0,
                "presence": "online", # Orgs are always "online"
                "is_group": True
            })
            
        return conversations

    async def list_org_members(self, db: AsyncSession, *, user: User) -> List[dict]:
        """Lists all members of the user's organization."""
        members = await chat_repo.get_organization_members(db, user.org_id, exclude_user_id=user.id)
        
        from app.services.redis_service import redis_service
        result = []
        for member in members:
            presence = await redis_service.get_presence(str(member.id))
            result.append({
                "user_id": member.id,
                "full_name": member.full_name,
                "email": member.email,
                "role": member.role,
                "presence": presence
            })
        return result

    async def update_presence(self, user_id: UUID) -> None:
        from app.services.redis_service import redis_service
        await redis_service.set_presence(str(user_id))

    async def get_user_presence(self, user_id: UUID) -> str:
        from app.services.redis_service import redis_service
        return await redis_service.get_presence(str(user_id))

    async def set_typing_status(self, sender_id: UUID, recipient_id: UUID) -> None:
        from app.services.redis_service import redis_service
        await redis_service.set_typing(str(sender_id), str(recipient_id))

    async def check_typing_status(self, sender_id: UUID, recipient_id: UUID) -> bool:
        from app.services.redis_service import redis_service
        return await redis_service.is_typing(str(sender_id), str(recipient_id))

chat_service = ChatService()
