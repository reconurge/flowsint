import json
import uuid
from typing import Dict, Any, List
import hibpwned
from app.scanners.base import Scanner
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

class HibpScanner(Scanner):
    """Queries HaveIBeenPwned for potential leaks."""

    @classmethod
    def name(self) -> str:
        return "hibp_scanner"
    
    @classmethod
    def category(self) -> str:
        return "leaks"
    
    @classmethod
    def key(self) -> str:
        return "email"

    @classmethod
    def input_schema(self) -> Dict[str, str]:
        """Defines the parameters expected for the scan."""
        return {
            "emails": "array"  # Liste d'emails
        }
    
    @classmethod
    def output_schema(self) -> Dict[str, str]:
        """Defines the structure of the data returned by the scan."""
        return {
            "output": "dict",  # A list of results for each username scan
        }

    def scan(self, emails: List[str]) -> List[Dict[str, Any]]:
        """Performs a search on HaveIBeenPwned for a list of emails."""
        results = []
        for email in emails:
            report_id = str(uuid.uuid4())
            try:
                result = hibpwned.Pwned(email, "MyHIBPChecker", HIBP_API_KEY)

                # Clear data structure for results
                breaches = result.search_all_breaches()
                pastes = result.search_pastes()
                password = result.search_password("BadPassword")
                hashes = result.search_hashes("21BD1")

                email_result = {
                    "email": email,
                    "breaches": breaches if breaches else [],
                    "adobe": result.single_breach("adobe") or {},
                    "data": result.data_classes() or [],
                    "pastes": pastes if pastes else [],
                    "password": password if password else {},
                    "hashes": hashes if hashes else [],
                    "report_id": report_id
                }
                results.append(email_result)
            except Exception as e:
                results.append({
                    "email": email,
                    "error": f"Error during scan: {str(e)}",
                    "report_id": report_id
                })
        
        return results

    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Adds additional metadata to the results."""
        for result in results:
            result["scanner"] = "hibp_scanner"
            result["count"] = len(result.get("breaches", []))  # Count the number of breaches
        return {"output":results}
