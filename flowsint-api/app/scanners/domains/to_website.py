from typing import List, Dict, Any, Union
import requests
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import Domain
from app.types.website import Website
from pydantic import TypeAdapter
from app.core.logger import Logger

class DomainToWebsiteScanner(Scanner):
    """From domain to website."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
    OutputType = List[Website]

    @classmethod
    def name(cls) -> str:
        return "to_website"

    @classmethod
    def category(cls) -> str:
        return "Domain"
    
    @classmethod
    def key(cls) -> str:
        return "domain"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                if is_valid_domain(item):
                    domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                if is_valid_domain(item["domain"]):
                    domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj:
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for domain in data:
            try:
                # Try HTTPS first
                try:
                    https_url = f"https://{domain.domain}"
                    response = requests.head(https_url, timeout=10, allow_redirects=True)
                    if response.status_code < 400:
                        results.append(Website(url=https_url))
                        continue
                except requests.RequestException:
                    pass
                
                # Try HTTP if HTTPS fails
                try:
                    http_url = f"http://{domain.domain}"
                    response = requests.head(http_url, timeout=10, allow_redirects=True)
                    if response.status_code < 400:
                        results.append(Website(url=http_url))
                        continue
                except requests.RequestException:
                    pass
                    
                # If both fail, still add HTTPS URL as default
                results.append(Website(url=f"https://{domain.domain}"))
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error converting domain {domain.domain} to website: {e}"})
                # Add HTTPS URL as fallback
                results.append(Website(url=f"https://{domain.domain}"))
        
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
            


# Make types available at module level for easy access
InputType = DomainToWebsiteScanner.InputType
OutputType = DomainToWebsiteScanner.OutputType