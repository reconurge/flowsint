"""Regression tests for @-prefixed username detection."""

from flowsint_types import Username


def test_detects_plain_and_at_prefixed_usernames():
    assert Username.detect("johnDoe") is True
    assert Username.detect("user_123") is True
    assert Username.detect("@johnDoe") is True
    assert Username.detect("@user_123") is True
    assert Username.detect("  @test-user  ") is True


def test_rejects_invalid_or_incomplete_at_prefixed_values():
    assert Username.detect("@") is False
    assert Username.detect("@ab") is False
    assert Username.detect("@@johnDoe") is False
    assert Username.detect("@john doe") is False
    assert Username.detect("@user@domain") is False


def test_rejects_hashes_with_or_without_at_prefix():
    md5 = "d41d8cd98f00b204e9800998ecf8427e"
    assert Username.detect(md5) is False
    assert Username.detect(f"@{md5}") is False


def test_from_string_normalizes_at_prefix():
    username = Username.from_string("  @johnDoe  ")
    assert username.value == "johnDoe"
    assert username.nodeLabel == "johnDoe"
