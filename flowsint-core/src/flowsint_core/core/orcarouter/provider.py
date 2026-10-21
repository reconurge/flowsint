"""OrcaRouter as a first-class ``LLMProvider``.

The wire format is OpenAI-compatible, so this speaks it directly over ``httpx``
— already a declared dependency of this package. The sibling OpenAI provider
imports the ``openai`` SDK lazily, but that package is not declared anywhere in
the workspace, so it is not usable at runtime; relying on it here would make the
integration depend on an undeclared import.

Two behaviours matter beyond the happy path:

* a ``401`` from the relay raises :class:`OrcaRouterReauthRequired`, which is
  *terminal*. An OrcaRouter key is durable and cannot be refreshed, so the
  credential is marked for reauthentication rather than retried in a loop.
* the API key travels only in the ``Authorization`` header. It is never put in a
  URL, a log line, or an error message.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

from ..llm.types import ChatMessage
from .catalog import Capability, CatalogModel, select_default_model
from .errors import OrcaRouterAuthError, OrcaRouterReauthRequired

#: Used when neither the caller nor the environment names a model, and live
#: discovery has not run. OrcaRouter's own routing entry — naming a specific
#: vendor model here would defeat the gateway's purpose.
DEFAULT_MODEL = "orcarouter/auto"

REQUEST_TIMEOUT_SECONDS = 120.0


class OrcaRouterProvider:
    """OpenAI-compatible chat provider for the OrcaRouter gateway."""

    def __init__(
        self,
        api_key: str,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        client: Any = None,
    ) -> None:
        if not api_key:
            raise ValueError("An OrcaRouter API key is required.")

        if base_url is None:
            from .config import current_endpoints

            base_url = current_endpoints().inference_base

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model or DEFAULT_MODEL
        self._client = client

    @property
    def model(self) -> str:
        return self._model

    @property
    def base_url(self) -> str:
        return self._base_url

    def _build_messages(self, messages: List[ChatMessage]) -> List[Dict[str, str]]:
        return [{"role": m.role.value, "content": m.content} for m in messages]

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _raise_for_status(self, status: int, body: str) -> None:
        if status == 401:
            # Terminal: an OrcaRouter key is durable and cannot be refreshed.
            raise OrcaRouterReauthRequired(
                "OrcaRouter rejected the stored key (HTTP 401). Reconnect the "
                "account or paste a new key."
            )
        if status == 403 and "model_access_denied" in body:
            # Observed live: a valid key whose workspace has not been granted the
            # model. Distinct from a credential problem — reauthorizing will not
            # help, so do not push the user toward it.
            raise OrcaRouterAuthError(
                f"Your OrcaRouter key does not have access to model {self._model!r}. "
                "Grant it access in the OrcaRouter console, or choose another model.",
                status=status,
            )
        if status == 429:
            raise OrcaRouterAuthError(
                "OrcaRouter rate-limited this request (HTTP 429). Retry shortly.",
                status=status,
            )
        raise OrcaRouterAuthError(
            f"OrcaRouter request failed with HTTP {status}.", status=status
        )

    async def _post_streaming(self, client: Any, payload: Dict[str, Any]) -> Any:
        request = client.build_request(
            "POST",
            f"{self._base_url}/chat/completions",
            headers=self._headers(),
            json=payload,
        )
        response = await client.send(request, stream=True)
        if response.status_code != 200:
            body = (await response.aread()).decode("utf-8", "replace")
            await response.aclose()
            self._raise_for_status(response.status_code, body)
        return response

    async def stream(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "messages": self._build_messages(messages),
            "stream": True,
        }

        import httpx

        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS)

        try:
            response = await self._post_streaming(client, payload)
            try:
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:") :].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(data)
                    except ValueError:
                        continue
                    choices = chunk.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    content = delta.get("content")
                    if content:
                        yield content
            finally:
                await response.aclose()
        finally:
            if owns_client:
                await client.aclose()

    async def complete(self, messages: List[ChatMessage]) -> str:
        payload = {
            "model": self._model,
            "messages": self._build_messages(messages),
        }

        import httpx

        client = self._client or httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS)
        try:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
        finally:
            if self._client is None:
                await client.aclose()

        if response.status_code != 200:
            self._raise_for_status(response.status_code, response.text)

        body = response.json()
        return str(body["choices"][0]["message"]["content"])


def default_model_for(models: List[CatalogModel]) -> Optional[str]:
    """First chat-eligible model in catalog order, preferring an ``auto`` route."""
    return select_default_model(models, Capability.CHAT)
