from typing import List, Dict, Any, Union, Optional
from flowsint_core.core.transform_base import Transform
from flowsint_types.website import Website
from flowsint_types.web_tracker import WebTracker
from flowsint_core.core.logger import Logger
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_core.core.vault import VaultProtocol
from recontrack import TrackingCodeExtractor


class WebsiteToWebtrackersTransform(Transform):
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
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(sketch_id, scan_id, neo4j_conn, params_schema, vault, params)
        self.tracker_website_mapping: List[tuple[WebTracker, Website]] = []

    @classmethod
    def name(cls) -> str:
        return "website_to_webtrackers"

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
                # Extract tracking codes from the website
                extractor = TrackingCodeExtractor(str(website.url))
                extractor.fetch()
                extractor.extract_codes()
                tracking_codes = extractor.get_results()

                for tracker_info in tracking_codes:
                    tracker = WebTracker(
                        name=tracker_info.source,
                        tracker_id=tracker_info.code,
                        website_url=str(website.url),
                    )
                    results.append(tracker)
                    self.tracker_website_mapping.append((tracker, website))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error extracting web trackers from {website.url}: {e}"
                    },
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create Neo4j relationships between websites and their corresponding trackers
        if self.neo4j_conn:
            # Group trackers by website using the mapping we created during scan
            website_trackers = {}
            for tracker, website in self.tracker_website_mapping:
                website_url = str(website.url)
                if website_url not in website_trackers:
                    website_trackers[website_url] = []
                website_trackers[website_url].append(tracker)

            # Create nodes and relationships for each website and its trackers
            for website_url, trackers in website_trackers.items():
                # Create website node
                self.create_node(
                    "website", "url", website_url, caption=website_url, type="website"
                )

                # Create tracker nodes and relationships
                for tracker in trackers:
                    self.create_node(
                        "webtracker", 
                        "tracker_id", 
                        tracker.tracker_id, 
                        caption=tracker.name, 
                        type="webtracker"
                    )
                    self.create_relationship(
                        "website",
                        "url",
                        website_url,
                        "webtracker",
                        "tracker_id",
                        tracker.tracker_id,
                        "HAS_TRACKER",
                    )
                    self.log_graph_message(
                        f"Found tracker {tracker.name} ({tracker.tracker_id}) for website {website_url}"
                    )

        return results


# Make types available at module level for easy access
InputType = WebsiteToWebtrackersTransform.InputType
OutputType = WebsiteToWebtrackersTransform.OutputType
