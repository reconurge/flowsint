from typing import List, Dict, Any, Union, Optional
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.domain import Domain
from app.types.web_tracker import WebTracker
from pydantic import TypeAdapter
from app.core.logger import Logger
from app.core.graph_db import Neo4jConnection
from app.core.vault import VaultProtocol
from recontrack import TrackingCodeExtractor

class WebsiteToWebtrackersScanner(Scanner):
    """From website to webtrackers."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Website]
    OutputType = List[WebTracker]

    def __init__(
        self,
        sketch_id: str,
        scan_id: str,
        neo4j_conn: Optional[Neo4jConnection] = None,
        params_schema: Optional[List[Dict[str, Any]]] = None,
        vault: Optional[VaultProtocol] = None,
        params: Optional[Dict[str, Any]] = None
    ):
        super().__init__(sketch_id, scan_id, neo4j_conn, params_schema, vault, params)
        self.tracker_website_mapping: List[tuple[WebTracker, Website]] = []

    @classmethod
    def name(cls) -> str:
        return "to_webtrackers"

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
        extractor = TrackingCodeExtractor()
        
        for website in data:
            try:
                # Extract tracking codes from the website
                tracking_data = extractor.extract(str(website.url))
                
                for tracker_info in tracking_data:
                    tracker = WebTracker(
                        name=tracker_info.get("name", ""),
                        tracker_id=tracker_info.get("id", ""),
                        category=tracker_info.get("category", ""),
                        website_url=str(website.url)
                    )
                    results.append(tracker)
                    self.tracker_website_mapping.append((tracker, website))
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error extracting web trackers from {website.url}: {e}"})
                continue
                
        return results

    def postprocess(self, results: OutputType, input_data: InputType = None) -> OutputType:
        return results

# Make types available at module level for easy access
InputType = WebsiteToWebtrackersScanner.InputType
OutputType = WebsiteToWebtrackersScanner.OutputType