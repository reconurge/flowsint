import asyncio
import json
import uuid
from typing import Dict, Any, List
from pathlib import Path
from app.scanners.base import Scanner
from app.models.types import OSINTType
from app.utils import DataType
import tempfile

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
    
    @classmethod
    def input_schema(self) -> Dict[str, str]:
        return { "emails": "array" }  # Liste d'emails
    
    @classmethod
    def output_schema(self) -> Dict[str, str]:
        """Defines the structure of the data returned by the scan."""
        return {
            "output": "array",  # A list of results for each username scan
        }

    async def scan(self, emails: List[str]) -> List[Dict[str, Any]]:
        """
        Effectue la recherche GHunt pour chaque email de la liste.
        """
        results = []
        
        # Création d'un fichier temporaire pour chaque email
        for email in emails:
            report_id = str(uuid.uuid4())
            
            # Création d'un fichier temporaire pour stocker le résultat de la recherche
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                output_file = temp_file.name
            
            try:
                from ghunt.modules import email as email_module
                # Appel à la fonction asynchrone de GHunt
                await email_module.hunt(None, email, output_file)
                
                # Vérification si le fichier de sortie existe et est valide
                if not Path(output_file).exists():
                    results.append({
                        "email": email,
                        "error": "GHunt did not produce any output file."
                    })
                    continue

                # Lecture des résultats du fichier
                with open(output_file, "r") as f:
                    scan_results = json.load(f)
                
                results.append({
                    "email": email,
                    "report_id": report_id,
                    "scanner": self.name(),
                    "results": scan_results
                })
            
            except Exception as e:
                results.append({
                    "email": email,
                    "error": f"Exception during GHunt Gmail scan: {str(e)}"
                })
        
        return results

    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Ajoute des métadonnées supplémentaires aux résultats.
        """
        for result in results:
            result["scanner"] = "ghunt_gmail"
            result["count"] = len(result.get("results", {}).get("found", []))  # Ajusté en fonction de la structure de résultats
        return {"output":results}
