from typing import Any, Dict

from ..base import Tool


class ReconCrawlTool(Tool):

    def __init__(self):
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
        pass

    def is_installed(self) -> bool:
        try:
            import reconcrawl

            return True
        except ImportError:
            return False

    def launch(self, url: str, args: Dict[str, Any] = None) -> Any:
        from reconcrawl import Crawler

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
