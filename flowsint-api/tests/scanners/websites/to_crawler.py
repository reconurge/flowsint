import requests
from unittest.mock import patch, MagicMock
from app.scanners.websites.to_crawler import WebsiteToCrawler, get_email, get_phone, get_individuals
from app.types.website import Website
from app.types.individual import Individual

scanner = WebsiteToCrawler("sketch_123", "scan_123")

def test_preprocess_valid_websites():
    """Test preprocessing with valid Website objects."""
    websites = [
        Website(url="https://example.com"),
        Website(url="https://example2.com"),
    ]
    result = scanner.preprocess(websites)
    
    result_urls = [str(w.url) for w in result]
    expected_urls = [str(w.url) for w in websites]

    assert result_urls == expected_urls

def test_preprocess_string_urls():
    """Test preprocessing with string URLs."""
    urls = [
        "https://example.com",
        "https://example2.com",
    ]
    result = scanner.preprocess(urls)
    
    result_urls = [str(w.url).rstrip('/') for w in result]
    expected_urls = [url.rstrip('/') for url in urls]
    assert result_urls == expected_urls

def test_preprocess_dict_urls():
    """Test preprocessing with dictionary URLs."""
    url_dicts = [
        {"url": "https://example.com"},
        {"url": "https://example2.com"},
    ]
    result = scanner.preprocess(url_dicts)
    
    result_urls = [str(w.url).rstrip('/') for w in result]
    expected_urls = ["https://example.com", "https://example2.com"]
    assert result_urls == expected_urls

def test_preprocess_mixed_formats():
    """Test preprocessing with mixed input formats."""
    mixed_input = [
        {"url": "https://example.com"},
        {"invalid_key": "https://example.io"},
        Website(url="https://example.org"),
        "https://example.net",
    ]
    result = scanner.preprocess(mixed_input)

    result_urls = [str(w.url).rstrip('/') for w in result]
    assert "https://example.com" in result_urls
    assert "https://example.org" in result_urls
    assert "https://example.net" in result_urls
    assert "https://example.io" not in result_urls

def test_preprocess_invalid_inputs():
    """Test preprocessing with invalid inputs."""
    invalid_inputs = [
        {"invalid_key": "https://example.com"},
        {"not_url": "some text"},
        None,
        123,
    ]
    result = scanner.preprocess(invalid_inputs)
    
    # Should return empty list for invalid inputs
    assert result == []

def test_get_email():
    """Test email extraction from HTML content."""
    html_content = """
    <html>
        <body>
            <p>Contact us at test@example.com</p>
            <p>Or email support@example.com</p>
            <p>Also try admin@example.com</p>
        </body>
    </html>
    """
    
    emails = get_email(html_content)
    expected_emails = ["test@example.com", "support@example.com", "admin@example.com"]
    
    assert set(emails) == set(expected_emails)

def test_get_email_no_emails():
    """Test email extraction when no emails are present."""
    html_content = "<html><body><p>No emails here</p></body></html>"
    
    emails = get_email(html_content)
    assert emails == []

def test_get_phone():
    """Test phone extraction from HTML content."""
    html_content = """
    <html>
        <body>
            <p>Call us at +1-555-123-4567</p>
            <p>Or try (555) 987-6543</p>
            <p>Also 555-111-2222</p>
        </body>
    </html>
    """
    
    phones = get_phone(html_content)
    # Should find phone numbers in various formats
    assert len(phones) > 0

def test_get_phone_no_phones():
    """Test phone extraction when no phones are present."""
    html_content = "<html><body><p>No phones here</p></body></html>"
    
    phones = get_phone(html_content)
    assert phones == []

def test_remove_dup_email():
    """Test duplicate email removal."""
    from app.scanners.websites.to_crawler import remove_dup_email
    
    emails = ["test@example.com", "support@example.com", "test@example.com", "admin@example.com"]
    unique_emails = remove_dup_email(emails)
    
    assert len(unique_emails) == 3
    assert "test@example.com" in unique_emails
    assert "support@example.com" in unique_emails
    assert "admin@example.com" in unique_emails

def test_remove_dup_phone():
    """Test duplicate phone removal."""
    from app.scanners.websites.to_crawler import remove_dup_phone
    
    phones = ["+1-555-123-4567", "(555) 987-6543", "+1-555-123-4567", "555-111-2222"]
    unique_phones = remove_dup_phone(phones)
    
    assert len(unique_phones) == 3

def test_remove_dup_individual():
    """Test duplicate individual removal."""
    from app.scanners.websites.to_crawler import remove_dup_individual
    
    individuals = [
        Individual(first_name="John", last_name="Doe", full_name="John Doe"),
        Individual(first_name="Jane", last_name="Smith", full_name="Jane Smith"),
        Individual(first_name="John", last_name="Doe", full_name="John Doe"),  # Duplicate
        Individual(first_name="Bob", last_name="Johnson", full_name="Bob Johnson")
    ]
    unique_individuals = remove_dup_individual(individuals)
    
    assert len(unique_individuals) == 3
    assert unique_individuals[0].full_name == "John Doe"
    assert unique_individuals[1].full_name == "Jane Smith"
    assert unique_individuals[2].full_name == "Bob Johnson"

@patch('requests.get')
def test_crawl_website_success(mock_get):
    """Test successful website crawling."""
    # Mock successful response
    mock_response = MagicMock()
    mock_response.status_code = 200
    html = '<html><body><p>Contact: test@example.com</p><p>Phone: (555) 123-4567</p></body></html>'
    mock_response.content = html.encode('utf-8')
    mock_response.text = html
    mock_response.encoding = 'utf-8'
    mock_response.url = 'https://example.com'
    mock_get.return_value = mock_response
    
    result = scanner.crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert "test@example.com" in result["emails"]
    assert "+1-555-123-4567" in result["phones"]

@patch('requests.get')
def test_crawl_website_with_contact_page(mock_get):
    """Test website crawling with contact page."""
    # Mock main page response
    main_html = '<html><body><a href="/contact">Contact</a><p>main@example.com</p></body></html>'
    main_response = MagicMock()
    main_response.status_code = 200
    main_response.content = main_html.encode('utf-8')
    main_response.text = main_html
    main_response.encoding = 'utf-8'
    main_response.url = 'https://example.com'
    
    # Mock contact page response
    contact_html = '<html><body><p>contact@example.com</p><p>(555) 987-6543</p></body></html>'
    contact_response = MagicMock()
    contact_response.status_code = 200
    contact_response.content = contact_html.encode('utf-8')
    contact_response.text = contact_html
    contact_response.encoding = 'utf-8'
    contact_response.url = 'https://example.com/contact'
    
    # Configure mock to return different responses
    mock_get.side_effect = [main_response, contact_response]
    
    result = scanner.crawl_website_comprehensive("https://example.com")
    
    assert "main@example.com" in result["emails"]
    assert "contact@example.com" in result["emails"]
    assert "+1-555-987-6543" in result["phones"]

@patch('requests.get')
def test_crawl_website_http_error(mock_get):
    """Test website crawling with HTTP error."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_get.return_value = mock_response
    
    result = scanner.crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert result["emails"] == []
    assert result["phones"] == []

@patch('requests.get')
def test_crawl_website_connection_error(mock_get):
    """Test website crawling with connection error."""
    mock_get.side_effect = requests.RequestException("Connection failed")
    
    result = scanner.crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert result["emails"] == []
    assert result["phones"] == []

@patch('app.scanners.websites.to_crawler.crawl_website_comprehensive')
def test_scan_successful_crawl(mock_crawl):
    """Test successful website scanning."""
    websites = [Website(url="https://example.com")]
    
    # Mock crawl result
    mock_crawl.return_value = {
        "website": "https://example.com",
        "emails": ["test@example.com", "support@example.com"],
        "phones": ["+1-555-123-4567"],
        "individuals": ["John Doe", "Jane Smith"]
    }
    
    result = scanner.scan(websites)
    
    # Should return structured result
    assert len(result) == 1
    website_result = result[0]
    
    assert website_result["website"] == "https://example.com"
    assert len(website_result["emails"]) == 2
    assert len(website_result["phones"]) == 1
    assert len(website_result["individuals"]) == 2
    
    assert website_result["emails"][0].email == "test@example.com"
    assert website_result["emails"][1].email == "support@example.com"
    assert website_result["phones"][0].number == "+1-555-123-4567"
    assert website_result["individuals"][0].full_name == "John Doe"
    assert website_result["individuals"][1].full_name == "Jane Smith"

@patch('app.scanners.websites.to_crawler.crawl_website_comprehensive')
def test_scan_no_results(mock_crawl):
    """Test scanning with no results."""
    websites = [Website(url="https://example.com")]
    
    # Mock empty crawl result
    mock_crawl.return_value = {
        "website": "https://example.com",
        "emails": [],
        "phones": [],
        "individuals": []
    }
    
    result = scanner.scan(websites)
    
    assert len(result) == 1
    website_result = result[0]
    assert website_result["website"] == "https://example.com"
    assert website_result["emails"] == []
    assert website_result["phones"] == []
    assert website_result["individuals"] == []

@patch('app.scanners.websites.to_crawler.crawl_website_comprehensive')
def test_scan_exception_handling(mock_crawl):
    """Test scanning with exception handling."""
    websites = [Website(url="https://example.com")]
    
    # Mock exception
    mock_crawl.side_effect = Exception("Crawl failed")
    
    result = scanner.scan(websites)
    
    # Should handle exception gracefully and return empty result for failed website
    assert len(result) == 1
    website_result = result[0]
    assert website_result["website"] == "https://example.com"
    assert website_result["emails"] == []
    assert website_result["phones"] == []
    assert website_result["individuals"] == []

@patch('app.scanners.websites.to_crawler.crawl_website_comprehensive')
def test_scan_multiple_websites(mock_crawl):
    """Test scanning multiple websites."""
    websites = [
        Website(url="https://example.com"),
        Website(url="https://example.org"),
    ]
    
    # Mock different results for each website
    def mock_crawl_side_effect(url):
        if "example.com" in url:
            return {
                "website": url,
                "emails": ["test@example.com"],
                "phones": ["+1-555-123-4567"],
                "individuals": ["John Doe"]
            }
        else:
            return {
                "website": url,
                "emails": ["admin@example.org"],
                "phones": ["+1-555-987-6543"],
                "individuals": ["Jane Smith"]
            }
    
    mock_crawl.side_effect = mock_crawl_side_effect
    
    result = scanner.scan(websites)
    
    # Should process both websites
    assert len(result) == 2
    
    # Check first website results
    website1_result = result[0]
    assert website1_result["website"] == "https://example.com"
    assert len(website1_result["emails"]) == 1
    assert len(website1_result["phones"]) == 1
    assert len(website1_result["individuals"]) == 1
    assert website1_result["emails"][0].email == "test@example.com"
    assert website1_result["phones"][0].number == "+1-555-123-4567"
    assert website1_result["individuals"][0].full_name == "John Doe"
    
    # Check second website results
    website2_result = result[1]
    assert website2_result["website"] == "https://example.org"
    assert len(website2_result["emails"]) == 1
    assert len(website2_result["phones"]) == 1
    assert len(website2_result["individuals"]) == 1
    assert website2_result["emails"][0].email == "admin@example.org"
    assert website2_result["phones"][0].number == "+1-555-987-6543"
    assert website2_result["individuals"][0].full_name == "Jane Smith"

def test_postprocess():
    """Test postprocessing method."""
    original_input = [Website(url="https://example.com")]
    results = [{"url": "https://example.com", "data": "some data"}]
    
    processed = scanner.postprocess(results, original_input)
    
    # Postprocess should return results as-is for now
    assert processed == results

def test_schemas():
    """Test input and output schemas."""
    input_schema = scanner.input_schema()
    output_schema = scanner.output_schema()
    
    # Verify input schema structure
    assert "type" in input_schema
    assert "properties" in input_schema
    # The type could be Website or Domain depending on the schema generation
    assert input_schema["type"] in ["Website", "Domain"]
    
    # Verify output schema structure
    assert "type" in output_schema
    assert "properties" in output_schema
    assert output_schema["type"] == "WebsiteResult"
    
    # Check that individuals are included in the output schema
    properties = output_schema["properties"]
    individual_property = next((prop for prop in properties if prop["name"] == "individuals"), None)
    assert individual_property is not None
    assert individual_property["type"] == "Individual[]"

def test_scanner_metadata():
    """Test scanner class metadata methods."""
    assert scanner.name() == "to_crawler"
    assert scanner.category() == "Website"
    assert scanner.key() == "url" 
    
def test_url_without_protocol():
    """Test crawling URL without protocol."""
    with patch('requests.get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        html = '<html><body><p>test@example.com</p></body></html>'
        mock_response.content = html.encode('utf-8')
        mock_response.text = html
        mock_response.encoding = 'utf-8'
        mock_response.url = 'https://example.com'
        mock_get.return_value = mock_response
        
        result = scanner.crawl_website_comprehensive("example.com")
        
        # Should add https:// protocol
        mock_get.assert_called_with("https://example.com", verify=False, timeout=30)
        assert "test@example.com" in result["emails"]

def test_execute():
    """Test execute method."""
    with patch('app.scanners.websites.to_crawler.crawl_website_comprehensive') as mock_crawl:
        mock_crawl.return_value = {
            "website": "https://example.com",
            "emails": ["test@example.com"],
            "phones": ["+1-555-123-4567"],
            "individuals": ["John Doe"]
        }
        
        result = scanner.execute(["https://example.com"])
        
        # Should return structured result with website, emails, phones, and individuals
        assert len(result) == 1
        website_result = result[0]
        assert str(website_result["website"]) == "https://example.com"
        assert len(website_result["emails"]) == 1
        assert len(website_result["phones"]) == 1
        assert len(website_result["individuals"]) == 1
        assert website_result["emails"][0].email == "test@example.com"
        assert website_result["phones"][0].number == "+1-555-123-4567"
        assert website_result["individuals"][0].full_name == "John Doe"

def test_get_individuals():
    """Test individuals extraction from HTML content."""
    html_content = """
    <html>
        <body>
            <p>Individuals: John Doe, Jane Smith</p>
        </body>
    </html>
    """
    
    individuals = get_individuals(html_content)
    expected_individuals = ["John Doe", "Jane Smith"]
    
    assert set(individuals) == set(expected_individuals)

def test_get_individuals_no_individuals():
    """Test individuals extraction when no individuals are present."""
    html_content = "<html><body><p>No individuals here</p></body></html>"
    
    individuals = get_individuals(html_content)
    assert individuals == []

def test_crawl_website_comprehensive():
    """Test comprehensive website crawling."""
    # Mock comprehensive crawl result
    mock_result = {
        "website": "https://example.com",
        "emails": ["test@example.com", "support@example.com"],
        "phones": ["+1-555-123-4567"],
        "individuals": ["John Doe", "Jane Smith"]
    }
    
    result = crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert "test@example.com" in result["emails"]
    assert "+1-555-123-4567" in result["phones"]
    assert "John Doe" in result["individuals"]
    assert "Jane Smith" in result["individuals"]

def test_crawl_website_comprehensive_no_individuals():
    """Test comprehensive website crawling with no individuals."""
    # Mock comprehensive crawl result without individuals
    mock_result = {
        "website": "https://example.com",
        "emails": ["test@example.com", "support@example.com"],
        "phones": ["+1-555-123-4567"],
        "individuals": []
    }
    
    result = crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert "test@example.com" in result["emails"]
    assert "+1-555-123-4567" in result["phones"]
    assert result["individuals"] == []

def test_crawl_website_comprehensive_http_error():
    """Test comprehensive website crawling with HTTP error."""
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_get.return_value = mock_response
    
    result = crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert result["emails"] == []
    assert result["phones"] == []
    assert result["individuals"] == []

def test_crawl_website_comprehensive_connection_error():
    """Test comprehensive website crawling with connection error."""
    mock_get.side_effect = requests.RequestException("Connection failed")
    
    result = crawl_website_comprehensive("https://example.com")
    
    assert result["website"] == "https://example.com"
    assert result["emails"] == []
    assert result["phones"] == []
    assert result["individuals"] == []

    