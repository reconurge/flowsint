import requests
from typing import List, Dict, Any
from flowsint_core.core.transform_base import Transform
from flowsint_types.ip import Ip


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

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for ip in data:
            try:
                geo_data = self.get_location_data(ip.address)
                # Enrich the existing IP object with geo data
                ip.latitude = geo_data.get("latitude")
                ip.longitude = geo_data.get("longitude")
                ip.country = geo_data.get("country")
                ip.city = geo_data.get("city")
                ip.isp = geo_data.get("isp")
                results.append(ip)
            except Exception as e:
                print(f"Error geolocating {ip.address}: {e}")
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Update IP nodes in Neo4j with geolocation information."""
        if self.neo4j_conn:
            for ip in results:
                self.create_node(ip)
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
