"""Sabq Arabic news search tool."""

import urllib.parse
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from ..base import Tool


class SabqTool(Tool):
    SABQ_SEARCH = "https://sabq.org/search"
    SABQ_BASE = "https://sabq.org"
    MAX_RESULTS = 10
    TIMEOUT = 10

    @classmethod
    def name(cls) -> str:
        return "sabq"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "Search Sabq Arabic news for mentions of a person or topic."

    @classmethod
    def category(cls) -> str:
        return "Arabic media"

    def launch(self, value: str, *args, **kwargs) -> List[Dict[str, Any]]:
        params = urllib.parse.urlencode({"q": value})
        url = f"{self.SABQ_SEARCH}?{params}"
        response = requests.get(url, timeout=self.TIMEOUT)
        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        items = soup.select("article, .search-item, .news-item")

        results: List[Dict[str, Any]] = []
        for item in items[: self.MAX_RESULTS]:
            title_el = item.select_one("h2 a, h3 a, .title a, a")
            if title_el is None:
                continue

            title = title_el.get_text(strip=True) or value
            link = title_el.get("href", "")

            if link and not link.startswith("http"):
                link = f"{self.SABQ_BASE}{link}"
            if not link:
                continue

            snippet_el = item.select_one("p, .excerpt, .summary")
            snippet = snippet_el.get_text(strip=True) if snippet_el else title

            results.append({"url": link, "title": title, "snippet": snippet})
        return results
