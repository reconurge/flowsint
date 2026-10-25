"""Al Arabiya news search tool via Google News RSS."""

import urllib.parse
from typing import Any, Dict, List

import requests
from defusedxml import ElementTree as ET

from ..base import Tool


class AlArabiyaTool(Tool):
    GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
    MAX_ITEMS = 10
    TIMEOUT = 10

    @classmethod
    def name(cls) -> str:
        return "alarabiya"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "Search Al Arabiya news (alarabiya.net) via Google News RSS."

    @classmethod
    def category(cls) -> str:
        return "Arabic media"

    def launch(self, value: str, *args, **kwargs) -> List[Dict[str, Any]]:
        filtered_query = f"{value} site:alarabiya.net"
        params = urllib.parse.urlencode({"q": filtered_query, "hl": "en"})
        url = f"{self.GOOGLE_NEWS_RSS}?{params}"

        response = requests.get(url, timeout=self.TIMEOUT)
        if response.status_code != 200:
            return []

        try:
            root = ET.fromstring(response.text)
        except ET.ParseError:
            return []

        channel = root.find("channel")
        items = channel.findall("item") if channel is not None else []

        results: List[Dict[str, Any]] = []
        for item in items[: self.MAX_ITEMS]:
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pub_el = item.find("pubDate")

            link = link_el.text if link_el is not None else None
            if not link:
                continue

            results.append(
                {
                    "url": link,
                    "title": (title_el.text if title_el is not None else value)
                    or value,
                    "snippet": (desc_el.text if desc_el is not None else "") or "",
                    "date": pub_el.text if pub_el is not None else None,
                }
            )
        return results
