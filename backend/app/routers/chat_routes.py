from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.dependencies import get_current_regular_user
from app.models.models import User
from app.schemas.schemas import ChatMessageCreate, ChatMessageResponse, ChatConversationResponse, ChatMemberResponse,TypingStatusRequest, TypingStatusResponse
from app.services.chat_service import chat_service
from uuid import UUID
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Internal Chat"])


@router.get("/members", response_model=List[ChatMemberResponse])
async def list_org_members(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Retrieves a list of all colleagues within the same organization.
    Includes real-time presence information.
    """
    try:
        members = await chat_service.list_org_members(db, user=current_user)
        return [ChatMemberResponse(**m) for m in members]
    except Exception:
        logger.exception("Failed to list organization members")
        raise HTTPException(status_code=500, detail="Unable to retrieve organization directory.")


@router.get("/conversations", response_model=List[ChatConversationResponse])
async def list_conversations(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Lists all active private conversations and includes the organization global chat.
    Sorted by the most recent message timestamp.
    """
    try:
        conversations = await chat_service.list_conversations(db, user=current_user)
        return [ChatConversationResponse(**c) for c in conversations]
    except Exception:
        logger.exception("Failed to list conversations")
        raise HTTPException(status_code=500, detail="Unable to load conversation list.")


@router.get("/history/organization", response_model=List[ChatMessageResponse])
async def get_org_history(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Retrieves the message history for the organization-wide global chat.
    Supports pagination via limit and offset.
    """
    try:
        messages = await chat_service.get_chat_history(db, user=current_user, other_user_id=None, limit=limit, offset=offset)
        return [ChatMessageResponse(**m) for m in messages]
    except Exception:
        logger.exception("Failed to retrieve organization chat history")
        raise HTTPException(status_code=500, detail="Unable to load group chat history.")


@router.get("/history/{other_user_id}", response_model=List[ChatMessageResponse])
async def get_private_history(other_user_id: UUID, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Retrieves the private message history between the current user and another specific user.
    """
    try:
        messages = await chat_service.get_chat_history(db, user=current_user, other_user_id=other_user_id, limit=limit, offset=offset)
        return [ChatMessageResponse(**m) for m in messages]
    except Exception:
        logger.exception(f"Failed to retrieve history with user {other_user_id}")
        raise HTTPException(status_code=500, detail="Unable to load private chat history.")


@router.post("/read/{sender_id}")
async def mark_read(sender_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """Marks all messages from a specific sender as read."""
    from app.repository import chat_repository as chat_repo
    await chat_repo.mark_as_read(db, recipient_id=current_user.id, sender_id=sender_id)
    return {"status": "success"}

@router.post("/send", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(data: ChatMessageCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_regular_user)):
    """
    Sends a new message. 
    If 'recipient_id' is null, the message is sent to the organization global chat.
    """
    try:
        result = await chat_service.send_message(db, sender=current_user, recipient_id=data.recipient_id, content=data.content)
        return ChatMessageResponse(**result)
    except Exception:
        logger.exception("Failed to send message")
        raise HTTPException(status_code=500, detail="Message delivery failed. Please try again.")


@router.post("/presence/ping")
async def ping_presence(current_user: User = Depends(get_current_regular_user)):
    """
    Updates the 'online' presence timestamp for the current user.
    Should be called periodically by the client.
    """
    await chat_service.update_presence(current_user.id)
    return {"status": "presence_updated"}


@router.post("/typing")
async def set_typing_status(data: TypingStatusRequest, current_user: User = Depends(get_current_regular_user)):
    """
    Broadcasts a typing indicator from the current user to a specific recipient.
    """
    await chat_service.set_typing_status(current_user.id, data.recipient_id)
    return {"status": "typing_status_set"}


@router.get("/typing/{sender_id}", response_model=TypingStatusResponse)
async def check_typing_status(sender_id: UUID, current_user: User = Depends(get_current_regular_user)):
    """
    Checks if a specific user is currently typing to the current user.
    """
    is_typing = await chat_service.check_typing_status(sender_id, current_user.id)
    return TypingStatusResponse(is_typing=is_typing)
