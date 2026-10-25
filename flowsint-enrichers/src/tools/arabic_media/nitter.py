"""Nitter (Twitter mirror) Arabic search tool with Google fallback."""

import urllib.parse
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from ..base import Tool


NITTER_INSTANCES = (
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
)
GOOGLE_SEARCH = "https://www.google.com/search"
X_DOMAINS = ("x.com", "twitter.com")
MAX_RESULTS = 10
TIMEOUT = 10


class NitterArabicTool(Tool):
    @classmethod
    def name(cls) -> str:
        return "nitter_arabic"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return (
            "Search Arabic tweets via Nitter mirrors with a Google dork fallback "
            "(site:x.com lang:ar)."
        )

    @classmethod
    def category(cls) -> str:
        return "Arabic media"

    def launch(self, value: str, *args, **kwargs) -> List[Dict[str, Any]]:
        results = self._search_nitter(value)
        if results:
            return results
        return self._search_google_fallback(value)

    def _search_nitter(self, value: str) -> List[Dict[str, Any]]:
        arabic_query = f"{value} lang:ar"
        for instance in NITTER_INSTANCES:
            params = urllib.parse.urlencode({"q": arabic_query, "f": "tweets"})
            url = f"{instance}/search?{params}"
            try:
                response = requests.get(url, timeout=TIMEOUT)
            except requests.RequestException:
                continue
            if response.status_code != 200:
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            items = soup.select(".timeline-item .tweet-link")
            collected: List[Dict[str, Any]] = []
            for item in items[:MAX_RESULTS]:
                href = item.get("href", "")
                text = item.get_text(strip=True) or value
                if not href:
                    continue
                collected.append(
                    {
                        "url": f"https://x.com{href}",
                        "title": f"Arabic tweet about: {value}",
                        "snippet": text,
                        "via": instance,
                    }
                )
            if collected:
                return collected
        return []

    def _search_google_fallback(self, value: str) -> List[Dict[str, Any]]:
        dork = f"{value} site:x.com lang:ar"
        params = urllib.parse.urlencode({"q": dork, "num": MAX_RESULTS})
        url = f"{GOOGLE_SEARCH}?{params}"
        try:
            response = requests.get(
                url,
                headers={
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "en-US,en;q=0.9",
                },
                timeout=TIMEOUT,
            )
        except requests.RequestException:
            return []
        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        links = soup.select("div.g a[href]")
        collected: List[Dict[str, Any]] = []
        for tag in links:
            href = tag.get("href", "")
            if not href.startswith("http"):
                continue
            if not any(domain in href for domain in X_DOMAINS):
                continue

            title = tag.get_text(strip=True) or href
            snippet = ""
            parent = tag.find_parent("div")
            if parent:
                spans = parent.find_all("span")
                if spans:
                    snippet = spans[-1].get_text(strip=True)
            collected.append(
                {
                    "url": href,
                    "title": title,
                    "snippet": snippet or title,
                    "via": "google_fallback",
                }
            )
            if len(collected) >= MAX_RESULTS:
                break
        return collected
