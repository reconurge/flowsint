"""
Website to PhishStats Enricher

Enriches websites/URLs with phishing intelligence from the PhishStats API.
"""

from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.website import Website
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from tools.phishstats_client import get_phishstats_client


@flowsint_enricher
class WebsiteToPhishstatsEnricher(Enricher):
    """Query PhishStats API for phishing records matching a website URL."""

    InputType = Website
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "website_to_phishstats"

    @classmethod
    def category(cls) -> str:
        return "Website"

    @classmethod
    def key(cls) -> str:
        return "url"

    @classmethod
    def documentation(cls) -> str:
        return """
# Website to PhishStats

Query the PhishStats API to find phishing records matching a website URL.

## What it does

- Takes Website URLs as input
- Queries the PhishStats API for exact URL matches
- Returns website with PhishStats metadata if found

## Data Source

- **API**: PhishStats (https://phishstats.info)
- **Rate Limit**: 20 requests per minute
- **Coverage**: Global phishing database updated every 90 minutes

## Graph Relationships

Creates the following Neo4j relationships:
- `(Website)-[:FOUND_IN_PHISHING]->(Website)` (enriched with metadata)
- `(Website)-[:USES_DOMAIN]->(Domain)`
- `(Website)-[:RESOLVES_TO]->(Ip)`
- `(Ip)-[:BELONGS_TO_ASN]->(ASN)`
- `(ASN)-[:OPERATED_BY]->(Organization)`

## Example

Input: Website `https://github.io/phishing`
Output: Same website enriched with PhishStats metadata (if found)
"""

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Query PhishStats API for each website URL."""
        results: List[OutputType] = []
        client = get_phishstats_client()

        for website_obj in data:
            try:
                # Extract the URL string
                url_str = str(website_obj.url)

                # Query PhishStats API by URL - exact match, last 1 result (URLs are unique)
                records = client.query_by_url_exact(url_str, size=1)

                if not records:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No phishing records found for URL {url_str}"}
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
                    {"message": f"Found {len(records)} phishing records for URL {url_str}"}
                )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error querying PhishStats for URL {website_obj.url}: {e}"}
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

        # Create relationships between input Websites and found phishing Websites
        for input_website in original_input:
            self.create_node(input_website)

            url_str = str(input_website.url).lower()

            # Find matching websites
            matching_sites = [
                w for w in results
                if url_str in str(w.url).lower() or str(w.url).lower() in url_str
            ]

            for website in matching_sites:
                self.create_relationship(
                    input_website,
                    website,
                    "FOUND_IN_PHISHING"
                )
                self.log_graph_message(
                    f"Website {input_website.url} found in phishing database"
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


InputType = WebsiteToPhishstatsEnricher.InputType
OutputType = WebsiteToPhishstatsEnricher.OutputType
