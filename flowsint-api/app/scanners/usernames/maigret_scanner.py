import json
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any

from app.scanners.base import Scanner

class MaigretScanner(Scanner):
    """Scans the username for associated social accounts using maigret."""
    @classmethod
    def name(self) -> str:
        return "maigret_scanner"
    @classmethod
    def category(self) -> str:
        return "social_account"
    @classmethod
    def key(self) -> str:
        return "username"
    
    def scan(self, username: str) -> Dict[str, Any]:
        report_id = str(uuid.uuid4())
        folder_output = "/tmp"
        output_file = Path(f"/tmp/report_{username}_simple.json")

        try:
            result = subprocess.run(
                ["maigret", username, "-J" "simple", "-fo", folder_output],
                capture_output=True,
                text=True,
                timeout=100  # 5 minutes timeout
            )

            if result.returncode != 0:
                return {
                    "error": f"Maigret failed: {result.stderr.strip()}"
                }

            if not output_file.exists():
                return {
                    "error": "Maigret did not produce any output file."
                }

            results = {}
            with open(output_file, "r") as f:
                results = json.load(f)

            return {
                "username": username,
                "report_id": report_id,
                "results": results
            }

        except subprocess.TimeoutExpired:
            return {"error": "Maigret scan timed out."}
        except Exception as e:
            return {"error": f"Unexpected error in Maigret scan: {str(e)}"}
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:

        results["scanner"] = "maigret"
        results["count"] = len(results.get("found", {}))
        return results
