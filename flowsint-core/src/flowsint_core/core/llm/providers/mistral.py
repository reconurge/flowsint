from typing import AsyncIterator, List

from ..types import ChatMessage, MessageRole


_ROLE_MAP = {
    MessageRole.SYSTEM: "SystemMessage",
    MessageRole.USER: "UserMessage",
    MessageRole.ASSISTANT: "AssistantMessage",
}


class MistralProvider:
    def __init__(self, api_key: str, model: str = "mistral-small-latest"):
        from mistralai import Mistral

        self._client = Mistral(api_key=api_key)
        self._model = model

    def _build_messages(self, messages: List[ChatMessage]):
        from mistralai.models import UserMessage, AssistantMessage, SystemMessage

        type_map = {
            MessageRole.SYSTEM: SystemMessage,
            MessageRole.USER: UserMessage,
            MessageRole.ASSISTANT: AssistantMessage,
        }
        return [type_map[m.role](content=m.content) for m in messages]

    async def stream(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        sdk_messages = self._build_messages(messages)

        response = await self._client.chat.stream_async(
            model=self._model, messages=sdk_messages
        )

        async for chunk in response:
            if chunk.data.choices[0].delta.content is not None:
                yield chunk.data.choices[0].delta.content

    async def complete(self, messages: List[ChatMessage]) -> str:
        sdk_messages = self._build_messages(messages)

        response = await self._client.chat.complete_async(
            model=self._model, messages=sdk_messages
        )

        return response.choices[0].message.content
