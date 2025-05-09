from pathlib import Path
from app.scanners.emails.holehe import HoleheScanner
from app.types.email import Email

scanner = HoleheScanner("sketch_123", "scan_123")

def test_unprocessed_valid_emails():
    emails = [
        "toto123@test.com",
        "DorianXd78@test.com",
    ]
    result = scanner.preprocess(emails)
    result_emails = [d for d in result]
    expected_emails = [Email(email=d) for d in emails]
    assert result_emails == expected_emails 
    
def test_preprocess_invalid_emails():
    emails = [
        Email(email="toto123@test.com"),
        Email(email="this-is-not-a-valid-email"),
        Email(email="this-is-not-a-valid-email@test"),
    ]
    result = scanner.preprocess(emails)

    result_emails = [d.email for d in result]
    assert "toto123@test.com" in result_emails
    assert "this-is-not-a-valid-email" not in result_emails
    assert "this-is-not-a-valid-email@test" not in result_emails

def test_preprocess_multiple_formats():
    emails = [
        {"email": "toto123@test.com"},
        {"invalid_key": "toto345@test.com"},
        Email(email="toto789@test.com"),
        "MySimpleInvalidEmail",
    ]
    result = scanner.preprocess(emails)

    result_emails = [d.email for d in result]
    assert "toto123@test.com" in result_emails
    assert "toto789@test.com" in result_emails
    assert "MySimpleInvalidEmail" not in result_emails
    assert "toto345@test.com" not in result_emails

def test_scan():
    output = scanner.execute(["eliott.morcillo@gmail.com"])
    print(output)
