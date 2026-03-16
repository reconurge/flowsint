import subprocess
from pathlib import Path
from typing import List

import requests
import json

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import Device, Username

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class HudsonRockToUsername(Enricher):
    """[HudsonRock] Looks up username/s associated with devices from Infostealer related data using HudsonRock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Username
    OutputType = Device

    @classmethod
    def name(cls) -> str:
        return "username_to_device_hudsonrock"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for username in data:
            try:
                api_request = requests.get(f'https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-username?username={username.value}', timeout=30)

                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToUsername) failed for the username '{username.value}': {api_request.text}"
                        },
                    )
                    continue
                response_json = api_request.json()

                if response_json["total_user_services"] == 0:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(HudsonRockToUsername) did not find anything for the username '{username.value}'."
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
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to run HudsonRockToUsername for {username.value} (error): {e}"
                    },
                )

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:

        if not self._graph_service:
            return results

        for device in results:
            try:
                self.create_node(device)
                
                for username in original_input:
                    self.create_relationship(
                        username, device, "ASSOCIATED_WITH_DEVICE"
                    )
                    self.log_graph_message(
                        f"{username.value} -> found device '{device.device_id}'"
                    )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create graph nodes (HudsonRockToUsername): {e}"
                    },
                )
                continue

        return results


# Make types available at module level for easy access
InputType = HudsonRockToUsername.InputType
OutputType = HudsonRockToUsername.OutputType