from typing import List, Optional, Union
from urllib.parse import urlparse
from flowsint_core.core.transform_base import Transform
from flowsint_types.website import Website
from flowsint_types.phone import Phone
from flowsint_types.email import Email
from flowsint_core.core.logger import Logger
from tools.network.reconcrawl import ReconCrawlTool
from pydantic import BaseModel


class ReturnType(BaseModel):
    website: Website
    emails: Optional[Email]
    phones: Optional[Phone]


class WebsiteToCrawler(Transform):
    """From website to crawler."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Website]
    OutputType = List[ReturnType]  # Simplified output type

    @classmethod
    def name(cls) -> str:
        return "website_to_crawler"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "url"

    def is_same_domain(self, url: str, base_domain: str) -> bool:
        """Check if URL belongs to the same domain."""
        try:
            parsed_url = urlparse(url)
            parsed_base = urlparse(base_domain)
            return parsed_url.netloc == parsed_base.netloc
        except Exception:
            return False

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            website_obj = None
            if isinstance(item, str):
                website_obj = Website(url=item)
            elif isinstance(item, dict) and "url" in item:
                website_obj = Website(url=item["url"])
            elif isinstance(item, Website):
                website_obj = item
            if website_obj:
                cleaned.append(website_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Crawl websites to extract emails and phone numbers."""
        results = []

        for website in data:
            try:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Starting comprehensive crawl of {str(website.url)}"},
                )
                crawler = ReconCrawlTool()
                crawl_result = crawler.launch(
                    website.url,
                    {
                        "recursive": True,
                        "verify_ssl": True,
                        "max_pages": 500,
                        "timeout": 10,
                        "delay": 1.0,
                        "verbose": False,
                    },
                )
                website_result = {
                    "website": str(
                        website.url
                    ),  # Store as string instead of Website object
                    "emails": [],
                    "phones": [],
                }
                for item in crawl_result:
                    Logger.info(
                        self.sketch_id, {"message": f"{item.type}: {item.value}"}
                    )
                    if item.source_url:
                        Logger.info(
                            self.sketch_id,
                            {"message": f"  Found on: {item.source_url}"},
                        )
                    if item.type == "email":
                        website_result["emails"].append(Email(email=item.value))
                    if item.type == "phone":
                        website_result["phones"].append(Phone(number=item.value))

                # Log results
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"Crawl completed for {str(website.url)}: {len(website_result['emails'])} emails, {len(website_result['phones'])} phones found."
                    },
                )

                if not website_result["emails"] and not website_result["phones"]:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"No emails or phones found for website {str(website.url)}."
                        },
                    )
                elif not website_result["emails"]:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No emails found for website {str(website.url)}"},
                    )
                elif not website_result["phones"]:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No phones found for website {str(website.url)}"},
                    )

                results.append(website_result)

            except Exception as e:
                # Log error but continue with other websites
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error crawling {str(website.url)}: {str(e)}"},
                )
                # Add empty result for failed website
                results.append(
                    {
                        "website": str(
                            website.url
                        ),  # Store as string instead of Website object
                        "emails": [],
                        "phones": [],
                    }
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding emails and phones
        for input_website, result in zip(original_input, results):
            website_url = str(input_website.url)

            # Create website node
            if self.neo4j_conn:
                self.create_node(
                    "website", "url", website_url, caption=website_url, type="website"
                )

                # Create email nodes and relationships
                for email in result["emails"]:
                    self.create_node(
                        "email", "email", email.email, caption=email.email, type="email"
                    )
                    self.create_relationship(
                        "website",
                        "url",
                        website_url,
                        "email",
                        "email",
                        email.email,
                        "HAS_EMAIL",
                    )
                    self.log_graph_message(
                        f"Found email {email.email} for website {website_url}"
                    )

                # Create phone nodes and relationships
                for phone in result["phones"]:
                    self.create_node(
                        "phone",
                        "number",
                        phone.number,
                        caption=phone.number,
                        type="phone",
                    )
                    self.create_relationship(
                        "website",
                        "url",
                        website_url,
                        "phone",
                        "number",
                        phone.number,
                        "HAS_PHONE",
                    )
                    self.log_graph_message(
                        f"Found phone {phone.number} for website {website_url}"
                    )

        return results


InputType = WebsiteToCrawler.InputType
OutputType = WebsiteToCrawler.OutputType
