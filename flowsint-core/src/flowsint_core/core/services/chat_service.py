"""
Chat service for managing chats and messages with AI integration.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
import os
import json

from sqlalchemy.orm import Session

from ..models import Chat, ChatMessage
from .base import BaseService
from .exceptions import NotFoundError, PermissionDeniedError, DatabaseError


def clean_context(context: List[Dict]) -> List[Dict]:
    """Remove unnecessary keys from context data."""
    cleaned = []
    for item in context:
        if isinstance(item, dict):
            cleaned_item = item.get("data", item).copy()
            cleaned_item.pop("id", None)
            cleaned_item.pop("sketch_id", None)
            if "data" in cleaned_item and isinstance(cleaned_item["data"], dict):
                cleaned_item["data"].pop("sketch_id", None)
            cleaned_item.pop("measured", None)
            cleaned.append(cleaned_item)
    return cleaned


class ChatService(BaseService):
    """
    Service for chat CRUD operations and AI message streaming.
    """

    def get_chats_for_user(self, user_id: UUID) -> List[Chat]:
        """
        Get all chats owned by a user.

        Args:
            user_id: The user's ID

        Returns:
            List of chats with sorted messages
        """
        chats = self._db.query(Chat).filter(Chat.owner_id == user_id).all()

        # Sort messages for each chat by created_at in ascending order
        for chat in chats:
            chat.messages.sort(key=lambda x: x.created_at)

        return chats

    def get_by_investigation(
        self, investigation_id: UUID, user_id: UUID
    ) -> List[Chat]:
        """
        Get all chats for an investigation.

        Args:
            investigation_id: The investigation ID
            user_id: The user's ID

        Returns:
            List of chats with sorted messages
        """
        chats = (
            self._db.query(Chat)
            .filter(Chat.investigation_id == investigation_id, Chat.owner_id == user_id)
            .order_by(Chat.created_at.asc())
            .all()
        )

        for chat in chats:
            chat.messages.sort(key=lambda x: x.created_at)

        return chats

    def get_by_id(self, chat_id: UUID, user_id: UUID) -> Chat:
        """
        Get a chat by ID.

        Args:
            chat_id: The chat ID
            user_id: The user's ID

        Returns:
            The chat with sorted messages

        Raises:
            NotFoundError: If chat not found or doesn't belong to user
        """
        chat = (
            self._db.query(Chat)
            .filter(Chat.id == chat_id, Chat.owner_id == user_id)
            .first()
        )
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
        """
        Create a new chat.

        Args:
            title: Chat title
            description: Chat description
            investigation_id: Parent investigation ID (optional)
            owner_id: Owner user ID

        Returns:
            The created chat
        """
        new_chat = Chat(
            id=uuid4(),
            title=title,
            description=description,
            owner_id=owner_id,
            investigation_id=investigation_id,
            created_at=datetime.utcnow(),
            last_updated_at=datetime.utcnow(),
        )
        self._add(new_chat)
        self._commit()
        self._refresh(new_chat)
        return new_chat

    def delete(self, chat_id: UUID, user_id: UUID) -> None:
        """
        Delete a chat.

        Args:
            chat_id: The chat ID
            user_id: The user's ID

        Raises:
            NotFoundError: If chat not found or doesn't belong to user
        """
        chat = (
            self._db.query(Chat)
            .filter(Chat.id == chat_id, Chat.owner_id == user_id)
            .first()
        )
        if not chat:
            raise NotFoundError("Chat not found")

        self._delete(chat)
        self._commit()

    def add_user_message(
        self, chat_id: UUID, user_id: UUID, content: str, context: Optional[List[Dict]] = None
    ) -> ChatMessage:
        """
        Add a user message to a chat.

        Args:
            chat_id: The chat ID
            user_id: The user's ID
            content: Message content
            context: Optional context data

        Returns:
            The created message

        Raises:
            NotFoundError: If chat not found
        """
        chat = (
            self._db.query(Chat)
            .filter(Chat.id == chat_id, Chat.owner_id == user_id)
            .first()
        )
        if not chat:
            raise NotFoundError("Chat not found")

        # Update chat's last_updated_at
        chat.last_updated_at = datetime.utcnow()

        user_message = ChatMessage(
            id=uuid4(),
            content=content,
            context=context,
            chat_id=chat_id,
            is_bot=False,
            created_at=datetime.utcnow(),
        )
        self._add(user_message)
        self._commit()
        self._refresh(user_message)
        return user_message

    def add_bot_message(self, chat_id: UUID, content: str) -> ChatMessage:
        """
        Add a bot message to a chat.

        Args:
            chat_id: The chat ID
            content: Message content

        Returns:
            The created message
        """
        chat_message = ChatMessage(
            id=uuid4(),
            content=content,
            chat_id=chat_id,
            is_bot=True,
            created_at=datetime.utcnow(),
        )
        self._add(chat_message)
        self._commit()
        self._refresh(chat_message)
        return chat_message

    def get_chat_with_context(self, chat_id: UUID, user_id: UUID) -> Chat:
        """
        Get a chat with its messages for AI context building.

        Args:
            chat_id: The chat ID
            user_id: The user's ID

        Returns:
            The chat

        Raises:
            NotFoundError: If chat not found
        """
        return self.get_by_id(chat_id, user_id)

    def prepare_ai_context(
        self, chat: Chat, user_prompt: str, context: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Prepare context for AI message generation.

        Args:
            chat: The chat
            user_prompt: The user's prompt
            context: Optional additional context

        Returns:
            Dictionary with prepared context for AI
        """
        context_message = None
        if context:
            try:
                cleaned_context = clean_context(context)
                if cleaned_context:
                    context_str = json.dumps(cleaned_context, indent=2, default=str)
                    context_message = f"Context: {context_str}"
                    if len(context_message) > 2000:
                        context_message = context_message[:2000] + "..."
            except Exception as e:
                print(f"Context processing error: {e}")

        sorted_messages = sorted(chat.messages, key=lambda x: x.created_at)
        recent_messages = sorted_messages[-5:] if len(sorted_messages) > 5 else sorted_messages

        return {
            "recent_messages": recent_messages,
            "context_message": context_message,
            "user_prompt": user_prompt,
        }


def create_chat_service(db: Session) -> ChatService:
    """
    Factory function to create a ChatService instance.

    Args:
        db: SQLAlchemy database session

    Returns:
        Configured ChatService instance
    """
    return ChatService(db=db)
