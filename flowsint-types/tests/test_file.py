"""Tests for File hash detection (issue #45)."""

from flowsint_types import File, Username

MD5 = "d41d8cd98f00b204e9800998ecf8427e"  # 32 hex
SHA1 = "da39a3ee5e6b4b0d3255bfef95601890afd80709"  # 40 hex
SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"  # 64 hex


def test_detect_md5():
    assert File.detect(MD5) is True


def test_detect_sha1():
    assert File.detect(SHA1) is True


def test_detect_sha256():
    assert File.detect(SHA256) is True


def test_detect_is_case_insensitive():
    assert File.detect(SHA256.upper()) is True


def test_detect_strips_whitespace():
    assert File.detect(f"  {MD5}  ") is True


def test_detect_rejects_non_hash():
    # Plain filename, wrong length, and non-hex strings are not detected.
    assert File.detect("report.pdf") is False
    assert File.detect("john_doe") is False
    assert File.detect("g" * 32) is False  # right length, not hex
    assert File.detect("abc123") is False  # hex but not a hash length


def test_from_string_populates_hash_fields():
    assert File.from_string(MD5).hash_md5 == MD5
    assert File.from_string(SHA1).hash_sha1 == SHA1
    assert File.from_string(SHA256).hash_sha256 == SHA256


def test_from_string_normalizes_hash_to_lowercase():
    f = File.from_string(SHA256.upper())
    assert f.hash_sha256 == SHA256  # stored lowercase
    assert f.filename == SHA256.upper()  # original kept as label


def test_from_string_plain_filename_unchanged():
    f = File.from_string("evil.exe")
    assert f.filename == "evil.exe"
    assert f.hash_md5 is None
    assert f.hash_sha1 is None
    assert f.hash_sha256 is None


def test_username_no_longer_claims_hashes():
    # Regression: hashes used to be mis-detected as usernames.
    assert Username.detect(MD5) is False
    assert Username.detect(SHA1) is False
    assert Username.detect(SHA256) is False
    # Real usernames still detected.
    assert Username.detect("john_doe") is True
