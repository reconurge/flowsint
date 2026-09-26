"""
Domain to PhishStats Enricher

Enriches domains with phishing intelligence from the PhishStats API.
"""

from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.domain import Domain
from flowsint_types.website import Website
from flowsint_types.ip import Ip
from tools.phishstats_client import get_phishstats_client


@flowsint_enricher
class DomainToPhishstatsEnricher(Enricher):
    """Query PhishStats API for phishing URLs associated with a domain."""

    InputType = Domain
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "domain_to_phishstats"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def documentation(cls) -> str:
        return """
# Domain to PhishStats

Query the PhishStats API to find phishing URLs associated with a domain.

## What it does

- Takes domain names as input
- Queries the PhishStats API for all phishing records using that domain
- Returns websites with phishing metadata including:
  - URL and page title
  - IP address and geographic location
  - Security indicators (Safe Browsing, VirusTotal, etc.)
  - Statistics (times seen, threat score)

## Data Source

- **API**: PhishStats (https://phishstats.info)
- **Rate Limit**: 20 requests per minute
- **Coverage**: Global phishing database updated every 90 minutes

## Graph Relationships

Creates the following Neo4j relationships:
- `(Domain)-[:FOUND_IN_PHISHING]->(Website)`
- `(Website)-[:RESOLVES_TO]->(Ip)`
- `(Ip)-[:BELONGS_TO_ASN]->(ASN)`
- `(ASN)-[:OPERATED_BY]->(Organization)`

## Example

Input: Domain `github.io`
Output: Website nodes for all phishing sites using that domain
"""

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Query PhishStats API for each domain."""
        results: List[OutputType] = []
        client = get_phishstats_client()

        for domain_obj in data:
            try:
                # Query PhishStats API by domain/host - exact match, last 10 results
                records = client.query_by_domain_exact(domain_obj.domain, size=10)

                if not records:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No phishing records found for domain {domain_obj.domain}"}
                    )
                    continue

                # Convert API responses to Website objects
                for record in records:
                    try:
                        # Create Website with PhishStats metadata
                        website = Website(
                            url=record.get("url"),
                            title=record.get("title"),
                            status_code=record.get("http_code"),
                        )
                        
                        # Add PhishStats-specific metadata as extra fields
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
                    {"message": f"Found {len(records)} phishing records for domain {domain_obj.domain}"}
                )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error querying PhishStats for domain {domain_obj.domain}: {e}"}
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

        # Create relationships between Domains and Websites
        for domain_obj in original_input:
            self.create_node(domain_obj)

            # Find all Websites that match this domain
            matching_sites = [
                w for w in results
                if w.__dict__.get("host") and domain_obj.domain in w.__dict__.get("host")
            ]

            for website in matching_sites:
                self.create_relationship(
                    domain_obj,
                    website,
                    "FOUND_IN_PHISHING"
                )
                self.log_graph_message(
                    f"Domain {domain_obj.domain} found in phishing: {website.url}"
                )

                # Create IP node if IP is present
                ip_address = website.__dict__.get("ip_address")
                if ip_address:
                    try:
                        ip_obj = Ip(address=ip_address)
                        self.create_node(ip_obj)
                        self.create_relationship(
                            website,
                            ip_obj,
                            "RESOLVES_TO"
                        )
                        self.log_graph_message(
                            f"Website resolves to IP {ip_address}"
                        )

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
                                    f"IP {ip_address} belongs to ASN {asn}"
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
                    except Exception:
                        pass  # Invalid IP, skip

        return results


InputType = DomainToPhishstatsEnricher.InputType
OutputType = DomainToPhishstatsEnricher.OutputType
