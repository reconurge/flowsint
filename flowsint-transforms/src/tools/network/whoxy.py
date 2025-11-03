from typing import Dict

import requests
from ..base import Tool


class WhoxyTool(Tool):

    whoxy_api_endoint = "https://api.whoxy.com/"
    
    @classmethod
    def name(cls) -> str:
        return "whoxy"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "The WHOIS API returns consistent and well-structured WHOIS data in XML & JSON format. Returned data contain parsed WHOIS fields that can be easily understood. Along with WHOIS API, Whoxy also offer WHOIS History API and Reverse WHOIS API."

    @classmethod
    def category(cls) -> str:
        return "Network intelligence"

    def launch(self, params: Dict[str, str] = {}) -> list[Dict]:
        try:
            resp = requests.get(
                self.whoxy_api_endoint,
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != 1:
                raise RuntimeError(
                    f"Error querying Whoxy API: {str(data.get("status_reason") )}"
                )
            if data.get("total_results") == 0:
                raise ValueError(f"No match found for Whoxy search.")
            return data
        except Exception as e:
            raise RuntimeError(f"{str(e)}")
