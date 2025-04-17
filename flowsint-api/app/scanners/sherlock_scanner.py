import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any

from app.scanners.base import Scanner

class SherlockScanner(Scanner):
    """Scans the username for associated social accounts."""
    @property
    def name(self) -> str:
        return "sherlock_scanner"
    
    def scan(self, username: str) -> Dict[str, Any]:
        report_id = str(uuid.uuid4())
        output_file = Path(f"/tmp/sherlock_{report_id}.txt")

        try:
            result = subprocess.run(
                ["sherlock", username, "-o", str(output_file)],
                capture_output=True,
                text=True,
                timeout=100  # 5 minutes timeout
            )

            if result.returncode != 0:
                return {
                    "error": f"Sherlock failed: {result.stderr.strip()}"
                }

            if not output_file.exists():
                return {
                    "error": "Sherlock did not produce any output file."
                }

            found_accounts = {}
            with open(output_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and line.startswith("http"):
                        platform = line.split("/")[2]  # Extract domain name as platform
                        found_accounts[platform] = line

            return {
                "username": username,
                "report_id": report_id,
                "results": found_accounts
            }

        except subprocess.TimeoutExpired:
            return {"error": "Sherlock scan timed out."}
        except Exception as e:
            return {"error": f"Unexpected error in Sherlock scan: {str(e)}"}
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ajoute des métadonnées supplémentaires aux résultats.
        """
        results["scanner"] = "sherlock"
        results["count"] = len(results.get("found", {}))
        return results
