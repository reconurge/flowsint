"""
Phrase to PhishStats Enricher

Search PhishStats for URLs and titles matching a phrase pattern.
"""

from typing import List
from flowsint_core.core.logger import Logger
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.phrase import Phrase
from flowsint_types.website import Website
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from tools.phishstats_client import get_phishstats_client


@flowsint_enricher
class PhraseToPhishstatsEnricher(Enricher):
    """Search PhishStats for phishing URLs matching a phrase in title or URL."""

    InputType = Phrase
    OutputType = Website

    @classmethod
    def name(cls) -> str:
        return "phrase_to_phishstats"

    @classmethod
    def category(cls) -> str:
        return "Phrase"

    @classmethod
    def key(cls) -> str:
        return "text"

    @classmethod
    def documentation(cls) -> str:
        return """
# Phrase to PhishStats

Search the PhishStats API for phishing URLs where the phrase appears in the title OR URL.

## What it does

- Takes a phrase/keyword as input
- Searches PhishStats for matches in:
  - Page titles (like,~phrase~)
  - URLs (like,~phrase~)
- Returns matching phishing websites with full metadata
- Results sorted by newest first

## Data Source

- **API**: PhishStats (https://phishstats.info)
- **Rate Limit**: 20 requests per minute
- **Coverage**: Global phishing database updated every 90 minutes

## Query Pattern

Uses OR logic to search both fields:
```
_where=(title,like,~{phrase}~)~or(url,like,~{phrase}~)
```

## Graph Relationships

Creates the following Neo4j relationships:
- `(Phrase)-[:FOUND_IN_PHISHING]->(Website)`
- `(Website)-[:USES_DOMAIN]->(Domain)`
- `(Website)-[:RESOLVES_TO]->(Ip)`
- `(Ip)-[:BELONGS_TO_ASN]->(ASN)`
- `(ASN)-[:OPERATED_BY]->(Organization)`

## Examples

**Search for "facebook" phishing:**
- Input: Phrase "facebook"
- Finds: Sites with "facebook" in title or URL

**Search for "paypal" phishing:**
- Input: Phrase "paypal"  
- Finds: Sites with "paypal" in title or URL

**Search for bank names:**
- Input: Phrase "chase"
- Finds: Phishing sites targeting Chase bank
"""

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Search PhishStats for each phrase."""
        results: List[OutputType] = []
        client = get_phishstats_client()

        for phrase_obj in data:
            try:
                phrase_text = str(phrase_obj.text)

                # Build OR query: (title,like,~phrase~)~or(url,like,~phrase~)
                where_clause = f"(title,like,~{phrase_text}~)~or(url,like,~{phrase_text}~)"

                Logger.info(
                    self.sketch_id,
                    {"message": f"Searching PhishStats for phrase: {phrase_text}"}
                )

                # Query with the OR clause, last 10 results
                records = client.query(where_clause, size=10, sort="-id")

                if not records:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No phishing records found for phrase '{phrase_text}'"}
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
                        # These will be stored as properties on the node
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
                    {"message": f"Found {len(records)} phishing records for phrase'{phrase_text}'"}
                )

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error querying PhishStats for phrase '{phrase_obj.text}': {e}"}
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

        # Create relationships between Phrases and Websites
        for phrase_obj in original_input:
            self.create_node(phrase_obj)

            phrase_text = str(phrase_obj.text).lower()

            # Find all Websites that match this phrase
            matching_sites = [
                w for w in results
                if phrase_text in str(w.url).lower() or 
                   (w.title and phrase_text in w.title.lower())
            ]

            for website in matching_sites:
                self.create_relationship(
                    phrase_obj,
                    website,
                    "FOUND_IN_PHISHING"
                )
                self.log_graph_message(
                    f"Phrase '{phrase_obj.text}' found in phishing: {website.url}"
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


InputType = PhraseToPhishstatsEnricher.InputType
OutputType = PhraseToPhishstatsEnricher.OutputType
