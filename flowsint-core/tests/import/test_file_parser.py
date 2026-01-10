from unittest.mock import patch

from flowsint_types import Domain, Ip, Username

from flowsint_core.imports import (
    EntityPreview,
    FileParseResult,
    parse_import_file,
)


def test_parse_import_file_txt_basic_with_mocked_detect_type():
    txt_bytes = b"domain.com\nblog.domain.com\n12.34.56.78\nmy_super_username"

    result = parse_import_file(txt_bytes, "values.txt", max_preview_rows=100)

    assert isinstance(result, FileParseResult)
    assert result.total_entities == 4

    first = result.entities["Domain"].results[0]
    assert isinstance(first, EntityPreview)
    assert isinstance(first.obj, Domain)
    assert first.detected_type == "Domain"
    assert first.obj.domain == "domain.com"

    second = result.entities["Domain"].results[1]
    assert isinstance(second, EntityPreview)
    assert isinstance(second.obj, Domain)
    assert second.detected_type == "Domain"
    assert second.obj.domain == "blog.domain.com"

    third = result.entities["Ip"].results[0]
    assert isinstance(third, EntityPreview)
    assert isinstance(third.obj, Ip)
    assert third.detected_type == "Ip"
    assert third.obj.address == "12.34.56.78"

    fourth = result.entities["Username"].results[0]
    assert isinstance(fourth, EntityPreview)
    assert isinstance(fourth.obj, Username)
    assert fourth.detected_type == "Username"
    assert fourth.obj.value == "my_super_username"
