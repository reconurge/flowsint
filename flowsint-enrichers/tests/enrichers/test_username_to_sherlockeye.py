import pytest
from unittest.mock import MagicMock, patch

from flowsint_enrichers.social.to_sherlockeye import UsernameToSherlockeye, _extract_username_from_url
from flowsint_types.social_account import SocialAccount
from flowsint_types.username import Username


# --- Metadata ---

def test_enricher_metadata():
    assert UsernameToSherlockeye.name() == "username_to_sherlockeye"
    assert UsernameToSherlockeye.category() == "social"
    assert UsernameToSherlockeye.key() == "username"


def test_type_definitions():
    assert UsernameToSherlockeye.InputType == Username
    assert UsernameToSherlockeye.OutputType == SocialAccount


def test_params_schema_has_api_key():
    schema = UsernameToSherlockeye.get_params_schema()
    names = [p["name"] for p in schema]
    assert "SHERLOCKEYE_API_KEY" in names
    api_key_param = next(p for p in schema if p["name"] == "SHERLOCKEYE_API_KEY")
    assert api_key_param["type"] == "vaultSecret"
    assert api_key_param["required"] is True


# --- Username extraction helper ---

def test_extract_username_from_url_standard():
    assert _extract_username_from_url("https://twitter.com/johndoe") == "johndoe"


def test_extract_username_from_url_trailing_slash():
    assert _extract_username_from_url("https://github.com/johndoe/") == "johndoe"


def test_extract_username_from_url_none():
    assert _extract_username_from_url(None) is None


def test_extract_username_from_url_too_short():
    assert _extract_username_from_url("https://example.com/x") is None


# --- Scan (mocked HTTP) ---

@pytest.mark.asyncio
async def test_scan_returns_social_accounts():
    enricher = UsernameToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "type": "username",
            "value": "johndoe",
            "status": "complete",
            "results": [
                {
                    "id": "result-1",
                    "source": "twitter",
                    "attributes": {"link": "https://twitter.com/johndoe"},
                },
                {
                    "id": "result-2",
                    "source": "github",
                    "attributes": {"username": "johndoe", "name": "John Doe"},
                },
            ],
        },
    }

    with patch("flowsint_enrichers.social.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Username(value="johndoe")])

    assert len(results) == 2
    assert all(isinstance(r, SocialAccount) for r in results)

    twitter = next(r for r in results if r.platform == "twitter")
    assert twitter.profile_url == "https://twitter.com/johndoe"
    assert twitter.username.value == "johndoe"

    github = next(r for r in results if r.platform == "github")
    assert github.username.value == "johndoe"
    assert github.display_name == "John Doe"
    assert github.profile_url is None


@pytest.mark.asyncio
async def test_scan_no_results():
    enricher = UsernameToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {"type": "username", "value": "nobody", "status": "complete", "results": []},
    }

    with patch("flowsint_enrichers.social.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Username(value="nobody")])

    assert results == []


@pytest.mark.asyncio
async def test_scan_401_skips_gracefully():
    enricher = UsernameToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "bad-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch("flowsint_enrichers.social.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Username(value="johndoe")])

    assert results == []


@pytest.mark.asyncio
async def test_scan_no_link_falls_back_to_input_username():
    enricher = UsernameToSherlockeye(sketch_id="test", scan_id="test")
    enricher.params = {"SHERLOCKEYE_API_KEY": "fake-key", "deep_research": "false"}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "success": True,
        "data": {
            "type": "username",
            "value": "janedoe",
            "status": "complete",
            "results": [
                {"id": "r1", "source": "forum", "attributes": {}},
            ],
        },
    }

    with patch("flowsint_enrichers.social.to_sherlockeye.requests.post", return_value=mock_response):
        results = await enricher.scan([Username(value="janedoe")])

    assert len(results) == 1
    assert results[0].username.value == "janedoe"
    assert results[0].profile_url is None
