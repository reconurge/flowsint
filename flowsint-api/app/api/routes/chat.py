from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
from mistralai import Mistral
from mistralai.models import UserMessage, AssistantMessage, SystemMessage
import json
from uuid import UUID, uuid4
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import ChatMessage, Profile
from flowsint_core.core.services import (
    create_chat_service,
    NotFoundError,
)
from app.api.deps import get_current_user
from app.api.schemas.chat import ChatCreate, ChatRead

router = APIRouter()


class ChatRequest(BaseModel):
    prompt: str
    context: Optional[List[Dict]] = None


@router.get("/", response_model=List[ChatRead])
def get_chats(
    db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)
):
    service = create_chat_service(db)
    return service.get_chats_for_user(current_user.id)


@router.get("/investigation/{investigation_id}", response_model=List[ChatRead])
def get_chats_by_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_chat_service(db)
    return service.get_by_investigation(investigation_id, current_user.id)


@router.post("/stream/{chat_id}")
async def stream_chat(
    chat_id: UUID,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_chat_service(db)

    try:
        chat = service.get_by_id(chat_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Add user message
    service.add_user_message(chat_id, current_user.id, payload.prompt, payload.context)

    # Prepare AI context
    ai_context = service.prepare_ai_context(chat, payload.prompt, payload.context)

    try:
        api_key = os.environ.get("MISTRAL_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, detail="Mistral API key not configured"
            )

        client = Mistral(api_key=api_key)
        model = "mistral-small-latest"
        accumulated_content = []

        # Build messages for Mistral
        messages = [
            SystemMessage(
                content="You are a CTI/OSINT investigator and you are trying to investigate on a variety of real life cases. Use your knowledge and analytics capabilities to analyse the context and answer the question the best you can. If you need to reference some items (an IP, a domain or something particular) please use the code brackets, like : `12.23.34.54` to reference it."
            )
        ]

        for message in ai_context["recent_messages"]:
            if message.is_bot:
                messages.append(
                    AssistantMessage(content=json.dumps(message.content, default=str))
                )
            else:
                messages.append(
                    UserMessage(content=json.dumps(message.content, default=str))
                )

        if ai_context["context_message"]:
            messages.append(SystemMessage(content=ai_context["context_message"]))

        messages.append(UserMessage(content=ai_context["user_prompt"]))

        async def generate():
            response = await client.chat.stream_async(model=model, messages=messages)

            async for chunk in response:
                if chunk.data.choices[0].delta.content is not None:
                    content_chunk = chunk.data.choices[0].delta.content
                    accumulated_content.append(content_chunk)
                    yield f"data: {json.dumps({'content': content_chunk})}\n\n"

            # Save bot message after streaming completes
            service.add_bot_message(chat_id, "".join(accumulated_content))

            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_chat_service(db)
    return service.create(
        title=payload.title,
        description=payload.description,
        investigation_id=payload.investigation_id,
        owner_id=current_user.id,
    )


@router.get("/{chat_id}", response_model=ChatRead)
def get_chat_by_id(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_chat_service(db)
    try:
        return service.get_by_id(chat_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Chat not found")


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    service = create_chat_service(db)
    try:
        service.delete(chat_id, current_user.id)
        return None
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Chat not found")
