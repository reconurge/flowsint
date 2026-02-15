import time
from typing import Dict

import requests

from ..base import Tool


class WhoxyTool(Tool):
    whoxy_api_endoint = "https://api.whoxy.com/"

    MAX_RETRIES = 3
    INITIAL_DELAY = 2  # seconds

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
        last_exception = None

        for attempt in range(self.MAX_RETRIES):
            try:
                resp = requests.get(
                    self.whoxy_api_endoint,
                    params=params,
                    timeout=10,
                )

                if resp.status_code == 429:
                    delay = self.INITIAL_DELAY * (2 ** attempt)
                    time.sleep(delay)
                    continue

                resp.raise_for_status()
                data = resp.json()
                if data.get("status") != 1:
                    raise RuntimeError(
                        f"Error querying Whoxy API: {str(data.get('status_reason'))}"
                    )
                if data.get("total_results") == 0:
                    raise ValueError("No match found for Whoxy search.")
                return data
            except requests.exceptions.HTTPError as e:
                if resp.status_code in (429, 502, 503, 504):
                    last_exception = e
                    delay = self.INITIAL_DELAY * (2 ** attempt)
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"{str(e)}")
            except (ValueError, RuntimeError):
                raise
            except Exception as e:
                last_exception = e
                delay = self.INITIAL_DELAY * (2 ** attempt)
                time.sleep(delay)
                continue

        raise RuntimeError(f"Whoxy API failed after {self.MAX_RETRIES} retries: {str(last_exception)}")
