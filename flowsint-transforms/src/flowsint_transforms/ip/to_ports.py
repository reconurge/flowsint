from typing import Any, Dict, List, Optional, Union
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.graph_db import Neo4jConnection
from flowsint_types.ip import Ip
from flowsint_types.port import Port
from flowsint_core.utils import is_valid_ip
from flowsint_core.core.logger import Logger
from tools.network.naabu import NaabuTool


class IpToPortsTransform(Transform):
    """[NAABU] Performs port scanning on IP addresses to discover open ports and services."""

    # Define types as class attributes
    InputType = List[Ip]
    OutputType = List[Port]

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return False

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare parameters for this transform"""
        return [
            {
                "name": "mode",
                "type": "select",
                "description": "Scan mode: active (direct port scanning) or passive (using PDCP database)",
                "required": True,
                "default": "passive",
                "options": [
                    {"label": "Passive", "value": "passive"},
                    {"label": "Active", "value": "active"},
                ],
            },
            {
                "name": "port_range",
                "type": "string",
                "description": "Port range to scan (e.g., '80,443,8080' or '1-1000'). Leave empty for default.",
                "required": False,
            },
            {
                "name": "top_ports",
                "type": "string",
                "description": "Scan top N ports (e.g., '100', '1000'). Overrides port_range if set.",
                "required": False,
                "default": "100",
            },
            {
                "name": "rate",
                "type": "number",
                "description": "Packets per second rate limit (for active scans). Default: 1000",
                "required": False,
            },
            {
                "name": "timeout",
                "type": "number",
                "description": "Timeout in milliseconds. Default: 1000",
                "required": False,
            },
            {
                "name": "service_detection",
                "type": "select",
                "description": "Enable service/version detection",
                "required": False,
                "default": "false",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "PDCP_API_KEY",
                "type": "vaultSecret",
                "description": "ProjectDiscovery Cloud Platform API key (required for passive mode)",
                "required": False,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "ip_to_ports"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            ip_obj = None
            if isinstance(item, str):
                if is_valid_ip(item):
                    ip_obj = Ip(address=item)
            elif isinstance(item, dict) and "address" in item:
                if is_valid_ip(item["address"]):
                    ip_obj = Ip(**item)
            elif isinstance(item, Ip):
                ip_obj = item
            if ip_obj:
                cleaned.append(ip_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        naabu = NaabuTool()

        # Get parameters from transform config
        mode = self.params.get("mode", "passive")
        port_range = self.params.get("port_range")
        top_ports = self.params.get("top_ports")
        rate = self.params.get("rate")
        timeout = self.params.get("timeout")
        service_detection = self.params.get("service_detection", "false") == "true"
        api_key = self.get_secret("PDCP_API_KEY", None)

        # Validate passive mode requirements
        if mode == "passive" and not api_key:
            Logger.warn(
                self.sketch_id,
                {
                    "message": "[NAABU] Passive mode requires PDCP_API_KEY. Please configure it in the vault."
                },
            )
            return results

        for ip in data:
            try:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[NAABU] Scanning {ip.address} in {mode} mode..."
                    },
                )

                # Launch naabu scan
                scan_results = naabu.launch(
                    target=ip.address,
                    mode=mode,
                    port_range=port_range,
                    top_ports=top_ports,
                    rate=rate,
                    timeout=timeout,
                    service_detection=service_detection,
                    api_key=api_key,
                )

                # Parse results and create Port objects
                for result in scan_results:
                    # Naabu JSON output format includes: ip, port, protocol, etc.
                    port_number = result.get("port")
                    if not port_number:
                        continue

                    port = Port(
                        number=port_number,
                        protocol=result.get("protocol", "tcp").upper(),
                        state="open",  # Naabu only returns open ports
                        service=result.get("service"),
                        banner=result.get("version") or result.get("banner"),
                    )

                    # Store the IP address with this port for postprocess
                    setattr(port, "_ip_address", ip.address)

                    results.append(port)

                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[NAABU] Found open port {port.number}/{port.protocol} on {ip.address}"
                            + (f" ({port.service})" if port.service else "")
                        },
                    )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[NAABU] Error scanning {ip.address}: {e}"},
                )
                continue

        return results

    def postprocess(
        self, results: OutputType, input_data: InputType = None
    ) -> OutputType:
        """Create Neo4j nodes for ports and relationships with IP addresses"""
        if self.neo4j_conn and results:
            for port in results:
                # Get the IP address this port belongs to
                ip_address = getattr(port, "_ip_address", None)
                if not ip_address:
                    continue

                # Create Port node with composite key (ip:port) to handle multiple IPs
                port_id = f"{ip_address}:{port.number}"
                port_label = f"{port.number}/{port.protocol}"
                self.create_node(
                    "port",
                    "id",
                    port_id,
                    label=port_label,
                    type="port",
                    number=port.number,
                    protocol=port.protocol,
                    state=port.state,
                    service=port.service,
                    banner=port.banner,
                    ip_address=ip_address,
                )

                # Create relationship from IP to Port
                self.create_relationship(
                    "ip",
                    "address",
                    ip_address,
                    "port",
                    "id",
                    port_id,
                    "HAS_PORT",
                )

                service_info = f" ({port.service})" if port.service else ""
                self.log_graph_message(
                    f"Port {port.number}/{port.protocol}{service_info} found on {ip_address}"
                )

                # Clean up temporary attribute
                delattr(port, "_ip_address")

        return results


# Make types available at module level for easy access
InputType = IpToPortsTransform.InputType
OutputType = IpToPortsTransform.OutputType
