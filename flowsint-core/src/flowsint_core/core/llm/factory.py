import os
from typing import Optional

from .protocol import LLMProvider


_SUPPORTED_PROVIDERS = ("mistral", "openai")

_DEFAULT_API_KEY_ENV = {
    "mistral": "MISTRAL_API_KEY",
    "openai": "OPENAI_API_KEY",
}


def create_llm_provider(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> LLMProvider:
    provider = provider or os.environ.get("LLM_PROVIDER", "mistral")

    if provider not in _SUPPORTED_PROVIDERS:
        raise ValueError(
            f"Unknown LLM provider '{provider}'. "
            f"Supported: {', '.join(_SUPPORTED_PROVIDERS)}"
        )

    if not api_key:
        env_var = _DEFAULT_API_KEY_ENV[provider]
        api_key = os.environ.get(env_var)
        if not api_key:
            raise ValueError(
                f"API key not configured. Set {env_var} environment variable "
                f"or pass api_key argument."
            )

    model_env = os.environ.get("LLM_MODEL")

    kwargs: dict = {"api_key": api_key}
    if model or model_env:
        kwargs["model"] = model or model_env

    if provider == "mistral":
        from .providers.mistral import MistralProvider

        return MistralProvider(**kwargs)

    if provider == "openai":
        from .providers.openai import OpenAIProvider

        return OpenAIProvider(**kwargs)

    # Unreachable due to the check above, but satisfies type checkers
    raise ValueError(f"Unknown provider: {provider}")
