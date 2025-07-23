from typing import List, Dict, Any, Union
from urllib.parse import urlparse
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.domain import Domain
from pydantic import TypeAdapter
from app.core.logger import Logger

class WebsiteToDomainScanner(Scanner):
    """From website to domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Website]
    OutputType = List[Domain]

    @classmethod
    def name(cls) -> str:
        return "to_domain"

    @classmethod
    def category(cls) -> str:
        return "Website"
    
    @classmethod
    def key(cls) -> str:
        return "website"

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
        results: OutputType = []
        for website in data:
            try:
                parsed_url = urlparse(website.url)
                domain_name = parsed_url.netloc
                
                # Remove port if present
                if ':' in domain_name:
                    domain_name = domain_name.split(':')[0]
                
                # Remove www. prefix if present
                if domain_name.startswith('www.'):
                    domain_name = domain_name[4:]
                
                if domain_name:
                    domain_obj = Domain(domain=domain_name)
                    results.append(domain_obj)
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error extracting domain from website {website.url}: {e}"})
                continue
                
        return results

    def postprocess(self, results: OutputType, input_data: InputType = None) -> OutputType:
        return results

# Make types available at module level for easy access
InputType = WebsiteToDomainScanner.InputType
OutputType = WebsiteToDomainScanner.OutputType