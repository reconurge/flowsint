import asyncio
import json
import uuid
from typing import Dict, Any
from pathlib import Path
from app.scanners.base import Scanner


class GHuntGmailScanner(Scanner):
    @classmethod
    def name(self) -> str:
        return "ghunt_gmail_scanner"
    @classmethod
    def category(self) -> str:
        return "emails"
    @classmethod
    def key(self) -> str:
        return "email"

    def scan(self, email: str) -> Dict[str, Any]:
        report_id = str(uuid.uuid4())
        report_id = str(uuid.uuid4())
        output_file = Path(f"/tmp/ghunt_{email}_email.json")
        try:
            from ghunt.modules import email as email_module
            asyncio.run(email_module.hunt(None, email, output_file))
            if not output_file.exists():
                return {
                    "error": "Maigret did not produce any output file."
                }

            results = {}
            with open(output_file, "r") as f:
                results = json.load(f)
            return {
                "email": email,
                "report_id": report_id,
                "scanner": self.name,
                "results": results
            }
        except Exception as e:
            return {"error": f"Exception during GHunt Gmail scan: {str(e)}"}

    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ajoute des métadonnées supplémentaires aux résultats.
        """
        results["scanner"] = "ghunt_gmail"
        results["count"] = len(results.get("found", {}))
        return results