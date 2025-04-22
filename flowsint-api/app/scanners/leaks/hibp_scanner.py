import json
import uuid
from typing import Dict, Any
import hibpwned
from app.scanners.base import Scanner
import os
from dotenv import load_dotenv

load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

class HibpScanner(Scanner):
    """Queries HaveIBeenPawned for portential leaks."""

    @classmethod
    def name(self) -> str:
        return "hibp_scanner"
    @classmethod
    def category(self) -> str:
        return "leaks"
    @classmethod
    def key(self) -> str:
        return "email"

    def scan(self, value: str) -> Dict[str, Any]:
        report_id = str(uuid.uuid4())
        try:
            results = hibpwned.Pwned(value, "MyHIBPChecker", HIBP_API_KEY)
            return {
                "breaches": results.search_all_breaches(),
                "breaches" :results.all_breaches(),
                "adobe" :results.single_breach("adobe"),
                "data" :results.data_classes(),
                "pastes" :results.search_pastes(),
                "password" :results.search_password("BadPassword"),
                "hashes" :results.search_hashes("21BD1"),
                "report_id": report_id
            }
        except Exception as e:
            return {
                "error": str(e),
                "report_id": report_id
            }


    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        results["scanner"] = "hibp_scanner"
        results["count"] = len(results)
        return results
