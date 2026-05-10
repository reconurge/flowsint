import json
import os
import requests
import datetime

from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.risk_profile import RiskProfile
from flowsint_core.utils import is_valid_ip
from flowsint_core.core.logger import Logger

@flowsint_enricher
class IpToFraudScore(Enricher):
    """[Scamalytics] Get fraud score for an IP address."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Ip
    OutputType = RiskProfile

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

    # @classmethod
    # def required_params(cls) -> bool:
    #     return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this enricher"""
        return [
            {
                "name": "SCAMLYTICS_USERNAME",
                "type": "vaultSecret",
                "description": "The Scamalytics Username.",
                "required": True,
            },
            {
                "name": "SCAMLYTICS_API_KEY",
                "type": "vaultSecret",
                "description": "The Scamalytics API key for IP-based lookups.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "ip_to_fraudscore"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        api_username = self.get_secret("SCAMLYTICS_USERNAME", os.getenv("SCAMLYTICS_USERNAME")) 
        api_key = self.get_secret("SCAMLYTICS_API_KEY", os.getenv("SCAMLYTICS_API_KEY")) 

        for ip in data:
            try:
                api_request = requests.get(f'https://api12.scamalytics.com/v3/{api_username}/?key={api_key}&ip={ip.address}', timeout=30)
                
                if api_request.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(IpToFraudScore) Enricher failed for the IP address: '{ip.address}': {api_request.text}"
                        },
                    )
                    continue

                try:
                    response_json = api_request.json()
                except Exception as e:
                    Logger.error(None, {"message": f"(IpToFraudScore) Failed to parse JSON for {ip.address}: {api_request.text}"})
                    continue

                scamalytics_info = response_json.get("scamalytics", {})
                if scamalytics_info.get("status") != "ok":
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(IpToFraudScore) Request to Scamlytics failed (status): '{response_json["status"]}'."
                        },
                    )
                    continue

                fraud_score = scamalytics_info.get("scamalytics_score")
                fraud_risk = scamalytics_info.get("scamalytics_risk")
                proxy_flags = []

                proxy_detectors = {
                    "is_datacenter": "Datacenter",
                    "is_vpn": "VPN",
                    "is_apple_icloud_private_relay": "iCloud Private Relay",
                    "is_amazon_aws": "Amazon AWS",
                    "is_google": "Google"
                }

                proxy_info = scamalytics_info.get("scamalytics_proxy", {})

                for key, label in proxy_detectors.items():
                    if proxy_info.get(key):
                        proxy_flags.append(label)

                results.append(
                    RiskProfile(
                        entity_id=ip.address, entity_type="IP address", overall_risk_score=fraud_score, risk_level=fraud_risk, last_updated=datetime.datetime.utcnow().isoformat(), risk_factors=proxy_flags, source="Scamalytics"
                        )
                    )

            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(IpToFraudScore) Exception while querying {ip.address}: {e}"})
        
        return results

    def postprocess(
        self, results: List[OutputType], input_data: List[InputType] = None
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        if input_data and self._graph_service:
            for ip, risk_profile in zip(input_data, results):
                self.create_node(ip)
                self.create_node(risk_profile)

                # Create relationship
                self.create_relationship(ip, risk_profile, "HAS_RISK_PROFILE")
                self.log_graph_message(
                    f"(IpToFraudScore) IP {ip.address} has risk level of {risk_profile.risk_level}"
                )

        return results


# Make types available at module level for easy access
InputType = IpToFraudScore.InputType
OutputType = IpToFraudScore.OutputType
