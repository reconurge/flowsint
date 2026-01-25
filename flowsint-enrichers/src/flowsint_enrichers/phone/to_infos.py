import asyncio
from typing import Dict, Any, List, Union
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_core.utils import is_valid_number
from flowsint_core.core.logger import Logger
from flowsint_types.phone import Phone
import httpx


@flowsint_enricher
class IgnorantEnricher(Enricher):

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Phone  # Phone objects
    OutputType = Dict[str, Any]  # Results as dictionaries

    @classmethod
    def name(cls) -> str:
        return "phone_to_infos"

    @classmethod
    def category(cls) -> str:
        return "phones"

    @classmethod
    def key(cls) -> str:
        return "number"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """
        Performs the Ignorant search for each specified phone number.
        """
        results: List[OutputType] = []
        for phone_obj in data:
            try:
                cleaned_phone = is_valid_number(phone_obj.number)
                if cleaned_phone:
                    result = await self._perform_ignorant_research(cleaned_phone)
                    results.append(result)
                else:
                    results.append({"number": phone_obj.number, "error": "Invalid phone number"})
            except Exception as e:
                results.append(
                    {
                        "number": phone_obj.number,
                        "error": f"Unexpected error in Ignorant scan: {str(e)}",
                    }
                )
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error scanning phone {phone_obj.number}: {str(e)}"},
                )
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

                return {"number": phone, "platforms": results}

        except Exception as e:
            return {"number": phone, "error": f"Error in Ignorant research: {str(e)}"}

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        """
        Create Neo4j relationships for found phone accounts.
        """
        if not self._graph_service:
            return results

        for result in results:
            if "error" not in result and "platforms" in result:
                phone_obj = Phone(number=result["number"])
                self.create_node(phone_obj)

                # Create platform relationships
                for platform_result in result["platforms"]:
                    if platform_result and isinstance(platform_result, dict):
                        platform_name = platform_result.get("platform", "unknown")
                        self.log_graph_message(
                            f"Phone {result['number']} found on {platform_name}"
                        )

        return results


# Make types available at module level for easy access
InputType = IgnorantEnricher.InputType
OutputType = IgnorantEnricher.OutputType
