import requests
from typing import List

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import Phone, Device

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class HudsonRockToPhone(Enricher):
    """[HudsonRock] Looks up phone number/s associated with devices from Infostealer related data using HudsonRock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Phone
    OutputType = Device

    @classmethod
    def name(cls) -> str:
        return "phone_to_device_hudsonrock"

    @classmethod
    def category(cls) -> str:
        return "phones"

    @classmethod
    def key(cls) -> str:
        return "number"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for phone_obj in data:
            phonenum_value = phone_obj.number
            try:
                api_request = requests.get(f'https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-username?username={phonenum_value}', timeout=30)

                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToPhone) failed for the phone number: '{phonenum_value}': {api_request.text}"
                        },
                    )
                    continue

                try:
                    response_json = api_request.json()
                except Exception as e:
                    Logger.error(None, {"message": f"(HudsonRockToPhone) Failed to parse JSON for {phonenum_value}: {api_request.text}"})
                    continue
                
                if response_json["total_user_services"] == 0:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToPhone) did not find anything for the phone number: '{phonenum_value}'."
                        },
                    )
                    continue

                elif response_json["total_user_services"] >= 1:
                    for stealer_info in response_json["stealers"]:
                        device_id = stealer_info.get("computer_name")
                        device_type = "PC/Laptop"
                        os = stealer_info.get("operating_system")
                        last_seen = stealer_info.get("date_compromised")
                        is_desktop = True

                        ip = stealer_info.get("ip")
                        if isinstance(ip, str):
                            if ip.lower() == "not found" or not ip.strip():
                                ip_addresses = []
                            else:
                                ip_addresses = [ip]
                        elif isinstance(ip, list):
                            ip_addresses = ip
                        else:
                            ip_addresses = []

                        source = f"{stealer_info.get('stealer_family')} (stealer)"

                        results.append(
                            Device(
                                device_id=device_id, type=device_type, os=os, last_seen=last_seen, is_desktop=is_desktop,
                                ip_addresses=ip_addresses, source=source
                            )
                        )
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(HudsonRockToPhone) Exception while querying {phonenum_value}: {e}"})

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:

        if not self._graph_service:
            return results

        for device in results:
            try:
                self.create_node(device)
                
                for phone_obj in original_input:
                    self.create_relationship(
                            phone_obj, device, "ASSOCIATED_WITH_DEVICE")
                    self.log_graph_message(f"(HudsonRockToPhone) {phone_obj.email} -> found device '{device.device_id}'")
            
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create graph nodes (HudsonRockToPhone): {e}"
                    },
                )
                continue

        return results


# Make types available at module level for easy access
InputType = HudsonRockToPhone.InputType
OutputType = HudsonRockToPhone.OutputType