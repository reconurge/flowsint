from typing import Dict

import requests
from ..base import Tool


class SireneTool(Tool):

    @classmethod
    def name(cls) -> str:
        return "sirene"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "The Sirene API allows you to query the Sirene directory of businesses and establishments, managed by Insee."

    @classmethod
    def category(cls) -> str:
        return "Business intelligence"

    def launch(self, query: str, limit: int = 25) -> list[Dict]:
        # Query can be multiple types of entries: full names ("<first> + <last>"), name, geolocation, etc.
        try:
            query = query.replace(" ", "+")
            params = {"q": query, "per_page": limit}
            resp = requests.get(
                "https://recherche-entreprises.api.gouv.fr/search",
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            if len(data.get("results")) == 0:
                raise ValueError(f"No match found for {query}.")
            return data["results"]
        except Exception as e:
            raise RuntimeError(
                f"Error querying Sirene API: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
