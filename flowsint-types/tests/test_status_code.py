from flowsint_types.website import Website
import pytest


def test_website_valid_status_code():
    website = Website(url="http://test.com", status_code=200)
    assert website.status_code == 200


def test_website_invalid_status_code():
    with pytest.raises(Exception) as e_info:
        Website(url="http://test.com", status_code=600)
    assert "Input should be less than or equal to" in str(e_info.value)
