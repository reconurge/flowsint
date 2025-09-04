import requests
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from flowsint_core.core.transform_base import Transform
from flowsint_types.ip import Ip, Ip
from flowsint_core.utils import resolve_type, is_valid_ip

InputType: TypeAlias = List[Ip]
OutputType: TypeAlias = List[Ip]


class IpToInfosTransform(Transform):
    """[ip-api.com] Get information data for IP addresses."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Ip]
    OutputType = List[Ip]

    @classmethod
    def name(cls) -> str:
        return "ip_to_infos"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ],
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ],
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            ip_obj = None
            if isinstance(item, str):
                ip_obj = Ip(address=item)
            elif isinstance(item, dict) and "address" in item:
                ip_obj = Ip(address=item["address"])
            elif isinstance(item, Ip):
                ip_obj = item
            if ip_obj and is_valid_ip(ip_obj.address):
                cleaned.append(ip_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for ip in data:
            try:
                geo_data = self.get_location_data(ip.address)
                enriched_ip = Ip(
                    address=ip.address,
                    latitude=geo_data.get("latitude"),
                    longitude=geo_data.get("longitude"),
                    country=geo_data.get("country"),
                    city=geo_data.get("city"),
                    isp=geo_data.get("isp"),
                )
                results.append(enriched_ip)
            except Exception as e:
                print(f"Error geolocating {ip.address}: {e}")
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Update IP nodes in Neo4j with geolocation information."""
        if self.neo4j_conn:
            for ip in results:
                self.create_node(
                    "ip",
                    "address",
                    ip.address,
                    latitude=ip.latitude,
                    longitude=ip.longitude,
                    country=ip.country,
                    city=ip.city,
                    isp=ip.isp,
                    type="ip",
                )
                self.log_graph_message(
                    f"Geolocated {ip.address} to {ip.city}, {ip.country} (lat: {ip.latitude}, lon: {ip.longitude})"
                )
        return results

    def get_location_data(self, address: str) -> Dict[str, Any]:
        """
        Get geolocation information from a public API like ip-api.com
        """
        try:
            response = requests.get(f"http://ip-api.com/json/{address}", timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success":
                return {
                    "latitude": data.get("lat"),
                    "longitude": data.get("lon"),
                    "country": data.get("country"),
                    "city": data.get("city"),
                    "isp": data.get("isp"),
                }
            else:
                raise ValueError(
                    f"Geolocation failed for {address}: {data.get('message')}"
                )
        except Exception as e:
            print(f"Failed to geolocate {address}: {e}")
            return {}


InputType = IpToInfosTransform.InputType
OutputType = IpToInfosTransform.OutputType
