import datetime
import os
from typing import Any, Dict, List, Optional

import requests

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.risk_profile import RiskProfile


@flowsint_enricher
class IpToVpn(Enricher):
    """[VPNDetection] Check whether an IP address is a VPN, Tor or privacy relay."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Ip
    OutputType = RiskProfile

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault: Any = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )
        self.ip_risk_mapping: List[tuple[Ip, RiskProfile]] = []

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare optional parameters for this enricher"""
        return [
            {
                "name": "VPNDETECTION_API_KEY",
                "type": "vaultSecret",
                "description": "Optional VPNDetection API key. Without one, the free plan returns the VPN, Tor and relay flags; a paid key adds the proxy and hosting flags.",
                "required": False,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "ip_to_vpn"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    @staticmethod
    def _risk_factors(answer: Dict[str, Any]) -> List[str]:
        """Turn a VPNDetection answer into risk factor labels. A flag missing
        from the answer is one the plan does not include, so it adds nothing."""
        factors: List[str] = []
        for flag, label, detail in (
            ("is_vpn", "VPN", "vpn"),
            ("is_tor", "Tor", "tor"),
            ("is_relay", "Privacy relay", "relay"),
        ):
            if answer.get(flag):
                provider = (answer.get(detail) or {}).get("provider_name")
                factors.append(f"{label}: {provider}" if provider else label)
        for flag, label in (
            ("is_resproxy", "Residential proxy"),
            ("is_dcproxy", "Datacenter proxy"),
            ("is_mobproxy", "Mobile proxy"),
            ("is_pubproxy", "Public proxy"),
            ("is_hosting", "Hosting"),
            ("is_bot", "Bot"),
        ):
            if answer.get(flag):
                factors.append(label)
        return factors

    async def scan(self, data: List[Ip]) -> List[RiskProfile]:
        results: List[RiskProfile] = []
        self.ip_risk_mapping = []

        api_key = self.get_secret(
            "VPNDETECTION_API_KEY", os.getenv("VPNDETECTION_API_KEY")
        )
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

        for ip in data:
            try:
                response = requests.get(
                    f"https://api.vpndetection.io/{ip.address}",
                    headers=headers,
                    timeout=30,
                )
                if response.status_code != 200:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"(IpToVpn) Enricher failed for the IP address: '{ip.address}': {response.text}"
                        },
                    )
                    continue

                answer = response.json()
                if answer.get("is_bogon"):
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"(IpToVpn) {ip.address} is a private or reserved address."
                        },
                    )
                    continue

                factors = self._risk_factors(answer)
                if not factors:
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"(IpToVpn) {ip.address} is not a VPN, Tor or relay address."
                        },
                    )
                    continue

                risk_profile = RiskProfile(
                    entity_id=ip.address,
                    entity_type="IP address",
                    last_updated=datetime.datetime.now(
                        datetime.timezone.utc
                    ).isoformat(),
                    risk_factors=factors,
                    source="VPNDetection",
                )
                results.append(risk_profile)
                self.ip_risk_mapping.append((ip, risk_profile))

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"(IpToVpn) Exception while querying {ip.address}: {e}"
                    },
                )

        return results

    def postprocess(
        self, results: List[RiskProfile], input_data: Optional[List[Ip]] = None
    ) -> List[RiskProfile]:
        if not self._graph_service:
            return results

        for ip, risk_profile in self.ip_risk_mapping:
            self.create_node(ip)
            self.create_node(risk_profile)
            self.create_relationship(ip, risk_profile, "HAS_RISK_PROFILE")
            self.log_graph_message(
                f"(IpToVpn) IP {ip.address}: {', '.join(risk_profile.risk_factors or [])}"
            )

        return results


# Make types available at module level for easy access
InputType = IpToVpn.InputType
OutputType = IpToVpn.OutputType
