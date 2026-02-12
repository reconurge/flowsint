"""
Chat service for managing chats and messages with AI integration.
"""

import json
import os
from datetime import datetime
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from ..llm import ChatMessage as LLMChatMessage
from ..llm import LLMProvider, MessageRole, create_llm_provider
from ..models import Chat, ChatMessage
from ..repositories import ChatRepository
from .base import BaseService
from .exceptions import DatabaseError, NotFoundError, PermissionDeniedError

DEFAULT_SYSTEM_PROMPT = (
    "You are a CTI/OSINT investigator and you are trying to investigate on a "
    "variety of real life cases. Use your knowledge and analytics capabilities "
    "to analyse the context and answer the question the best you can. If you "
    "need to reference some items (an IP, a domain or something particular) "
    "please use the code brackets, like : `12.23.34.54` to reference it."
)



class ChatService(BaseService):
    """
    Service for chat CRUD operations and AI message streaming.
    """

    def __init__(self, db: Session, chat_repo: ChatRepository, vault_service, **kwargs):
        super().__init__(db, **kwargs)
        self._chat_repo = chat_repo
        self._vault_service = vault_service

    def get_chats_for_user(self, user_id: UUID) -> List[Chat]:
        chats = self._chat_repo.get_by_owner(user_id)

        for chat in chats:
            chat.messages.sort(key=lambda x: x.created_at)

        return chats

    def get_by_investigation(self, investigation_id: UUID, user_id: UUID) -> List[Chat]:
        chats = self._chat_repo.get_by_investigation_and_owner(
            investigation_id, user_id
        )

        for chat in chats:
            chat.messages.sort(key=lambda x: x.created_at)

        return chats

    def get_by_id(self, chat_id: UUID, user_id: UUID) -> Chat:
        chat = self._chat_repo.get_by_id_and_owner(chat_id, user_id)
        if not chat:
            raise NotFoundError("Chat not found")

        chat.messages.sort(key=lambda x: x.created_at)
        return chat

    def create(
        self,
        title: str,
        description: Optional[str],
        investigation_id: Optional[UUID],
        owner_id: UUID,
    ) -> Chat:
        new_chat = Chat(
            id=uuid4(),
            title=title,
            description=description,
            owner_id=owner_id,
            investigation_id=investigation_id,
            created_at=datetime.utcnow(),
            last_updated_at=datetime.utcnow(),
        )
        self._chat_repo.add(new_chat)
        self._commit()
        self._refresh(new_chat)
        return new_chat

    def delete(self, chat_id: UUID, user_id: UUID) -> None:
        chat = self._chat_repo.get_by_id_and_owner(chat_id, user_id)
        if not chat:
            raise NotFoundError("Chat not found")

        self._chat_repo.delete(chat)
        self._commit()

    def add_user_message(
        self,
        chat_id: UUID,
        user_id: UUID,
        content: str,
        context: Optional[List[str]] = None,
    ) -> ChatMessage:
        chat = self._chat_repo.get_by_id_and_owner(chat_id, user_id)
        if not chat:
            raise NotFoundError("Chat not found")

        chat.last_updated_at = datetime.utcnow()

        user_message = ChatMessage(
            id=uuid4(),
            content=content,
            context=context,
            chat_id=chat_id,
            is_bot=False,
            created_at=datetime.utcnow(),
        )
        self._chat_repo.add_message(user_message)
        self._commit()
        self._refresh(user_message)
        return user_message

    def add_bot_message(self, chat_id: UUID, content: str) -> ChatMessage:
        chat_message = ChatMessage(
            id=uuid4(),
            content=content,
            chat_id=chat_id,
            is_bot=True,
            created_at=datetime.utcnow(),
        )
        self._chat_repo.add_message(chat_message)
        self._commit()
        self._refresh(chat_message)
        return chat_message

    def get_chat_with_context(self, chat_id: UUID, user_id: UUID) -> Chat:
        return self.get_by_id(chat_id, user_id)

    def prepare_ai_context(
        self, chat: Chat, user_prompt: str, context: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        context_message = None
        if context:
            context_str = "; ".join(context)
            context_message = f"Context: {context_str}"
            if len(context_message) > 2000:
                context_message = context_message[:2000] + "..."

        sorted_messages = sorted(chat.messages, key=lambda x: x.created_at)
        recent_messages = (
            sorted_messages[-5:] if len(sorted_messages) > 5 else sorted_messages
        )

        return {
            "recent_messages": recent_messages,
            "context_message": context_message,
            "user_prompt": user_prompt,
        }

    def build_llm_messages(
        self,
        ai_context: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> List[LLMChatMessage]:
        messages: List[LLMChatMessage] = [
            LLMChatMessage(
                role=MessageRole.SYSTEM,
                content=system_prompt or DEFAULT_SYSTEM_PROMPT,
            )
        ]

        for message in ai_context["recent_messages"]:
            role = MessageRole.ASSISTANT if message.is_bot else MessageRole.USER
            messages.append(
                LLMChatMessage(
                    role=role,
                    content=json.dumps(message.content, default=str),
                )
            )

        if ai_context["context_message"]:
            messages.append(
                LLMChatMessage(
                    role=MessageRole.SYSTEM,
                    content=ai_context["context_message"],
                )
            )

        messages.append(
            LLMChatMessage(
                role=MessageRole.USER,
                content=ai_context["user_prompt"],
            )
        )

        return messages

    def get_llm_provider(self, owner_id: UUID) -> LLMProvider:
        provider_name = os.environ.get("LLM_PROVIDER", "mistral")
        vault_key = f"{provider_name.upper()}_API_KEY"
        api_key = self._vault_service.get_secret(owner_id, vault_key)
        return create_llm_provider(provider=provider_name, api_key=api_key)

    async def stream_response(
        self,
        chat_id: UUID,
        llm_messages: List[LLMChatMessage],
        provider: LLMProvider,
    ) -> AsyncIterator[str]:
        import uuid as _uuid

        message_id = str(_uuid.uuid4())
        text_id = str(_uuid.uuid4())
        accumulated: list[str] = []

        yield f"data: {json.dumps({'type': 'start', 'messageId': message_id})}\n\n"
        yield f"data: {json.dumps({'type': 'text-start', 'id': text_id})}\n\n"

        async for token in provider.stream(llm_messages):
            accumulated.append(token)
            yield f"data: {json.dumps({'type': 'text-delta', 'id': text_id, 'delta': token})}\n\n"

        yield f"data: {json.dumps({'type': 'text-end', 'id': text_id})}\n\n"
        yield f"data: {json.dumps({'type': 'finish'})}\n\n"

        self.add_bot_message(chat_id, "".join(accumulated))

        yield "data: [DONE]\n\n"


def create_chat_service(db: Session) -> ChatService:
    from .vault_service import VaultService

    return ChatService(
        db=db,
        chat_repo=ChatRepository(db),
        vault_service=VaultService(db=db),
    )
