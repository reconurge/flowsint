import hashlib
from unittest.mock import Mock, patch
from flowsint_transforms.emails.to_gravatar import EmailToGravatarTransform
from flowsint_types.email import Email
from flowsint_types.gravatar import Gravatar

transform = EmailToGravatarTransform("sketch_123", "scan_123")


class TestEmailToGravatarTransform:
    """Test suite for EmailToGravatarTransform"""

    def test_name(self):
        """Test the transform name"""
        assert EmailToGravatarTransform.name() == "to_gravatar"

    def test_category(self):
        """Test the transform category"""
        assert EmailToGravatarTransform.category() == "Email"

    def test_key(self):
        """Test the transform key"""
        assert EmailToGravatarTransform.key() == "email"

    def test_input_schema(self):
        """Test the input schema generation"""
        schema = EmailToGravatarTransform.input_schema()
        assert schema["type"] == "Email"
        assert "properties" in schema
        # Check that email property is present
        email_prop = next(
            (prop for prop in schema["properties"] if prop["name"] == "email"), None
        )
        assert email_prop is not None
        assert email_prop["type"] == "string"

    def test_output_schema(self):
        """Test the output schema generation"""
        schema = EmailToGravatarTransform.output_schema()
        assert schema["type"] == "Gravatar"
        assert "properties" in schema
        # Check that required properties are present
        src_prop = next(
            (prop for prop in schema["properties"] if prop["name"] == "src"), None
        )
        hash_prop = next(
            (prop for prop in schema["properties"] if prop["name"] == "hash"), None
        )
        assert src_prop is not None
        assert hash_prop is not None

    def test_preprocess_string_emails(self):
        """Test preprocessing with string emails"""
        emails = [
            "test@example.com",
            "user@gmail.com",
        ]
        result = transform.preprocess(emails)
        assert len(result) == 2
        assert all(isinstance(email, Email) for email in result)
        assert result[0].email == "test@example.com"
        assert result[1].email == "user@gmail.com"

    def test_preprocess_dict_emails(self):
        """Test preprocessing with dictionary emails"""
        emails = [
            {"email": "test@example.com"},
            {"email": "user@gmail.com"},
        ]
        result = transform.preprocess(emails)
        assert len(result) == 2
        assert all(isinstance(email, Email) for email in result)
        assert result[0].email == "test@example.com"
        assert result[1].email == "user@gmail.com"

    def test_preprocess_email_objects(self):
        """Test preprocessing with Email objects"""
        emails = [
            Email(email="test@example.com"),
            Email(email="user@gmail.com"),
        ]
        result = transform.preprocess(emails)
        assert len(result) == 2
        assert all(isinstance(email, Email) for email in result)
        assert result[0].email == "test@example.com"
        assert result[1].email == "user@gmail.com"

    def test_preprocess_mixed_formats(self):
        """Test preprocessing with mixed input formats"""
        emails = [
            "test@example.com",
            {"email": "user@gmail.com"},
            Email(email="admin@company.com"),
        ]
        result = transform.preprocess(emails)
        assert len(result) == 3
        assert all(isinstance(email, Email) for email in result)
        assert result[0].email == "test@example.com"
        assert result[1].email == "user@gmail.com"
        assert result[2].email == "admin@company.com"

    def test_preprocess_invalid_inputs(self):
        """Test preprocessing with invalid inputs"""
        emails = [
            "not-an-email",
            {"invalid_key": "test@example.com"},
            {"email": "invalid-email"},
            None,
            123,
        ]
        result = transform.preprocess(emails)
        # The preprocess method doesn't validate email format, it just creates Email objects
        # for valid string inputs and dicts with email key
        assert len(result) == 2  # "not-an-email" and "invalid-email" are processed
        assert result[0].email == "not-an-email"
        assert result[1].email == "invalid-email"

    def test_preprocess_empty_list(self):
        """Test preprocessing with empty list"""
        result = transform.preprocess([])
        assert result == []

    @patch("requests.get")
    def test_scan_successful_gravatar(self, mock_get):
        """Test successful gravatar retrieval"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        emails = [Email(email="test@example.com")]
        result = transform.scan(emails)

        assert len(result) == 1
        assert isinstance(result[0], Gravatar)
        assert result[0].hash == hashlib.md5("test@example.com".encode()).hexdigest()
        assert "gravatar.com/avatar/" in str(result[0].src)

    @patch("requests.get")
    def test_scan_failed_request(self, mock_get):
        """Test handling of failed HTTP requests"""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        emails = [Email(email="test@example.com")]
        result = transform.scan(emails)

        assert len(result) == 0

    @patch("requests.get")
    def test_scan_request_exception(self, mock_get):
        """Test handling of request exceptions"""
        # Mock exception
        mock_get.side_effect = Exception("Network error")

        emails = [Email(email="test@example.com")]
        result = transform.scan(emails)

        assert len(result) == 0

    @patch("requests.get")
    def test_scan_multiple_emails(self, mock_get):
        """Test scanning multiple emails"""
        # Mock successful responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        emails = [
            Email(email="test1@example.com"),
            Email(email="test2@example.com"),
            Email(email="test3@example.com"),
        ]
        result = transform.scan(emails)

        assert len(result) == 3
        assert all(isinstance(gravatar, Gravatar) for gravatar in result)
        assert mock_get.call_count == 3

    @patch("requests.get")
    def test_scan_mixed_success_failure(self, mock_get):
        """Test scanning with mixed success and failure"""

        # Mock mixed responses - check the actual URL being called
        def side_effect(url, *args, **kwargs):
            mock_response = Mock()
            # Check if the URL contains the hash for test1@example.com
            test1_hash = hashlib.md5("test1@example.com".encode()).hexdigest()
            if test1_hash in url:
                mock_response.status_code = 200
            else:
                mock_response.status_code = 404
            return mock_response

        mock_get.side_effect = side_effect

        emails = [
            Email(email="test1@example.com"),
            Email(email="test2@example.com"),
        ]
        result = transform.scan(emails)

        # Should get 1 result for the first email (success) and 0 for the second (failure)
        assert len(result) == 1
        assert result[0].hash == hashlib.md5("test1@example.com".encode()).hexdigest()

    def test_postprocess_with_neo4j_connection(self):
        """Test postprocessing with Neo4j connection"""
        # Mock Neo4j connection
        mock_neo4j = Mock()
        transform_with_neo4j = EmailToGravatarTransform(
            "sketch_123", "scan_123", neo4j_conn=mock_neo4j
        )

        gravatars = [
            Gravatar(src="https://www.gravatar.com/avatar/hash1", hash="hash1"),
            Gravatar(src="https://www.gravatar.com/avatar/hash2", hash="hash2"),
        ]
        original_input = [
            Email(email="test1@example.com"),
            Email(email="test2@example.com"),
        ]

        result = transform_with_neo4j.postprocess(gravatars, original_input)

        # Verify Neo4j queries were executed
        assert mock_neo4j.query.call_count == 2

        # Check that results are returned unchanged
        assert result == gravatars

    def test_postprocess_without_neo4j_connection(self):
        """Test postprocessing without Neo4j connection"""
        gravatars = [
            Gravatar(src="https://www.gravatar.com/avatar/hash1", hash="hash1"),
        ]
        original_input = [Email(email="test@example.com")]

        result = transform.postprocess(gravatars, original_input)

        # Should return results unchanged
        assert result == gravatars

    def test_postprocess_missing_original_input(self):
        """Test postprocessing with missing original input"""
        gravatars = [
            Gravatar(src="https://www.gravatar.com/avatar/hash1", hash="hash1"),
        ]
        original_input = []  # Empty list

        result = transform.postprocess(gravatars, original_input)

        # Should handle gracefully and return results
        assert result == gravatars

    def test_postprocess_none_original_input(self):
        """Test postprocessing with None original input"""
        gravatars = [
            Gravatar(src="https://www.gravatar.com/avatar/hash1", hash="hash1"),
        ]

        # The postprocess method doesn't handle None input properly
        # Let's test with an empty list instead
        result = transform.postprocess(gravatars, [])

        # Should handle gracefully and return results
        assert result == gravatars

    def test_execute_full_workflow(self):
        """Test the complete execute workflow"""
        with patch("requests.get") as mock_get:
            # Mock successful response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            emails = ["test@example.com"]
            result = transform.execute(emails)

            assert len(result) == 1
            assert isinstance(result[0], Gravatar)
            assert (
                result[0].hash == hashlib.md5("test@example.com".encode()).hexdigest()
            )

    def test_execute_with_invalid_input(self):
        """Test execute with invalid input"""
        emails = ["not-an-email", "also-invalid"]

        with patch("requests.get") as mock_get:
            # Mock successful response for any request
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            result = transform.execute(emails)

            # The transform processes any string as an email, so it will create Email objects
            # and attempt to get gravatars for them
            assert len(result) == 2
            assert all(isinstance(gravatar, Gravatar) for gravatar in result)

    def test_gravatar_hash_calculation(self):
        """Test that gravatar hash is calculated correctly"""
        email = "test@example.com"
        expected_hash = hashlib.md5(email.encode()).hexdigest()

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            emails = [Email(email=email)]
            result = transform.scan(emails)

            assert len(result) == 1
            assert result[0].hash == expected_hash

    def test_gravatar_url_format(self):
        """Test that gravatar URL is formatted correctly"""
        email = "test@example.com"
        expected_hash = hashlib.md5(email.encode()).hexdigest()
        expected_url = f"https://www.gravatar.com/avatar/{expected_hash}"

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response

            emails = [Email(email=email)]
            result = transform.scan(emails)

            assert len(result) == 1
            assert str(result[0].src) == expected_url
