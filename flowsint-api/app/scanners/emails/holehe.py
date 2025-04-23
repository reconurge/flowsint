from typing import Dict, Any, List
from app.scanners.base import Scanner
from app.models.types import OSINTType
from app.utils import DataType

class HoleheScanner(Scanner):
    @classmethod
    def name(self) -> str:
        return "holehe_scanner"
    
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
            "output": "dict",  # A list of results for each username scan
        }
    
    async def scan(self, emails: List[str]) -> List[Dict[str, Any]]:
        """
        Effectue la recherche Holehe pour chaque email de la liste.
        """
        results = []
        for email in emails:
            try:
                result = await self._perform_holehe_research(email)
                results.append(result)
            except Exception as e:
                results.append({"email": email, "error": f"Unexpected error in Holehe scan: {str(e)}"})
        
        return results
    
    async def _perform_holehe_research(self, email: str) -> Dict[str, Any]:
        """
        Recherche asynchrone sur le réseau social et autres plateformes.
        """
        from holehe.modules.social_media import instagram, twitter, snapchat, bitmoji, crevado, discord, strava, imgur, myspace, fanpop, taringa, tellonym, tumblr, odnoklassniki, wattpad, xing, vsco
        from holehe.modules.shopping import amazon, ebay, deliveroo, garmin, vivino
        from holehe.modules.mails import google, yahoo, protonmail, mail_ru
        from holehe.modules.osint import rocketreach
        import httpx
        
        # Initialise le client httpx pour les requêtes HTTP asynchrones
        async with httpx.AsyncClient() as client:
            results = []
            
            # Liste des modules à tester
            modules = [
                amazon.amazon, google.google, yahoo.yahoo, protonmail.protonmail,
                instagram.instagram, twitter.twitter, snapchat.snapchat,
                rocketreach.rocketreach
            ]
            
            # Exécution des requêtes pour chaque module
            for module in modules:
                module_result = []
                try:
                    await module(email, client, module_result)
                    if module_result and module_result[0].get("exists") is not None:
                        results.append(module_result[0])
                except Exception as e:
                    results.append({"error": f"Error in {module.__name__}: {str(e)}"})
        
            return {"email": email, "results": results}
    
    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transformation des résultats après le scan.
        Ajout de la catégorie et des plateformes trouvées.
        """
        for result in results:
            result["scanner"] = "holehe"
            
            # Ajoute une liste des plateformes dans le résultat
            if "found" in result and isinstance(result["found"], dict):
                result["platforms"] = list(result["found"].keys())
            
            categories = {
                "social_media": ["instagram", "twitter", "snapchat", "facebook"],
                "email": ["protonmail", "gmail", "yahoo", "outlook"],
                "products": ["adobe", "amazon", "spotify", "netflix"]
            }
            
            # Classification des plateformes dans les catégories définies
            result["categories"] = {}
            for category, platforms in categories.items():
                result["categories"][category] = [
                    p for p in result["platforms"] if p in platforms
                ]
        
        return {"output":results}
