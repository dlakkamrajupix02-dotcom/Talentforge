from sqlalchemy import select, or_, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import ChatMessage, User
from uuid import UUID
from typing import List, Optional

async def create_message(db: AsyncSession,org_id: UUID,sender_id: UUID,recipient_id: Optional[UUID],content: str) -> ChatMessage:
    """Creates a new chat message. recipient_id is null for group chat."""
    message = ChatMessage(org_id=org_id,sender_id=sender_id,recipient_id=recipient_id,content=content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_messages(db: AsyncSession,user_id: UUID,other_user_id: Optional[UUID], org_id: UUID, limit: int = 50,offset: int = 0) -> List[ChatMessage]:
    """Retrieves chat history. If other_user_id is None, returns organization group messages."""
    if other_user_id is None:
        # Group messages (org-wide)
        query = (select(ChatMessage).where(ChatMessage.org_id == org_id, ChatMessage.recipient_id is None).order_by(desc(ChatMessage.created_at)).limit(limit).offset(offset))
    else:
        # Private messages
        query = (select(ChatMessage).where(or_(and_(ChatMessage.sender_id == user_id, ChatMessage.recipient_id == other_user_id),
                    and_(ChatMessage.sender_id == other_user_id, ChatMessage.recipient_id == user_id)))
            .order_by(desc(ChatMessage.created_at)).limit(limit).offset(offset))
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_as_read(db: AsyncSession, recipient_id: UUID, sender_id: UUID):
    """Marks messages from a specific sender to recipient as read."""
    from sqlalchemy import update
    query = (update(ChatMessage).where(ChatMessage.recipient_id == recipient_id, ChatMessage.sender_id == sender_id, not ChatMessage.is_read).values(is_read=True))
    await db.execute(query)
    await db.commit()


async def get_conversations(db: AsyncSession, user_id: UUID) -> List[dict]:
    """Retrieves a summary of all private conversations for a user."""
    subq = (select(ChatMessage.sender_id.label("uid")).where(ChatMessage.recipient_id == user_id).union(select(ChatMessage.recipient_id.label("uid")).where(ChatMessage.sender_id == user_id))).subquery()
    users_query = select(User).where(User.id.in_(select(subq.c.uid)))
    users_result = await db.execute(users_query)
    other_users = users_result.scalars().all()
    conversations = []
    for other_user in other_users:
        last_msg_query = (select(ChatMessage).where(or_(and_(ChatMessage.sender_id == user_id, ChatMessage.recipient_id == other_user.id),
                    and_(ChatMessage.sender_id == other_user.id, ChatMessage.recipient_id == user_id))).order_by(desc(ChatMessage.created_at)).limit(1))
        last_msg_res = await db.execute(last_msg_query)
        last_msg = last_msg_res.scalar_one_or_none()
        unread_count_query = (select(func.count(ChatMessage.id)).where(ChatMessage.recipient_id == user_id, 
            ChatMessage.sender_id == other_user.id, ChatMessage.is_read.is_(False)))
        unread_count_res = await db.execute(unread_count_query)
        unread_count = unread_count_res.scalar_one()
        if last_msg:
            conversations.append({
                "other_user_id": other_user.id,
                "other_user_name": other_user.full_name,
                "last_message": last_msg.content,
                "last_message_at": last_msg.created_at,
                "unread_count": unread_count
            })
    conversations.sort(key=lambda x: x["last_message_at"], reverse=True)
    return conversations


async def get_organization_members(db: AsyncSession, org_id: UUID, exclude_user_id: UUID) -> List[User]:
    """Returns all members of an organization excluding the current user."""
    query = select(User).where(User.org_id == org_id, User.id != exclude_user_id, User.deleted_at is None)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_org_last_message(db: AsyncSession, org_id: UUID) -> Optional[ChatMessage]:
    """Returns the last message sent to the organization group chat."""
    query = (select(ChatMessage).where(ChatMessage.org_id == org_id, ChatMessage.recipient_id is None).order_by(desc(ChatMessage.created_at)).limit(1))
    result = await db.execute(query)
    return result.scalar_one_or_none()
