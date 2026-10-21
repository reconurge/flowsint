from typing import AsyncIterator, List, Protocol

from .types import ChatMessage


class LLMProvider(Protocol):
    # ``stream`` is an async *generator*, not a coroutine: every implementation
    # is written as ``async def stream(...): yield ...``, so calling it returns
    # an AsyncIterator directly and callers iterate it rather than awaiting the
    # call. Only ``complete`` is a coroutine. Declaring ``stream`` as ``async
    # def`` described a coroutine *returning* an AsyncIterator, which no
    # implementation satisfies.
    def stream(self, messages: List[ChatMessage]) -> AsyncIterator[str]: ...
    async def complete(self, messages: List[ChatMessage]) -> str: ...
