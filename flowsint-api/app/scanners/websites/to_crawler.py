from typing import List, Dict, Any, TypeAlias, Union, Set
from urllib.parse import urlparse
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.phone import Phone
from app.types.email import Email
from pydantic import TypeAdapter
from app.core.logger import Logger
from app.tools.network.reconcrawl import ReconCrawlTool

InputType: TypeAlias = List[Website]
OutputType: TypeAlias = List[Dict[str, Union[Website, List[Phone], List[Email]]]]


class WebsiteToCrawler(Scanner):
    """From website to crawler."""

    @classmethod
    def name(cls) -> str:
        return "to_crawler"

    @classmethod
    def category(cls) -> str:
        return "Website"
    
    @classmethod
    def key(cls) -> str:
        return "url"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        # Find the Website type in $defs
        website_def = schema["$defs"].get("Website")
        if not website_def:
            raise ValueError("Website type not found in schema")
        return {
            "type": "Website",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in website_def["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        # For complex output types, we need to create a custom schema
        return {
            "type": "WebsiteResult",
            "properties": [
                {"name": "website", "type": "Website"},
                {"name": "emails", "type": "Email[]"},
                {"name": "phones", "type": "Phone[]"},
            ]
        }

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
                Logger.info(self.sketch_id, {"message": f"Starting comprehensive crawl of {str(website.url)}"})
                crawler = ReconCrawlTool()
                crawl_result = crawler.launch(website.url, {"recursive": True, "verify_ssl": True, "max_pages": 500, "timeout": 10, "delay": 1.0, "verbose": False})
                website_result = {
                    "website": str(website.url),  # Store as string instead of Website object
                    "emails": [],
                    "phones": [],
                }
                for item in crawl_result:
                    Logger.info(self.sketch_id, {"message": f"{item.type}: {item.value}"})
                    if item.source_url:
                        Logger.info(self.sketch_id, {"message": f"  Found on: {item.source_url}"})
                    if item.type == "email":
                        website_result["emails"].append(Email(email=item.value))
                    if item.type == "phone":
                        website_result["phones"].append(Phone(number=item.value))

                # Log results
                Logger.info(self.sketch_id, {
                    "message": f"Crawl completed for {str(website.url)}: {len(website_result['emails'])} emails, {len(website_result['phones'])} phones found."
                })
                
                if not website_result["emails"] and not website_result["phones"]:
                    Logger.info(self.sketch_id, {"message": f"No emails or phones found for website {str(website.url)}."})
                elif not website_result["emails"]:
                    Logger.info(self.sketch_id, {"message": f"No emails found for website {str(website.url)}"})
                elif not website_result["phones"]:
                    Logger.info(self.sketch_id, {"message": f"No phones found for website {str(website.url)}"})
                
                results.append(website_result)
                    
            except Exception as e:
                # Log error but continue with other websites
                Logger.error(self.sketch_id, {"message": f"Error crawling {str(website.url)}: {str(e)}"})
                # Add empty result for failed website
                results.append({
                    "website": str(website.url),  # Store as string instead of Website object
                    "emails": [],
                    "phones": [],
                })
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding emails and phones
        for input_website, result in zip(original_input, results):
            website_url = str(input_website.url)
            
            # Create website node
            website_query = """
            MERGE (website:website {url: $website_url})
            SET website.sketch_id = $sketch_id,
                website.label = $website_url,
                website.caption = $website_url,
                website.type = "website"
            """
            
            if self.neo4j_conn:
                self.neo4j_conn.query(website_query, {
                    "website_url": website_url,
                    "sketch_id": self.sketch_id,
                })
                
                # Create email nodes and relationships
                for email in result["emails"]:
                    email_query = """
                    MERGE (email:email {email: $email_address})
                    SET email.sketch_id = $sketch_id,
                        email.label = $email_address,
                        email.caption = $email_address,
                        email.type = "email"
                    
                    MERGE (website:website {url: $website_url})
                    MERGE (website)-[:HAS_EMAIL {sketch_id: $sketch_id}]->(email)
                    """
                    
                    self.neo4j_conn.query(email_query, {
                        "email_address": email.email,
                        "website_url": website_url,
                        "sketch_id": self.sketch_id,
                    })
                    Logger.graph_append(self.sketch_id, {"message": f"Found email {email.email} for website {website_url}"})
                
                # Create phone nodes and relationships
                for phone in result["phones"]:
                    phone_query = """
                    MERGE (phone:phone {number: $phone_number})
                    SET phone.sketch_id = $sketch_id,
                        phone.label = $phone_number,
                        phone.caption = $phone_number,
                        phone.type = "phone"
                    
                    MERGE (website:website {url: $website_url})
                    MERGE (website)-[:HAS_PHONE {sketch_id: $sketch_id}]->(phone)
                    """
                    
                    self.neo4j_conn.query(phone_query, {
                        "phone_number": phone.number,
                        "website_url": website_url,
                        "sketch_id": self.sketch_id,
                    })
                    Logger.graph_append(self.sketch_id, {"message": f"Found phone {phone.number} for website {website_url}"})

        return results