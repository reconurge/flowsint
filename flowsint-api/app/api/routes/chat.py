from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from uuid import UUID
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.models import Profile
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

    service.add_user_message(chat_id, current_user.id, payload.prompt, payload.context)

    ai_context = service.prepare_ai_context(chat, payload.prompt, payload.context)
    llm_messages = service.build_llm_messages(ai_context)

    try:
        provider = service.get_llm_provider(current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return StreamingResponse(
        service.stream_response(chat_id, llm_messages, provider),
        media_type="text/event-stream",
    )


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
