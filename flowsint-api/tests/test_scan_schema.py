"""Response-schema tests for scans."""

from uuid import uuid4

from app.api.schemas.scan import ScanRead


def test_scan_read_exposes_error_message():
    """Clients must be able to distinguish a failed scan from empty results."""
    scan = ScanRead(
        id=uuid4(),
        sketch_id=None,
        status="FAILED",
        error="An error occurred: enricher failed",
    )

    assert scan.error == "An error occurred: enricher failed"
