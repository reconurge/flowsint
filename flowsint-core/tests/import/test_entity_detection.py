from flowsint_types import Domain, Ip, Phone
from flowsint_core.imports import detect_type


def test_detection_domains():
    raw_domains = ["mydomain.com", "myseconddomain.com", "blog.subdomain.uk"]
    results = []
    for domain in raw_domains:
        DetectedType = detect_type(domain)
        if DetectedType:
            assert DetectedType is Domain
            py_obj = DetectedType.from_string(domain)
            assert isinstance(py_obj, Domain)
            results.append(py_obj)
    # domain 1
    assert results[0].domain == "mydomain.com"
    assert results[0].root == True
    # domain 2
    assert results[1].domain == "myseconddomain.com"
    assert results[1].root == True
    # domain 3
    assert results[2].domain == "blog.subdomain.uk"
    assert results[2].root == False


def test_detection_ips():
    raw_ips = ["240.123.123.234", "12.43.23.12"]
    results = []
    for ip in raw_ips:
        DetectedType = detect_type(ip)
        if DetectedType:
            assert DetectedType is Ip
            py_obj = DetectedType.from_string(ip)
            assert isinstance(py_obj, Ip)
            results.append(py_obj)
    # ip 1
    assert results[0].address == "240.123.123.234"
    # ip 2
    assert results[1].address == "12.43.23.12"


def test_detection_mixed():
    raw_obj = ["240.123.123.234", "my.domain.io", "+33632233223"]
    results = []
    for obj in raw_obj:
        DetectedType = detect_type(obj)
        print(DetectedType)
        if DetectedType:
            py_obj = DetectedType.from_string(obj)
            results.append(py_obj)

    # ip
    assert isinstance(results[0], Ip)
    assert results[0].address == "240.123.123.234"
    # domain
    assert isinstance(results[1], Domain)
    assert results[1].domain == "my.domain.io"
    assert results[1].root == False
    # phone
    assert isinstance(results[2], Phone)
    assert results[2].number == "+33632233223"
