import pytest

from flowsint_core.core.llm.factory import _SUPPORTED_PROVIDERS, create_llm_provider


@pytest.mark.parametrize("provider", _SUPPORTED_PROVIDERS)
def test_every_supported_provider_sdk_is_installed(provider):
    assert create_llm_provider(provider=provider, api_key="dummy") is not None
