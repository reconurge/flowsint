from typing import List, Dict, Any, TypeAlias, Union
import requests
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import Domain
from app.types.website import Website
from pydantic import TypeAdapter
from app.core.logger import Logger

InputType: TypeAlias = List[Domain]
OutputType: TypeAlias = List[Website]


class DomainToWebsiteScanner(Scanner):
    """From domain to website."""

    @classmethod
    def name(cls) -> str:
        return "to_website"

    @classmethod
    def category(cls) -> str:
        return "Domain"
    
    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
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

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned
    
    def __is_site_active(self, url, timeout=5):
        try:
            session = requests.Session()
            response = session.get(url, timeout=timeout, allow_redirects=False)
            
            redirects = []
            current_url = url
            
            # Follow redirects manually to capture the chain
            while response.status_code in [301, 302, 303, 307, 308]:
                redirects.append(current_url)
                if 'Location' in response.headers:
                    next_url = response.headers['Location']
                    # Handle relative URLs
                    if not next_url.startswith(('http://', 'https://')):
                        from urllib.parse import urljoin
                        next_url = urljoin(current_url, response.headers['Location'])
                    
                    current_url = next_url
                    response = session.get(current_url, timeout=timeout, allow_redirects=False)
                else:
                    break
            
            # Get the final response with redirects allowed
            final_response = requests.get(url, timeout=timeout, allow_redirects=True)
            return final_response.status_code == 200, final_response.url, redirects
        except requests.RequestException:
            return False, url, []

    def scan(self, data: InputType) -> OutputType:
        """To website"""
        results: OutputType = []
        for d in data:
            try:
                initial_url = f"https://{d.domain}"
                is_active, final_url, redirects = self.__is_site_active(initial_url)
                
                # Use the last redirect URL as the main URL, or the final URL if no redirects
                main_url = redirects[-1] if redirects else final_url
                
                website = Website(url=main_url, redirects=redirects, domain=d, active=is_active)
                results.append(website)
            except Exception as e:
                print(e)
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for website in results:
            # Log each redirect step
            if website.redirects:
                for i, redirect_url in enumerate(website.redirects):
                    next_url = website.redirects[i + 1] if i + 1 < len(website.redirects) else str(website.url)
                    redirect_payload = {
                        "message": f"Redirect: {str(redirect_url)} -> {str(next_url)}"
                    }
                    Logger.info(self.sketch_id, redirect_payload)
            
            query = """
            MERGE (d:domain {domain: $domain})
            SET d.sketch_id = $sketch_id,
                d.label = $domain,
                d.type = "domain"
            MERGE (w:website {url: $url})
            SET w.sketch_id = $sketch_id,
                w.label = $label,
                w.active = $active,
                w.redirects = $redirects,
                w.type = "website"
            MERGE (d)-[:HAS_WEBSITE {sketch_id: $sketch_id}]->(w)
            """
            if self.neo4j_conn:
                self.neo4j_conn.query(query, {
                    "domain": website.domain.domain,
                    "sketch_id": self.sketch_id,
                    "label": str(website.url),
                    "active": website.active,
                    "url": str(website.url),
                    "redirects": [str(redirect) for redirect in website.redirects] if website.redirects else [],
                })
          
            is_active_str = "active" if website.active else "inactive"
            redirects_str = f" (redirects: {len(website.redirects)})" if website.redirects else ""
            payload:Dict = {
                "message": f"{website.domain.domain} -> {str(website.url)} ({is_active_str}){redirects_str}"
                }
            Logger.graph_append(self.sketch_id, payload)
            
        return results