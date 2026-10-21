import os
from typing import Optional

from .protocol import LLMProvider

_SUPPORTED_PROVIDERS = ("mistral", "openai", "orcarouter")

_DEFAULT_API_KEY_ENV = {
    "mistral": "MISTRAL_API_KEY",
    "openai": "OPENAI_API_KEY",
    # Deliberately the same name the vault uses, so a key stored through either
    # authentication entry point is found by both.
    "orcarouter": "ORCAROUTER_API_KEY",
}

#: Used when neither the caller nor ``LLM_MODEL`` names a model.
_DEFAULT_MODELS = {
    "mistral": "mistral-small-latest",
    "openai": "gpt-4o-mini",
    # OrcaRouter's own routing entry. Its purpose is adaptive routing across
    # vendors, so pinning a specific vendor model as the default would defeat it.
    "orcarouter": "orcarouter/auto",
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
    resolved_model = model or model_env
    if resolved_model:
        kwargs["model"] = resolved_model

    if provider == "mistral":
        from .providers.mistral import MistralProvider

        if not resolved_model:
            kwargs["model"] = _DEFAULT_MODELS["mistral"]
        return MistralProvider(**kwargs)

    if provider == "openai":
        from .providers.openai import OpenAIProvider

        if not resolved_model:
            kwargs["model"] = _DEFAULT_MODELS["openai"]
        return OpenAIProvider(**kwargs)

    if provider == "orcarouter":
        from ..orcarouter.provider import OrcaRouterProvider

        if not resolved_model:
            kwargs["model"] = _DEFAULT_MODELS["orcarouter"]
        return OrcaRouterProvider(**kwargs)

    # Unreachable due to the check above, but satisfies type checkers
    raise ValueError(f"Unknown provider: {provider}")
