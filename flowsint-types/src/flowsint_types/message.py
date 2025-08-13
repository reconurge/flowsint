from pydantic import BaseModel, Field
from typing import Optional, List


class Message(BaseModel):
    """Represents a message with content, metadata, and security analysis."""

    message_id: str = Field(
        ..., description="Unique message identifier", title="Message ID"
    )
    content: str = Field(..., description="Message content", title="Content")
    sender: Optional[str] = Field(None, description="Message sender", title="Sender")
    recipient: Optional[str] = Field(
        None, description="Message recipient", title="Recipient"
    )
    timestamp: Optional[str] = Field(
        None, description="Message timestamp", title="Timestamp"
    )
    platform: Optional[str] = Field(
        None, description="Platform where message was sent", title="Platform"
    )
    message_type: Optional[str] = Field(
        None,
        description="Type of message (text, email, chat, etc.)",
        title="Message Type",
    )
    subject: Optional[str] = Field(
        None, description="Message subject (for emails)", title="Subject"
    )
    is_read: Optional[bool] = Field(
        None, description="Whether message has been read", title="Is Read"
    )
    is_reply: Optional[bool] = Field(
        None, description="Whether message is a reply", title="Is Reply"
    )
    parent_message_id: Optional[str] = Field(
        None, description="Parent message ID if reply", title="Parent Message ID"
    )
    attachments: Optional[List[str]] = Field(
        None, description="List of attachment file names", title="Attachments"
    )
    language: Optional[str] = Field(
        None, description="Message language", title="Language"
    )
    sentiment: Optional[str] = Field(
        None, description="Message sentiment analysis", title="Sentiment"
    )
    keywords: Optional[List[str]] = Field(
        None, description="Extracted keywords", title="Keywords"
    )
    entities: Optional[List[str]] = Field(
        None, description="Named entities found in message", title="Entities"
    )
    source: Optional[str] = Field(
        None, description="Source of message information", title="Source"
    )
    is_suspicious: Optional[bool] = Field(
        None, description="Whether message is suspicious", title="Is Suspicious"
    )
    threat_level: Optional[str] = Field(
        None, description="Threat level assessment", title="Threat Level"
    )
