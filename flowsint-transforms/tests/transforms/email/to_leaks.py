import pytest
from unittest.mock import patch, MagicMock
from flowsint_transforms.emails.to_leaks import EmailToBreachesTransform
from flowsint_types.email import Email
from flowsint_types.breach import Breach

transform = EmailToBreachesTransform("sketch_123", "scan_123")


def test_transform_name():
    assert EmailToBreachesTransform.name() == "to_leaks"


def test_transform_category():
    assert EmailToBreachesTransform.category() == "Email"


def test_transform_key():
    assert EmailToBreachesTransform.key() == "email"


def test_preprocess_string_emails():
    emails = [
        "test@example.com",
        "user@domain.org",
    ]
    result = transform.preprocess(emails)
    expected_emails = [Email(email=email) for email in emails]
    assert result == expected_emails


def test_preprocess_dict_emails():
    emails = [
        {"email": "test@example.com"},
        {"email": "user@domain.org"},
    ]
    result = transform.preprocess(emails)
    expected_emails = [Email(email=email["email"]) for email in emails]
    assert result == expected_emails


def test_preprocess_email_objects():
    emails = [
        Email(email="test@example.com"),
        Email(email="user@domain.org"),
    ]
    result = transform.preprocess(emails)
    assert result == emails


def test_preprocess_mixed_formats():
    emails = [
        "test@example.com",
        {"email": "user@domain.org"},
        Email(email="admin@company.com"),
        {"invalid_key": "should_be_ignored@test.com"},
    ]
    result = transform.preprocess(emails)

    result_emails = [email.email for email in result]
    assert "test@example.com" in result_emails
    assert "user@domain.org" in result_emails
    assert "admin@company.com" in result_emails
    assert "should_be_ignored@test.com" not in result_emails


@patch("src.transforms.emails.to_leaks.requests.get")
def test_scan_successful_response(mock_get):
    # Mock successful API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {"Name": "TestBreach", "Title": "Test Breach", "Domain": "test.com"},
        {"Name": "AnotherBreach", "Title": "Another Breach", "Domain": "another.com"},
    ]
    mock_get.return_value = mock_response

    emails = [Email(email="test@example.com")]
    result = transform.scan(emails)

    assert len(result) == 2
    assert isinstance(result[0], Breach)
    assert isinstance(result[1], Breach)
    assert result[0].name == "testbreach"
    assert result[1].name == "anotherbreach"
    assert result[0].breach["name"] == "testbreach"
    assert result[1].breach["name"] == "anotherbreach"


@patch("src.transforms.emails.to_leaks.requests.get")
def test_scan_no_breaches_found(mock_get):
    # Mock 404 response (no breaches found)
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_get.return_value = mock_response

    emails = [Email(email="test@example.com")]
    result = transform.scan(emails)

    assert len(result) == 0


@patch("src.transforms.emails.to_leaks.requests.get")
def test_scan_api_error(mock_get):
    # Mock API error
    mock_get.side_effect = Exception("API Error")

    emails = [Email(email="test@example.com")]
    result = transform.scan(emails)

    assert len(result) == 0


@patch("src.transforms.emails.to_leaks.requests.get")
def test_scan_missing_name_field(mock_get):
    # Mock API response with missing "Name" field
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {"Title": "Test Breach", "Domain": "test.com"},  # Missing "Name" field
        {"Name": "ValidBreach", "Title": "Valid Breach", "Domain": "valid.com"},
    ]
    mock_get.return_value = mock_response

    emails = [Email(email="test@example.com")]
    result = transform.scan(emails)

    assert len(result) == 2
    assert result[0].name == "unknown"  # Should default to "unknown"
    assert result[1].name == "validbreach"  # Should use the provided name
    assert result[0].breach["title"] == "Test Breach"
    assert result[1].breach["name"] == "validbreach"


@patch("src.transforms.emails.to_leaks.HIBP_API_KEY", None)
def test_scan_no_api_key():
    """Test that transform raises ValueError when HIBP_API_KEY is not set."""
    emails = [Email(email="test@example.com")]

    with pytest.raises(ValueError, match="HIBP_API_KEY not set"):
        transform.scan(emails)


def test_postprocess():
    # Test postprocess method with mocked neo4j connection
    transform.neo4j_conn = MagicMock()

    # Create breach objects with the new structure
    breach1 = Breach(
        name="testbreach",
        title="Test Breach",
        domain="test.com",
        pwncount=1000,
        breach={"name": "testbreach", "title": "Test Breach"},
    )
    breach2 = Breach(
        name="anotherbreach",
        title="Another Breach",
        domain="another.com",
        pwncount=2000,
        breach={"name": "anotherbreach", "title": "Another Breach"},
    )

    breaches = [breach1, breach2]
    original_input = [Email(email="test@example.com")]

    result = transform.postprocess(breaches, original_input)

    assert result == breaches
    # Verify that neo4j queries were called:
    # - 2 breach node creation queries
    # - 1 email node creation query
    # - 2 relationship creation queries
    # Total: 5 queries
    assert transform.neo4j_conn.query.call_count == 5
