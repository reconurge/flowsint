import requests
import os

from typing import Dict, Any, List, Optional
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_core.core.logger import Logger
from flowsint_types.phone import Phone


@flowsint_enricher
class PhoneToCarrier(Enricher):
    """[veriphone] Looks up phone number/s carrier using veriphone API."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Phone  
    OutputType = Phone  

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this enricher"""
        return [
            {
                "name": "VERIPHONE_API_KEY",
                "type": "vaultSecret",
                "description": "The veriphone API key for phone number carrier lookups.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "phone_to_carrier"

    @classmethod
    def category(cls) -> str:
        return "phones"

    @classmethod
    def key(cls) -> str:
        return "number"
 
    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        api_key = self.get_secret("VERIPHONE_API_KEY", os.getenv("VERIPHONE_API_KEY"))
        Logger.debug(self.sketch_id, {"message": f"API key present: {bool(api_key)}"})
        
        for phone_obj in data:
            phonenum_value = phone_obj.number
            try:
                api_request = requests.get(f'https://api.veriphone.io/v2/verify?key={api_key}&phone={phonenum_value}', timeout=30)
                
                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(PhoneToCarrier) Enricher failed for the phone number: '{phonenum_value}': {api_request.text}"
                        },
                    )
                    continue

                try:
                    response_json = api_request.json()
                except Exception as e:
                    Logger.error(None, {"message": f"(PhoneToCarrier) Failed to parse JSON for phone number '{phonenum_value}'': {api_request.text}"})
                    continue

                carrier = response_json.get("carrier")
                if carrier:
                    results.append({
                        "number": phonenum_value,
                        "carrier": carrier
                    })

            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(PhoneToCarrier) Exception while querying phone number '{phonenum_value}'': {e}"})
        
        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        if not self._graph_service:
            return results

        for result in results:
            number = result["number"]
            carrier = result["carrier"]

            for phone_obj in original_input:
                if phone_obj.number == number:
                    phone_obj.carrier = carrier

                    self.create_node(phone_obj)
                    
                    self.log_graph_message(
                        f"(PhoneToCarrier) Found carrier ({carrier}) for the phone number '{number}'."
                    )
                    break

        return results


# Make types available at module level for easy access
InputType = PhoneToCarrier.InputType
OutputType = PhoneToCarrier.OutputType