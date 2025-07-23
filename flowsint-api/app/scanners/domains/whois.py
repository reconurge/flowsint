import json
from typing import List, Dict, Any, Union
import whois
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import Domain, Domain
from app.types.whois import Whois
from app.types.email import Email
from pydantic import TypeAdapter
from app.core.logger import Logger

class WhoisScanner(Scanner):
    """Scan for WHOIS information of a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
    OutputType = List[Whois]

    @classmethod
    def name(cls) -> str:
        return "to_whois"

    @classmethod
    def category(cls) -> str:
        return "Domain"
    
    @classmethod
    def key(cls) -> str:
        return "domain"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                if is_valid_domain(item):
                    domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                if is_valid_domain(item["domain"]):
                    domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj:
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for domain in data:
            try:
                whois_info = whois.whois(domain.domain)
                if whois_info:
                    # Extract emails from whois data
                    emails = []
                    if whois_info.emails:
                        if isinstance(whois_info.emails, list):
                            emails = [Email(email=email) for email in whois_info.emails if email]
                        else:
                            emails = [Email(email=whois_info.emails)]
                    
                    whois_obj = Whois(
                        domain=domain.domain,
                        registrar=str(whois_info.registrar) if whois_info.registrar else None,
                        creation_date=whois_info.creation_date,
                        expiration_date=whois_info.expiration_date,
                        name_servers=whois_info.name_servers if whois_info.name_servers else [],
                        emails=emails,
                        raw_text=str(whois_info)
                    )
                    results.append(whois_obj)
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error getting WHOIS for domain {domain.domain}: {e}"})
                continue
                
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain in results:
            if not self.neo4j_conn:
                continue
            whois_obj = domain["whois"]
            Logger.graph_append(self.sketch_id, {"message": f"WHOIS for {domain['domain']} -> registrar: {whois_obj.registrar} org: {whois_obj.org} city: {whois_obj.city} country: {whois_obj.country} creation_date: {whois_obj.creation_date} expiration_date: {whois_obj.expiration_date}"})
            props = {
                "domain": domain["domain"],
                "registrar": whois_obj.registrar,
                "org": whois_obj.org,
                "city": whois_obj.city,
                "country": whois_obj.country,
                "creation_date": whois_obj.creation_date,
                "expiration_date": whois_obj.expiration_date,
                "email": whois_obj.email.email if whois_obj.email else None,
                "sketch_id": self.sketch_id
            }

            query = """
            MERGE (d:domain {domain: $domain})
                SET d.sketch_id = $sketch_id,
                    d.label = $domain,
                    d.type = "domain"
            MERGE (w:whois {domain: $domain, sketch_id: $sketch_id})
            SET w.registrar = $registrar,
                w.org = $org,
                w.type = "whois",
                w.label = "Whois",
                w.city = $city,
                w.country = $country,
                w.creation_date = $creation_date,
                w.expiration_date = $expiration_date,
                w.email = $email
            MERGE (d)-[:HAS_WHOIS {sketch_id: $sketch_id}]->(w)
            """
            self.neo4j_conn.query(query, props)

            # Create organization node if org information is available
            if whois_obj.org:
                org_query = """
                MERGE (o:organization {name: $org_name})
                SET o.country = $country,
                    o.founding_date = $creation_date,
                    o.description = $description,
                    o.label = $label,
                    o.caption = $caption,
                    o.type = $type,
                    o.sketch_id = $sketch_id
                """
                self.neo4j_conn.query(org_query, {
                    "org_name": whois_obj.org,
                    "country": whois_obj.country,
                    "creation_date": whois_obj.creation_date,
                    "description": f"Organization from WHOIS data for {domain['domain']}",
                    "label": whois_obj.org,
                    "caption": whois_obj.org,
                    "type": "organization",
                    "sketch_id": self.sketch_id,
                })
                
                # Create relationship between domain and organization
                self.neo4j_conn.query("""
                    MERGE (d:domain {domain: $domain})
                    MERGE (o:organization {name: $org_name})
                    MERGE (o)-[:HAS_DOMAIN {sketch_id: $sketch_id}]->(d)
                """, {
                    "domain": domain["domain"],
                    "org_name": whois_obj.org,
                    "sketch_id": self.sketch_id,
                })
                
                Logger.graph_append(self.sketch_id, {"message": f"{domain['domain']} -> {whois_obj.org} (organization)"})

            if whois_obj.email:
                email_query = """
                MERGE (e:email {email: $email})
                SET e.sketch_id = $sketch_id,
                     e.type = "email",
                     e.label = $email
                MERGE (w:whois {domain: $domain, sketch_id: $sketch_id})
                MERGE (w)-[:REGISTERED_BY {sketch_id: $sketch_id}]->(e)
                """
                self.neo4j_conn.query(email_query, {
                    "email": whois_obj.email.email,
                    "domain": domain["domain"],
                    "sketch_id": self.sketch_id
                })

        return results




# Make types available at module level for easy access
InputType = WhoisScanner.InputType
OutputType = WhoisScanner.OutputType
