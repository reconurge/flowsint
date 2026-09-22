from typing import Any, Dict, Optional

from ..base import Tool


class ReconCrawlTool(Tool):
    def __init__(self) -> None:
        super().__init__()

    @classmethod
    def name(cls) -> str:
        return "reconcrawl"

    @classmethod
    def description(cls) -> str:
        return "Emails and phone numbers crawler from websites by analyzing their HTML and embedded scripts."

    @classmethod
    def category(cls) -> str:
        return "Crawler"

    def install(self) -> None:
        pass

    def version(self) -> str:
        # No callers — the reconcrawl package doesn't expose a version
        # string to report here, unlike the Docker-backed tools.
        raise NotImplementedError("ReconCrawlTool does not report a version")

    def is_installed(self) -> bool:
        try:
            pass

            return True
        except ImportError:
            return False

    def launch(self, url: str, args: Optional[Dict[str, Any]] = None) -> Any:
        from reconcrawl import Crawler

        args = args or {}
        crawler = Crawler(
            url=str(url),
            max_pages=args.get("max_pages", 500),
            timeout=args.get("timeout", 30),
            delay=args.get("delay", 1.0),
            verbose=args.get("verbose", False),
            recursive=args.get("recursive", True),
            verify_ssl=args.get(
                "verify_ssl", False
            ),  # Default to False for compatibility
        )
        crawler.fetch()
        crawler.extract_emails()
        crawler.extract_phones()
        crawl_result = crawler.get_results()
        return crawl_result
