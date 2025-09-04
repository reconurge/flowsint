import pytest
from unittest.mock import Mock, patch
from flowsint_transforms.websites.to_links import WebsiteToLinks
from flowsint_types.website import Website


class MockCrawlResults:
    def __init__(self, internal=None, external=None):
        self.internal = internal or []
        self.external = external or []


class MockCrawler:
    def __init__(self, url, recursive=True, verbose=False, _on_result_callback=None):
        self.url = url
        self.callback = _on_result_callback

    def fetch(self):
        pass

    def extract_urls(self):
        # Simulate callback calls
        if self.callback:
            self.callback("https://example.com/page1", is_external=False)
            self.callback("https://example.com/page2", is_external=False)
            self.callback("https://external.com/page", is_external=True)
            self.callback("https://another-external.org/resource", is_external=True)

    def get_results(self):
        return MockCrawlResults(
            internal=["https://example.com/page1", "https://example.com/page2"],
            external=[
                "https://external.com/page",
                "https://another-external.org/resource",
            ],
        )


@pytest.mark.asyncio
async def test_website_to_links_real_time_neo4j_creation():
    """Test that Neo4j nodes are created in real-time during the callback."""
    transform = WebsiteToLinks(sketch_id="test", scan_id="test")

    # Mock neo4j connection and methods
    transform.neo4j_conn = Mock()
    transform.create_node = Mock()
    transform.create_relationship = Mock()
    transform.log_graph_message = Mock()

    # Test input
    websites = [Website(url="https://example.com")]

    with patch("src.transforms.websites.to_links.Crawler", MockCrawler):
        results = await transform.scan(websites)

    # Verify main website and domain nodes were created upfront
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://example.com",
        caption="https://example.com",
        type="website",
    )
    transform.create_node.assert_any_call(
        "domain", "name", "example.com", caption="example.com", type="domain"
    )

    # Verify main website to domain relationship
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "domain",
        "name",
        "example.com",
        "BELONGS_TO_DOMAIN",
    )

    # Verify internal website nodes were created in callback
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://example.com/page1",
        caption="https://example.com/page1",
        type="website",
    )
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://example.com/page2",
        caption="https://example.com/page2",
        type="website",
    )

    # Verify internal website relationships
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "website",
        "url",
        "https://example.com/page1",
        "LINKS_TO",
    )
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "website",
        "url",
        "https://example.com/page2",
        "LINKS_TO",
    )

    # Verify external website nodes were created in callback
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://external.com/page",
        caption="https://external.com/page",
        type="website",
    )
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://another-external.org/resource",
        caption="https://another-external.org/resource",
        type="website",
    )

    # Verify external domain nodes were created in callback
    transform.create_node.assert_any_call(
        "domain", "name", "external.com", caption="external.com", type="domain"
    )
    transform.create_node.assert_any_call(
        "domain",
        "name",
        "another-external.org",
        caption="another-external.org",
        type="domain",
    )

    # Verify main website to external website relationships
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "website",
        "url",
        "https://external.com/page",
        "LINKS_TO",
    )
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "website",
        "url",
        "https://another-external.org/resource",
        "LINKS_TO",
    )

    # Verify external website to domain relationships
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://external.com/page",
        "domain",
        "name",
        "external.com",
        "BELONGS_TO_DOMAIN",
    )
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://another-external.org/resource",
        "domain",
        "name",
        "another-external.org",
        "BELONGS_TO_DOMAIN",
    )

    # Verify main website to external domain relationships
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "domain",
        "name",
        "external.com",
        "LINKS_TO_DOMAIN",
    )
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "domain",
        "name",
        "another-external.org",
        "LINKS_TO_DOMAIN",
    )


@pytest.mark.asyncio
async def test_website_to_links_error_handling_with_neo4j():
    """Test that main nodes are still created even when crawling fails."""
    transform = WebsiteToLinks(sketch_id="test", scan_id="test")

    # Mock neo4j connection and methods
    transform.neo4j_conn = Mock()
    transform.create_node = Mock()
    transform.create_relationship = Mock()
    transform.log_graph_message = Mock()

    # Mock crawler that raises an exception
    def mock_crawler_error(*args, **kwargs):
        raise Exception("Test error")

    websites = [Website(url="https://example.com")]

    with patch("src.transforms.websites.to_links.Crawler", mock_crawler_error):
        results = await transform.scan(websites)

    # Verify main website and domain nodes were still created despite error
    transform.create_node.assert_any_call(
        "website",
        "url",
        "https://example.com",
        caption="https://example.com",
        type="website",
    )
    transform.create_node.assert_any_call(
        "domain", "name", "example.com", caption="example.com", type="domain"
    )

    # Verify main website to domain relationship was created
    transform.create_relationship.assert_any_call(
        "website",
        "url",
        "https://example.com",
        "domain",
        "name",
        "example.com",
        "BELONGS_TO_DOMAIN",
    )

    # Verify result structure
    assert len(results) == 1
    result = results[0]
    assert result["website"] == "https://example.com"
    assert result["main_domain"] == "example.com"
    assert result["internal_urls"] == []
    assert result["external_urls"] == []
    assert result["external_domains"] == []


def test_postprocess_simplified():
    """Test that postprocess now just returns results as-is."""
    transform = WebsiteToLinks(sketch_id="test", scan_id="test")

    original_input = [Website(url="https://example.com")]
    results = [
        {
            "website": "https://example.com",
            "main_domain": "example.com",
            "internal_urls": ["https://example.com/page1"],
            "external_urls": ["https://external.com/page"],
            "external_domains": ["external.com"],
        }
    ]

    processed_results = transform.postprocess(results, original_input)

    # Should just return the same results since Neo4j work is done in real-time
    assert processed_results == results
