from typing import Dict

import requests
from ..base import Tool


class EpieosTool(Tool):

    epieos_api_endpoint = "https://api.epieos.com/"

    @classmethod
    def name(cls) -> str:
        return "epieos"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "Perform an email or a phone reverse lookup on Epieos OSINT tool to uncover all social media profiles."

    @classmethod
    def category(cls) -> str:
        return "Social intelligence"

    def launch(self, query: str) -> list[Dict]:
        try:
            params = {}
            resp = requests.get(
                self.epieos_api_endpoint,
            )
            resp.raise_for_status()
            data = resp.json()
            if len(data.get("results")) == 0:
                raise ValueError(f"No match found for {query}.")
            return data["results"]
        except Exception as e:
            raise RuntimeError(
                f"Error querying Epieos API: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
