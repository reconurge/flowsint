import asyncio
from typing import Dict, Any, List
from app.scanners.base import Scanner
from app.utils import is_valid_phone_number
import httpx

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
    
    @classmethod
    def input_schema(self) -> Dict[str, str]:
        """Defines the expected input schema for the scan."""
        return {
            "phone_numbers": "array"  # List of phone numbers to scan
        }
    
    @classmethod
    def output_schema(self) -> Dict[str, str]:
        """Defines the structure of the data returned by the scan."""
        return {
            "output": "dict"
        }

    async def scan(self, phone_numbers: List[str]) -> List[Dict[str, Any]]:
        """
        Performs the Ignorant search for each specified phone number.
        """
        results = []
        for phone in phone_numbers:
            try:
                cleaned_phone = is_valid_phone_number(phone)
                if cleaned_phone:
                    result = await self._perform_ignorant_research(cleaned_phone)
                    results.append(result)
                else:
                    results.append({
                        "phone_number": phone,
                        "error": "Invalid phone number"
                    })
            except Exception as e:
                results.append({
                    "phone_number": phone,
                    "error": f"Unexpected error in Ignorant scan: {str(e)}"
                })
        return results
    
    async def _perform_ignorant_research(self, phone: str) -> Dict[str, Any]:
        try:
            # Import necessary modules for each platform
            from ignorant.modules.shopping.amazon import amazon
            from ignorant.modules.social_media.instagram import instagram
            from ignorant.modules.social_media.snapchat import snapchat
            
            # Create an HTTP client for asynchronous requests
            async with httpx.AsyncClient() as client:
                results = []
                modules = [amazon, snapchat, instagram]
                
                # Execute the modules in parallel
                tasks = [module(phone, "+33", client) for module in modules]
                responses = await asyncio.gather(*tasks)
                
                # Add results from each module
                for response in responses:
                    if response:
                        results.append(response)
                
                return results
            
        except Exception as e:
            return {
                "phone_number": phone,
                "error": f"Error in Ignorant research: {str(e)}"
            }
    
    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Adds additional metadata to the results.
        """
        return { "output": {"phones": results } }
