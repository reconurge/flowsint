from typing import Dict, Any, List, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.email import Email
from app.types.social import Social
from pydantic import TypeAdapter
from app.utils import is_valid_email, resolve_type
import asyncio


InputType: TypeAlias = List[Email]
OutputType: TypeAlias = List[Social]

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
    def input_schema(cls) -> List[Dict[str, Any]]:
        adapter = TypeAdapter(InputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalSocial"]["properties"].items()
        ]

    @classmethod
    def output_schema(cls) -> List[Dict[str, Any]]:
        adapter = TypeAdapter(OutputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["Social"]["properties"].items()
        ]
    
    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            obj = None
            if isinstance(item, str):
                obj = Email(email=item)
            elif isinstance(item, dict) and "email" in item:
                obj = Email(email=item["email"])
            elif isinstance(item, Email):
                obj = item

            if obj and obj.email and is_valid_email(obj.email):
                cleaned.append(obj)
        return cleaned
    
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
            
            modules = [
                amazon.amazon, google.google, yahoo.yahoo, protonmail.protonmail,
                instagram.instagram, twitter.twitter, snapchat.snapchat,
                rocketreach.rocketreach
            ]
            
            for module in modules:
                module_result = []
                try:
                    await module(email, client, module_result)
                    if module_result and module_result[0].get("exists") is not None:
                        results.append(module_result[0])
                except Exception as e:
                    results.append({"error": f"Error in {module.__name__}: {str(e)}"})
        
            return {"email": email, "results": results}
        
    async def scan(self, emails: List[str]) -> List[Dict[str, Any]]:
        """
        Effectue la recherche Holehe pour chaque email de la liste.
        """
        results = []
        for email in emails:
            found = []
            try:
                result = await self._perform_holehe_research(email)
                for result in result["results"]:
                    print(result)
                    if(result["exists"]):
                        print(result)
                        found.append(result)                
            except Exception as e:
                print(e)
                continue
            results.append(found)

        
        return results
    
    def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        preprocessed = self.preprocess(values)
        results = asyncio.run(self.scan(preprocessed))
        try:
            return self.postprocess(results, preprocessed)
        except TypeError as e:
            if "positional argument" in str(e) or "unexpected" in str(e):
                return self.postprocess(results)
            raise

        
    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return results
