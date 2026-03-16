"""
IP to PhishStats Enricher

Enriches IP addresses with phishing intelligence from the PhishStats API.
"""

from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.ip import Ip
from flowsint_types.website import Website
from flowsint_types.domain import Domain
from tools.phishstats_client import get_phishstats_client


@flowsint_enricher
class IpToPhishstatsEnricher(Enricher):
    """Query PhishStats API for phishing URLs associated with an IP address."""

    InputType = Ip
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "ip_to_phishstats"

    @classmethod
    def category(cls) -> str:
        return "Ip"

    @classmethod
    def key(cls) -> str:
        return "address"

    @classmethod
    def documentation(cls) -> str:
        return """
# IP to PhishStats

Query the PhishStats API to find phishing URLs associated with an IP address.

## What it does

- Takes IP addresses as input
- Queries the PhishStats API for all phishing records hosted on that IP
- Returns websites with detailed phishing metadata

## Data Source

- **API**: PhishStats (https://phishstats.info)
- **Rate Limit**: 20 requests per minute
- **Coverage**: Global phishing database updated every 90 minutes

## Graph Relationships

Creates the following Neo4j relationships:
- `(Ip)-[:HOSTS_PHISHING]->(Website)`
- `(Website)-[:USES_DOMAIN]->(Domain)`
- `(Ip)-[:BELONGS_TO_ASN]->(ASN)`
- `(ASN)-[:OPERATED_BY]->(Organization)`

## Example

Input: IP `185.199.110.153`
Output: Website nodes for all phishing URLs hosted on that IP
"""

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Query PhishStats API for each IP address."""
        results: List[OutputType] = []
        client = get_phishstats_client()

        for ip_obj in data:
            try:
                # Query PhishStats API - exact match, last 10 results
                records = client.query_by_ip(ip_obj.address, size=10)

                if not records:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No phishing records found for IP {ip_obj.address}"}
                    )
                    continue

                # Convert API responses to Website objects
                for record in records:
                    try:
                        website = Website(
                            url=record.get("url"),
                            title=record.get("title"),
                            status_code=record.get("http_code"),
                        )
                        
                        # Add PhishStats metadata
                        website.__dict__["phishstats_id"] = record.get("id")
                        website.__dict__["phishing_score"] = record.get("score")
                        website.__dict__["date_detected"] = record.get("date")
                        website.__dict__["google_safebrowsing"] = record.get("google_safebrowsing")
                        website.__dict__["virus_total"] = record.get("virus_total")
                        website.__dict__["ip_address"] = record.get("ip")
                        website.__dict__["asn"] = record.get("asn")
                        website.__dict__["isp"] = record.get("isp")
                        website.__dict__["host"] = record.get("host")
                        website.__dict__["country"] = record.get("countrycode")
                        
                        results.append(website)
                    except Exception as e:
                        Logger.error(
                            self.sketch_id,
                            {"message": f"Error parsing PhishStats record: {e}"}
                        )
                        continue

                Logger.info(
                    self.sketch_id,
                    {"message": f"Found {len(records)} phishing records for IP {ip_obj.address}"}
                )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error querying PhishStats for IP {ip_obj.address}: {e}"}
                )
                continue

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        """Create graph nodes and relationships."""
        if not self.neo4j_conn:
            return results

        # Create nodes for all websites
        for website in results:
            self.create_node(website)

        # Create relationships between IPs and Websites
        for ip_obj in original_input:
            self.create_node(ip_obj)

            # Find all Websites that match this IP
            matching_sites = [w for w in results if w.__dict__.get("ip_address") == ip_obj.address]

            for website in matching_sites:
                self.create_relationship(
                    ip_obj,
                    website,
                    "HOSTS_PHISHING"
                )
                self.log_graph_message(
                    f"IP {ip_obj.address} hosts phishing: {website.url}"
                )

                # Create Domain node if host is present
                host = website.__dict__.get("host")
                if host:
                    try:
                        domain_obj = Domain(domain=host)
                        self.create_node(domain_obj)
                        self.create_relationship(
                            website,
                            domain_obj,
                            "USES_DOMAIN"
                        )
                        self.log_graph_message(
                            f"Website uses domain {host}"
                        )
                    except Exception:
                        pass  # Invalid domain, skip

                # Create ASN node if ASN is present
                asn = website.__dict__.get("asn")
                if asn:
                    try:
                        from flowsint_types.asn import ASN
                        asn_obj = ASN(asn_str=asn)
                        self.create_node(asn_obj)
                        self.create_relationship(
                            ip_obj,
                            asn_obj,
                            "BELONGS_TO_ASN"
                        )
                        self.log_graph_message(
                            f"IP {ip_obj.address} belongs to ASN {asn}"
                        )

                        # Create Organization node for ISP
                        isp = website.__dict__.get("isp")
                        if isp:
                            try:
                                from flowsint_types.organization import Organization
                                org_obj = Organization(name=isp)
                                self.create_node(org_obj)
                                self.create_relationship(
                                    asn_obj,
                                    org_obj,
                                    "OPERATED_BY"
                                )
                                self.log_graph_message(
                                    f"ASN {asn} operated by {isp}"
                                )
                            except Exception:
                                pass  # Invalid organization, skip
                    except Exception:
                        pass  # Invalid ASN, skip

        return results


InputType = IpToPhishstatsEnricher.InputType
OutputType = IpToPhishstatsEnricher.OutputType
