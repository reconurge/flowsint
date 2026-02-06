"""
PhishStats API Client

A reusable client for interacting with the PhishStats API, handling
rate limiting, error handling, and response parsing.
"""

import time
import requests
from typing import Dict, List, Optional, Any


class PhishStatsClient:
    """Client for querying the PhishStats API with rate limiting and error handling."""

    BASE_URL = "https://api.phishstats.info/api/phishing"
    RATE_LIMIT_PER_MINUTE = 20
    DEFAULT_TIMEOUT = 60  # Increased from 20 to 60 seconds

    def __init__(self):
        """Initialize the PhishStats API client."""
        self.request_times: List[float] = []
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "flowsint-phishstats-enricher/1.0"
        })

    def _check_rate_limit(self):
        """
        Check and enforce rate limiting (20 requests per minute).
        Sleeps if necessary to stay within limits.
        """
        now = time.time()
        # Remove requests older than 60 seconds
        self.request_times = [t for t in self.request_times if now - t < 60]

        if len(self.request_times) >= self.RATE_LIMIT_PER_MINUTE:
            # Calculate how long to wait
            oldest_request = self.request_times[0]
            wait_time = 60 - (now - oldest_request)
            if wait_time > 0:
                print(f"Rate limit reached. Waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time + 0.1)  # Add small buffer
                # Clean up old timestamps after sleeping
                now = time.time()
                self.request_times = [t for t in self.request_times if now - t < 60]

        # Record this request
        self.request_times.append(time.time())

    def _make_request(
        self,
        endpoint: str = "",
        params: Optional[Dict[str, Any]] = None,
        retries: int = 2  # Reduced from 3 to 2
    ) -> Any:
        """
        Make a request to the PhishStats API with retries and error handling.

        Args:
            endpoint: API endpoint (e.g., "", "count")
            params: Query parameters
            retries: Number of retry attempts

        Returns:
            Parsed JSON response

        Raises:
            Exception: If request fails after all retries
        """
        url = f"{self.BASE_URL}/{endpoint}" if endpoint else self.BASE_URL

        for attempt in range(retries):
            try:
                # Enforce rate limiting
                self._check_rate_limit()

                # Make the request
                print(f"Making request to PhishStats API (attempt {attempt + 1}/{retries})...")
                response = self.session.get(
                    url,
                    params=params,
                    timeout=self.DEFAULT_TIMEOUT
                )

                # Handle rate limiting
                if response.status_code == 429:
                    wait_time = (2 ** attempt) * 5  # Exponential backoff
                    print(f"Rate limited (429). Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue

                # Raise for other HTTP errors
                response.raise_for_status()

                # Parse and return JSON
                data = response.json()
                print(f"Successfully received {len(data) if isinstance(data, list) else 1} records")
                return data

            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    print(f"Request timeout after {self.DEFAULT_TIMEOUT}s. Retrying ({attempt + 1}/{retries})...")
                    time.sleep(2 ** attempt)
                else:
                    raise Exception(f"Request timed out after {retries} attempts (timeout: {self.DEFAULT_TIMEOUT}s each)")

            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    print(f"Request failed: {e}. Retrying ({attempt + 1}/{retries})...")
                    time.sleep(2 ** attempt)
                else:
                    raise Exception(f"Request failed after {retries} attempts: {e}")

        raise Exception("Request failed after all retries")

    def query(
        self,
        where_clause: str,
        size: int = 100,
        sort: str = "-id",
        fields: Optional[str] = None,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Query the PhishStats API.

        Args:
            where_clause: WHERE clause in PhishStats format, e.g., "(ip,eq,1.2.3.4)"
            size: Number of results to return (max 100)
            sort: Sort field, prefix with "-" for descending
            fields: Comma-separated list of fields to return
            page: Page number for pagination

        Returns:
            List of phishing record dictionaries
        """
        params = {
            "_where": where_clause,
            "_sort": sort,
            "_size": min(size, 100),  # Cap at 100
            "_p": page
        }

        if fields:
            params["_fields"] = fields

        return self._make_request(params=params)

    def count(self, where_clause: str) -> int:
        """
        Get the count of records matching the criteria.

        Args:
            where_clause: WHERE clause in PhishStats format

        Returns:
            Count of matching records
        """
        params = {"_where": where_clause}
        result = self._make_request(endpoint="count", params=params)

        if result and isinstance(result, list) and len(result) > 0:
            return result[0].get("no_of_rows", 0)
        return 0

    def query_by_ip(self, ip: str, size: int = 100) -> List[Dict[str, Any]]:
        """Query phishing records by IP address (exact match)."""
        where_clause = f"(ip,eq,{ip})"
        return self.query(where_clause, size=size)

    def query_by_domain(self, domain: str, size: int = 100) -> List[Dict[str, Any]]:
        """Query phishing records by domain/host (using LIKE for flexibility)."""
        where_clause = f"(host,like,~{domain}~)"
        return self.query(where_clause, size=size)

    def query_by_domain_exact(self, domain: str, size: int = 100) -> List[Dict[str, Any]]:
        """Query phishing records by domain/host (exact match)."""
        where_clause = f"(host,eq,{domain})"
        return self.query(where_clause, size=size)

    def query_by_url(self, url: str, size: int = 100) -> List[Dict[str, Any]]:
        """Query phishing records by URL pattern (using LIKE)."""
        where_clause = f"(url,like,~{url}~)"
        return self.query(where_clause, size=size)

    def query_by_url_exact(self, url: str, size: int = 100) -> List[Dict[str, Any]]:
        """Query phishing records by URL (exact match)."""
        where_clause = f"(url,eq,{url})"
        return self.query(where_clause, size=size)

    def search(
        self,
        field: str,
        operator: str,
        value: str,
        size: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Flexible search method.

        Args:
            field: Field name (e.g., "title", "url", "ip")
            operator: Operator (e.g., "eq", "like", "gt")
            value: Search value (use ~value~ for LIKE)
            size: Number of results

        Returns:
            List of matching records
        """
        where_clause = f"({field},{operator},{value})"
        return self.query(where_clause, size=size)

    def build_where_clause(self, conditions: List[tuple], logic: str = "and") -> str:
        """
        Build a complex WHERE clause from multiple conditions.

        Args:
            conditions: List of tuples (field, operator, value)
            logic: Logical operator ("and" or "or")

        Returns:
            WHERE clause string

        Example:
            build_where_clause([("ip", "eq", "1.2.3.4"), ("score", "gt", "5")])
            Returns: "(ip,eq,1.2.3.4)~and(score,gt,5)"
        """
        if not conditions:
            return ""

        clauses = [f"({field},{op},{value})" for field, op, value in conditions]
        logic_op = f"~{logic}~"
        return logic_op.join(clauses)


# Singleton instance for reuse across enrichers
_client_instance = None


def get_phishstats_client() -> PhishStatsClient:
    """Get or create a singleton PhishStats client instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = PhishStatsClient()
    return _client_instance
