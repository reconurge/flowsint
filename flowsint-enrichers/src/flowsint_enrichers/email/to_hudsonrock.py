import requests
from typing import List

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import Email, Device

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class HudsonRockToEmail(Enricher):
    """[HudsonRock] Looks up email/s associated with devices from Infostealer related data using HudsonRock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Email
    OutputType = Device

    @classmethod
    def name(cls) -> str:
        return "email_to_device_hudsonrock"

    @classmethod
    def category(cls) -> str:
        return "Email"

    @classmethod
    def key(cls) -> str:
        return "email"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for email_obj in data:
            email_value = email_obj.email
            try:
                api_request = requests.get(f'https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email={email_value}', timeout=30)

                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToEmail) failed for the email: '{email_value}': {api_request.text}"
                        },
                    )
                    continue

                try:
                    response_json = api_request.json()
                except Exception as e:
                    Logger.error(None, {"message": f"(HudsonRockToEmail) Failed to parse JSON for {email_value}: {api_request.text}"})
                    continue
                
                if response_json["total_user_services"] == 0:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToEmail) did not find anything for the email: '{email_value}'."
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
                Logger.error(self.sketch_id, {"message": f"(HudsonRockToEmail) Exception while querying {email_value}: {e}"})

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:

        if not self._graph_service:
            return results

        for device in results:
            try:
                self.create_node(device)
                
                for email_obj in original_input:
                    self.create_relationship(
                            email_obj, device, "ASSOCIATED_WITH_DEVICE")
                    self.log_graph_message(f"(HudsonRockToEmail) {email_obj.email} -> found device '{device.device_id}'")
            
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create graph nodes (HudsonRockToEmail): {e}"
                    },
                )
                continue

        return results


# Make types available at module level for easy access
InputType = HudsonRockToEmail.InputType
OutputType = HudsonRockToEmail.OutputType