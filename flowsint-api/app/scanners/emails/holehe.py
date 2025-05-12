from typing import Dict, Any, List, TypeAlias, Union
from app.scanners.base import Scanner
from app.types.email import Email
from app.types.social import Social
from pydantic import TypeAdapter
from app.utils import is_valid_email, resolve_type
import asyncio
from app.core.logger import logger


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
            for prop, details in adapter.json_schema()["$defs"]["Email"]["properties"].items()
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
                    if("error" not in result and "exists" in result):
                        found.append(
                        Social(
                            username=email.email,
                            profile_url=f"https://{result['domain']}",
                            platform=result["name"]))         
            except Exception as e:
                print(e)
                continue
            results.extend(found)

        
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

        
    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for profile in results:
            logger.info(self.scan_id, self.sketch_id, f"{profile.username} -> account found on {profile.platform}")
            self.neo4j_conn.query("""
                MERGE (p:social_profile {profile_url: $profile_url})
                SET p.platform = $platform,
                    p.username = $username,
                    p.label = $label,
                    p.caption = $caption,
                    p.type = $type,
                    p.sketch_id = $sketch_id

                MERGE (i:email {email: $email})
                SET i.sketch_id = $sketch_id
                MERGE (i)-[:HAS_SOCIAL_ACCOUNT {sketch_id: $sketch_id}]->(p)
            """, {
                "profile_url": profile.profile_url,
                "username": profile.username,
                "platform": profile.platform,
                "label": f"{profile.platform}:{profile.username}",
                "caption": f"{profile.platform}:{profile.username}",
                "color": "#1DA1F2",
                "email": profile.username,
                "type": "social_profile",
                "sketch_id": self.sketch_id
            })


        return results
