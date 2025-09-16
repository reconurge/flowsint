from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from mistralai import Mistral
from mistralai.models import UserMessage, AssistantMessage, SystemMessage
import json
from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Chat, ChatMessage, Profile
from app.api.deps import get_current_user
from app.api.schemas.chat import ChatCreate, ChatRead

router = APIRouter()


def clean_context(context: List[Dict]) -> List[Dict]:
    print(context)
    """Remove unnecessary keys from context data."""
    cleaned = []
    for item in context:
        if isinstance(item, dict):
            # Create a copy and remove unwanted keys
            cleaned_item = item["data"].copy()
            # Remove top-level keys
            cleaned_item.pop("id", None)
            cleaned_item.pop("sketch_id", None)
            # Remove from data if it exists
            if "data" in cleaned_item and isinstance(cleaned_item["data"], dict):
                cleaned_item["data"].pop("sketch_id", None)
            # Remove measured/dimensions
            cleaned_item.pop("measured", None)
            cleaned.append(cleaned_item)
    return cleaned


class ChatRequest(BaseModel):
    prompt: str
    context: Optional[List[Dict]] = None


# Get all chats
@router.get("/", response_model=List[ChatRead])
def get_chats(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    chats = db.query(Chat).filter(Chat.owner_id == current_user.id).all()

    # Sort messages for each chat by created_at in ascending order
    for chat in chats:
        chat.messages.sort(key=lambda x: x.created_at)

    return chats


# @router.get("/delete-all", status_code=status.HTTP_204_NO_CONTENT)
# def delete_all_chat(db: Session = Depends(get_db)):
#     chats = db.query(Chat).all()
#     for chat in chats:
#         db.delete(chat)
#     db.commit()
#     return {"result": "done"}


# Get analyses by investigation ID
@router.get("/investigation/{investigation_id}", response_model=List[ChatRead])
def get_chats_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    chats = (
        db.query(Chat)
        .filter(
            Chat.investigation_id == investigation_id, Chat.owner_id == current_user.id
        )
        .order_by(Chat.created_at.asc())
        .all()
    )

    # Sort messages for each chat by created_at in ascending order
    for chat in chats:
        chat.messages.sort(key=lambda x: x.created_at)

    return chats


@router.post("/stream/{chat_id}")
async def stream_chat(
    chat_id: UUID,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    # Check if Chat exists
    chat = (
        db.query(Chat)
        .filter(Chat.id == chat_id, Chat.owner_id == current_user.id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Update chat's last_updated_at
    chat.last_updated_at = datetime.utcnow()
    db.commit()
    # A new message is created
    user_message = ChatMessage(
        id=uuid4(),
        content=payload.prompt,
        context=payload.context,
        chat_id=chat_id,
        is_bot=False,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    try:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, detail="Mistral API key not configured"
            )

        client = Mistral(api_key=api_key)
        model = "mistral-small-latest"
        accumulated_content = []
        context_message = None
        # Convert database messages to Mistral format
        messages = [
            SystemMessage(
                content="You are a CTI/OSINT investigator and you are trying to investigate on a variety of real life cases. Use your knowledge and analytics capabilities to analyse the context and answer the question the best you can. If you need to reference some items (an IP, a domain or something particular) please use the code brackets, like : `12.23.34.54` to reference it."
            )
        ]

        # Add context as a single system message if provided
        if payload.context:
            try:
                # Clean context by removing unnecessary keys
                cleaned_context = clean_context(payload.context)
                if cleaned_context:
                    context_str = json.dumps(cleaned_context, indent=2, default=str)
                    context_message = f"Context: {context_str}"
                    # Limit context message length to avoid token limits
                    if len(context_message) > 2000:
                        context_message = context_message[:2000] + "..."
            except Exception as e:
                # If context processing fails, skip it
                print(f"Context processing error: {e}")

        # Sort messages by created_at in ascending order and get recent messages
        sorted_messages = sorted(chat.messages, key=lambda x: x.created_at)
        recent_messages = (
            sorted_messages[-5:] if len(sorted_messages) > 5 else sorted_messages
        )
        for message in recent_messages:
            if message.is_bot:
                messages.append(
                    AssistantMessage(content=json.dumps(message.content, default=str))
                )
            else:
                messages.append(
                    UserMessage(content=json.dumps(message.content, default=str))
                )

        # Add the current context
        if context_message:
            messages.append(SystemMessage(content=context_message))
        # Add the current user message
        messages.append(UserMessage(content=payload.prompt))

        async def generate():
            response = await client.chat.stream_async(model=model, messages=messages)

            async for chunk in response:
                if chunk.data.choices[0].delta.content is not None:
                    content_chunk = chunk.data.choices[0].delta.content
                    accumulated_content.append(content_chunk)
                    yield f"data: {json.dumps({'content': content_chunk})}\n\n"

            # Create the bot message after all chunks have been processed
            chat_message = ChatMessage(
                id=uuid4(),
                content="".join(accumulated_content),
                chat_id=chat_id,
                is_bot=True,
                created_at=datetime.utcnow(),
            )

            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)

            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a new chat
@router.post("/create", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    new_chat = Chat(
        id=uuid4(),
        title=payload.title,
        description=payload.description,
        owner_id=current_user.id,
        investigation_id=payload.investigation_id,
        created_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow(),
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    return new_chat


# Get a chat by ID
@router.get("/{chat_id}", response_model=ChatRead)
def get_chat_by_id(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    chat = (
        db.query(Chat)
        .filter(Chat.id == chat_id, Chat.owner_id == current_user.id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Sort messages by created_at in ascending order
    chat.messages.sort(key=lambda x: x.created_at)

    return chat


# Delete an chat by ID
@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    chat = (
        db.query(Chat)
        .filter(Chat.id == chat_id, Chat.owner_id == current_user.id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
    return None
