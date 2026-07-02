import pytest
from unittest.mock import MagicMock, patch

from flowsint_enrichers.email.to_sherlockeye import (
    EmailToSherlockeye,
    SherlockyeEmailResult,
    _extract_username_from_url,
)
from flowsint_types.email import Email
from flowsint_types.social_account import SocialAccount


# --- Metadata ---

def test_enricher_metadata():
    assert EmailToSherlockeye.name() == "email_to_sherlockeye"
    assert EmailToSherlockeye.category() == "Email"
    assert EmailToSherlockeye.key() == "email"


def test_type_definitions():
    assert EmailToSherlockeye.InputType == Email
    assert EmailToSherlockeye.OutputType == SherlockyeEmailResult


def test_params_schema_has_api_key():
    schema = EmailToSherlockeye.get_params_schema()
    names = [p["name"] for p in schema]
    assert "SHERLOCKEYE_API_KEY" in names
    api_key_param = next(p for p in schema if p["name"] == "SHERLOCKEYE_API_KEY")
    assert api_key_param["type"] == "vaultSecret"
    assert api_key_param["required"] is True


# --- Username extraction helper ---

def test_extract_username_from_url_standard():
    assert _extract_username_from_url("https://twitter.com/johndoe") == "johndoe"


def test_extract_username_from_url_trailing_slash():
    assert _extract_username_from_url("https://twitter.com/johndoe/") == "johndoe"


def test_extract_username_from_url_none():
    assert _extract_username_from_url(None) is None


def test_extract_username_from_url_too_short():
    assert _extract_username_from_url("https://example.com/x") is None


# --- Scan (mocked HTTP) ---

@pytest.mark.asyncio
async def test_scan_returns_social_accounts():
    enricher = EmailToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "type": "email",
            "value": "someone@example.com",
            "status": "complete",
            "results": [
                {
                    "id": "result-1",
                    "source": "google",
                    "attributes": {"link": "https://profiles.google.com/someone"},
                },
                {
                    "id": "result-2",
                    "source": "linkedin",
                    "attributes": {"username": "johndoe", "name": "John Doe"},
                },
            ],
        },
    }

    with patch("flowsint_enrichers.email.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Email(email="someone@example.com")])

    assert len(results) == 2
    assert all(isinstance(r, SherlockyeEmailResult) for r in results)

    google_result = next(r for r in results if r.account.platform == "google")
    assert google_result.source_email == "someone@example.com"
    assert google_result.account.profile_url == "https://profiles.google.com/someone"
    assert google_result.account.username.value == "someone"

    linkedin_result = next(r for r in results if r.account.platform == "linkedin")
    assert linkedin_result.account.username.value == "johndoe"
    assert linkedin_result.account.display_name == "John Doe"
    assert linkedin_result.account.profile_url is None


@pytest.mark.asyncio
async def test_scan_no_results():
    enricher = EmailToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {"type": "email", "value": "nobody@example.com", "status": "complete", "results": []},
    }

    with patch("flowsint_enrichers.email.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Email(email="nobody@example.com")])

    assert results == []


@pytest.mark.asyncio
async def test_scan_401_skips_gracefully():
    enricher = EmailToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "bad-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch("flowsint_enrichers.email.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Email(email="someone@example.com")])

    assert results == []


@pytest.mark.asyncio
async def test_scan_attributes_no_link_falls_back_to_email_local_part():
    enricher = EmailToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "type": "email",
            "value": "jane@example.com",
            "status": "complete",
            "results": [
                {"id": "r1", "source": "forum", "attributes": {}},
            ],
        },
    }

    with patch("flowsint_enrichers.email.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Email(email="jane@example.com")])

    assert len(results) == 1
    assert results[0].account.username.value == "jane"
    assert results[0].account.profile_url is None
