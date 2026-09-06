"""Argaam Arabic financial/business news search tool."""

import urllib.parse
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from ..base import Tool


class ArgaamTool(Tool):
    ARGAAM_SEARCH = "https://www.argaam.com/ar/search"
    ARGAAM_BASE = "https://www.argaam.com"
    MAX_RESULTS = 10
    TIMEOUT = 10

    @classmethod
    def name(cls) -> str:
        return "argaam"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "Search Argaam Arabic financial news for mentions of a person or topic."

    @classmethod
    def category(cls) -> str:
        return "Arabic media"

    def launch(self, value: str, *args, **kwargs) -> List[Dict[str, Any]]:
        params = urllib.parse.urlencode({"q": value})
        url = f"{self.ARGAAM_SEARCH}?{params}"
        response = requests.get(url, timeout=self.TIMEOUT)
        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        items = soup.select("article, .search-result, .news-item, .listItem")

        results: List[Dict[str, Any]] = []
        for item in items[: self.MAX_RESULTS]:
            title_el = item.select_one("h2 a, h3 a, .title a, a")
            if title_el is None:
                continue

            title = title_el.get_text(strip=True) or value
            link = title_el.get("href", "")
            if link and not link.startswith("http"):
                link = f"{self.ARGAAM_BASE}{link}"
            if not link:
                continue

            snippet_el = item.select_one("p, .excerpt, .summary")
            snippet = snippet_el.get_text(strip=True) if snippet_el else title

            date_el = item.select_one(".date, time, [datetime]")
            date = date_el.get_text(strip=True) if date_el else None

            results.append(
                {"url": link, "title": title, "snippet": snippet, "date": date}
            )
        return results
