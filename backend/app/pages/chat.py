from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import json
from typing import AsyncGenerator, Optional

from ..database.models import User, Conversation, Message
from ..database import get_db
from ..middleware.auth import get_current_user
from ..config import settings
from openai import OpenAI

router = APIRouter()


# Response Models
class ConversationSummary(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


class ChatOnloadData(BaseModel):
    conversations: list[ConversationSummary]
    current_conversation: Optional[dict] = None


# Request Models
class NewConversationRequest(BaseModel):
    title: str = "New Chat"


class SendMessageRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    title: Optional[str] = None


class UpdateConversationRequest(BaseModel):
    conversation_id: int
    title: str


class DeleteConversationRequest(BaseModel):
    conversation_id: int


class ConfigStatusResponse(BaseModel):
    openai_configured: bool


# Helper functions
def get_conversation_by_id(db: Session, conversation_id: int, user_id: int) -> Conversation:
    """Get a conversation by ID and verify ownership."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def create_conversation(db: Session, user_id: int, title: str = "New Chat") -> Conversation:
    """Create a new conversation."""
    conversation = Conversation(user_id=user_id, title=title)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def save_message(db: Session, conversation_id: int, role: str, content: str) -> Message:
    """Save a message to the database."""
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_conversation_messages(db: Session, conversation_id: int) -> list[dict]:
    """Get all messages for a conversation."""
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    return [{"role": msg.role, "content": msg.content} for msg in messages]


async def stream_chat_response(
    messages: list[dict],
    conversation_id: int,
    db: Session
) -> AsyncGenerator[str, None]:
    """Stream chat response from OpenAI and save to database."""
    if not settings.openai_api_key or settings.openai_api_key == "your-api-key-here":
        yield f"data: {json.dumps({'error': 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'})}\n\n"
        return

    client = OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url
    )

    try:
        stream = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            stream=True
        )

        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                # Send SSE format
                yield f"data: {json.dumps({'content': content})}\n\n"

        # Save assistant response to database
        save_message(db, conversation_id, "assistant", full_response)

        # Send done signal
        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        import traceback
        error_detail = f"{str(e)}"
        traceback.print_exc()  # Log full traceback to console
        yield f"data: {json.dumps({'error': error_detail})}\n\n"


# Routes
@router.get("/chat/config", response_model=ConfigStatusResponse)
async def chat_config_status():
    """Check if OpenAI API is configured."""
    return ConfigStatusResponse(
        openai_configured=bool(settings.openai_api_key and settings.openai_api_key != "your-api-key-here")
    )


@router.get("/chat/onload", response_model=ChatOnloadData)
async def chat_onload(
    conversation_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Load chat page data including conversation list and optionally a specific conversation.
    """
    # Get all user conversations
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()

    conversation_list = [
        ConversationSummary(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat()
        ) for conv in conversations
    ]

    current_conversation = None
    if conversation_id:
        conversation = get_conversation_by_id(db, conversation_id, current_user.id)
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()

        current_conversation = {
            "id": conversation.id,
            "title": conversation.title,
            "messages": [
                MessageResponse(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at.isoformat()
                ) for msg in messages
            ]
        }

    return ChatOnloadData(
        conversations=conversation_list,
        current_conversation=current_conversation
    )


@router.post("/chat/send")
async def chat_send_message(
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message and stream the response.
    Creates a new conversation if conversation_id is not provided.
    """
    # Create or get conversation
    if request.conversation_id:
        conversation = get_conversation_by_id(db, request.conversation_id, current_user.id)
    else:
        title = request.title or "New Chat"
        conversation = create_conversation(db, current_user.id, title)

    # Save user message
    save_message(db, conversation.id, "user", request.message)

    # Get conversation history
    messages = get_conversation_messages(db, conversation.id)

    # Update conversation timestamp
    conversation.updated_at = datetime.utcnow()
    db.commit()

    # Stream response
    return StreamingResponse(
        stream_chat_response(messages, conversation.id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Conversation-Id": str(conversation.id)
        }
    )


@router.post("/chat/new")
async def chat_new_conversation(
    request: NewConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation."""
    conversation = create_conversation(db, current_user.id, request.title)
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat()
    }


@router.post("/chat/update")
async def chat_update_conversation(
    request: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation title."""
    conversation = get_conversation_by_id(db, request.conversation_id, current_user.id)
    conversation.title = request.title
    conversation.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.post("/chat/delete")
async def chat_delete_conversation(
    request: DeleteConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation and all its messages."""
    conversation = get_conversation_by_id(db, request.conversation_id, current_user.id)
    db.delete(conversation)
    db.commit()
    return {"success": True}
