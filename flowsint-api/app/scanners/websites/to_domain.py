from typing import List, Dict, Any, TypeAlias, Union
from urllib.parse import urlparse
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.domain import Domain
from pydantic import TypeAdapter
from app.core.logger import Logger

InputType: TypeAlias = List[Website]
OutputType: TypeAlias = List[Domain]


class WebsiteToDomainScanner(Scanner):
    """From website to domain."""

    @classmethod
    def name(cls) -> str:
        return "to_domain"

    @classmethod
    def category(cls) -> str:
        return "Website"
    
    @classmethod
    def key(cls) -> str:
        return "website"

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
        # Find the Domain type in $defs
        domain_def = schema["$defs"].get("Domain")
        if not domain_def:
            raise ValueError("Domain type not found in schema")
        return {
            "type": "Domain",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in domain_def["properties"].items()
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            website_obj = None
            if isinstance(item, str):
                # If it's a string, treat it as a URL
                website_obj = Website(url=item)
            elif isinstance(item, dict) and "url" in item:
                website_obj = Website(**item)
            elif isinstance(item, Website):
                website_obj = item
            if website_obj:
                cleaned.append(website_obj)
        return cleaned
    
    def __extract_domain_from_url(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(str(url))
            domain = parsed.netloc
            # Remove port if present
            if ':' in domain:
                domain = domain.split(':')[0]
            return domain
        except Exception:
            return ""

    async def scan(self, data: InputType) -> OutputType:
        """Extract domain from website."""
        results: OutputType = []
        for website in data:
            try:
                # Extract domain from the website URL
                domain_name = self.__extract_domain_from_url(website.url)
                if domain_name:
                    domain = Domain(domain=domain_name)
                    results.append(domain)
            except Exception as e:
                print(f"Error processing website {website.url}: {e}")
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for i, domain in enumerate(results):
            website = original_input[i] if i < len(original_input) else None
            
            query = """
            MERGE (d:domain {domain: $domain})
            SET d.sketch_id = $sketch_id,
                d.label = $domain,
                d.type = "domain"
            """
            if website:
                query += """
                MERGE (w:website {url: $url})
                SET w.sketch_id = $sketch_id,
                    w.label = $label,
                    w.type = "website"
                MERGE (w)-[:HAS_DOMAIN {sketch_id: $sketch_id}]->(d)
                """
            
            if self.neo4j_conn:
                params = {
                    "domain": domain.domain,
                    "sketch_id": self.sketch_id,
                }
                if website:
                    params.update({
                        "url": str(website.url),
                        "label": str(website.url),
                    })
                self.neo4j_conn.query(query, params)
            
            website_url = str(website.url) if website else "unknown"
            payload: Dict = {
                "message": f"{website_url} -> {domain.domain}"
            }
            Logger.graph_append(self.sketch_id, payload)
            
        return results