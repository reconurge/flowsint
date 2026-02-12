from typing import Dict

import requests
from ..base import Tool


class WhoisXmlTool(Tool):

    whoisxml_api_endpoint = "https://whois-history.whoisxmlapi.com/api/v1"

    @classmethod
    def name(cls) -> str:
        return "whoisxml"

    @classmethod
    def version(cls) -> str:
        return "1.0.0"

    @classmethod
    def description(cls) -> str:
        return "WhoisXML WHOIS History API returns historical WHOIS records for a domain, including registrant contacts, registrar changes, and domain lifecycle events."

    @classmethod
    def category(cls) -> str:
        return "Network intelligence"

    def launch(self, params: Dict[str, str] = {}) -> Dict:
        try:
            resp = requests.get(
                self.whoisxml_api_endpoint,
                params=params,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            records_count = data.get("recordsCount", 0)
            if records_count == 0:
                raise ValueError("No WHOIS history records found.")
            return data
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"WhoisXML API request failed: {str(e)}")
        except ValueError:
            raise
        except Exception as e:
            raise RuntimeError(f"WhoisXML API error: {str(e)}")
