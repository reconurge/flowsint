from flowsint_transforms.ips.asn_to_cidrs import AsnToCidrsTransform
from flowsint_types.asn import ASN

transform = AsnToCidrsTransform("sketch_123", "scan_123")


def test_preprocess_valid_asns():
    asns = [
        ASN(number=15169),
        ASN(number=13335),
    ]
    result = transform.preprocess(asns)

    result_numbers = [asn.number for asn in result]
    expected_numbers = [asn.number for asn in asns]

    assert result_numbers == expected_numbers


def test_unprocessed_valid_asns():
    asns = [
        "15169",
        "13335",
    ]
    result = transform.preprocess(asns)
    result_asns = [asn for asn in result]
    expected_asns = [ASN(number=int(asn)) for asn in asns]
    assert result_asns == expected_asns


def test_preprocess_invalid_asns():
    asns = [
        ASN(number=15169),
        ASN(number=999999999999),  # Invalid ASN number
        ASN(number=13335),
    ]
    result = transform.preprocess(asns)

    result_numbers = [asn.number for asn in result]
    assert 15169 in result_numbers
    assert 13335 in result_numbers
    assert 999999999999 not in result_numbers


def test_preprocess_multiple_formats():
    asns = [
        {"number": 15169},
        {"invalid_key": 13335},
        ASN(number=13335),
        "15169",
    ]
    result = transform.preprocess(asns)

    result_numbers = [asn.number for asn in result]
    assert 15169 in result_numbers
    assert 13335 in result_numbers
    assert (
        "invalid_key" not in result_numbers
    )  # Should be filtered out due to invalid key


def test_schemas():
    input_schema = transform.input_schema()
    output_schema = transform.output_schema()

    # Input schema should have number field
    assert "properties" in input_schema
    number_prop = next(
        (prop for prop in input_schema["properties"] if prop["name"] == "number"), None
    )
    assert number_prop is not None
    assert number_prop["type"] == "integer"

    # Output schema should have network field
    assert "properties" in output_schema
    prop_names = [prop["name"] for prop in output_schema["properties"]]
    assert "network" in prop_names
