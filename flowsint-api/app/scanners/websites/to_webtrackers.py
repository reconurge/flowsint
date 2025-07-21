from typing import List, Dict, Any, TypeAlias, Union, Optional
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


InputType: TypeAlias = List[Website]
OutputType: TypeAlias = List[WebTracker]


class WebsiteToWebtrackersScanner(Scanner):
    """From website to webtrackers."""

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
        # Find the WebTracker type in $defs
        domain_def = schema["$defs"].get("WebTracker")
        if not domain_def:
            raise ValueError("WebTracker type not found in schema")
        return {
            "type": "WebTracker",
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

    async def scan(self, data: InputType) -> OutputType:
        """Extract domain from website."""
        results: OutputType = []
        # Clear the mapping for this scan
        self.tracker_website_mapping = []

        for website in data:
            try:
                extractor = TrackingCodeExtractor(website.url)
                extractor.fetch()
                print(f"↪️ Final URL after redirects: {extractor.final_url}")
                extractor.extract_codes()
                trackings = extractor.get_results()
                for tracking in trackings:
                    tracker = WebTracker(tracker_id=tracking.code, name=tracking.source)
                    results.append(tracker)
                    # Store the mapping for postprocess
                    self.tracker_website_mapping.append((tracker, website))
            except Exception as e:
                print(f"Error processing website {website.url}: {e}")
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Use the stored mapping instead of trying to match by index
        for tracker, website in self.tracker_website_mapping:
            query = """
            MERGE (d:webtracker {tracker_id: $tracker_id})
            SET d.sketch_id = $sketch_id,
                d.label = $tracker_id,
                d.type = "webtracker",
                d.name = $name
            """
            query += """
            MERGE (w:website {url: $url})
            SET w.sketch_id = $sketch_id,
                w.label = $label,
                w.type = "website"
            MERGE (w)-[:HAS_TRACKER {sketch_id: $sketch_id}]->(d)
            """
            
            if self.neo4j_conn:
                params = {
                    "tracker_id": tracker.tracker_id,
                    "sketch_id": self.sketch_id,
                    "name": tracker.name,
                    "url": str(website.url),
                    "label": str(website.url),
                }
                self.neo4j_conn.query(query, params)
            
            website_url = str(website.url)
            payload: Dict = {
                "message": f"{website_url} -> {tracker.name}: {tracker.tracker_id}"
            }
            Logger.graph_append(self.sketch_id, payload)
            
        return results