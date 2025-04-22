# app/scanners/holehe_scanner.py
import asyncio
from typing import Dict, Any
from app.scanners.base import Scanner

class IgnorantScanner(Scanner):    
    @classmethod
    def name(self) -> str:
        return "ignorant_scanner"
    @classmethod
    def category(self) -> str:
        return "phones"
    @classmethod
    def key(self) -> str:
        return "phone_number"
    
    def scan(self, phone: str) -> Dict[str, Any]:
        try:
            return asyncio.run(self._perform_ignorant_research(phone))
        except Exception as e:
            return {"error": f"Unexpected error in Ingorant scan: {str(e)}"}
    
    async def _perform_ignorant_research(self, phone: str) -> Dict[str, Any]:
        try:
            from ignorant.modules.shopping.amazon import amazon
            from ignorant.modules.social_media.instagram import instagram
            from ignorant.modules.social_media.snapchat import snapchat
            import httpx
            client = httpx.AsyncClient()
            results = []
            modules = [
                amazon, snapchat, instagram
            ]
            
            results = []
            for module in modules:
                module_result = []
                try:
                    await module(phone, "+33", client, module_result)
                    results.append(module_result)
                except Exception as e:
                    results.append({"error": f"Error in {module.__name__}: {str(e)}"})
        
            return {"results": results}
            
        except Exception as e:
            return {"error": f"Error in Ignorant research: {str(e)}"}
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        results["scanner"] = "ignorant"
        results["count"] = len(results.get("found", {}))
        return results
            
        return results