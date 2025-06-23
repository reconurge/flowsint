import json
from typing import List, Dict, Any, TypeAlias, Union
import whois
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import Domain, Domain
from app.types.whois import Whois
from app.types.email import Email
from app.types.organization import Organization
from pydantic import TypeAdapter
from app.core.logger import Logger

InputType: TypeAlias = List[Domain]
OutputType: TypeAlias = List[Whois]


class WhoisScanner(Scanner):
    """Scan for WHOIS information of a domain."""

    @classmethod
    def name(cls) -> str:
        return "to_whois"

    @classmethod
    def category(cls) -> str:
        return "Domain"
    
    @classmethod
    def key(cls) -> str:
        return "domain"

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
            ]
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
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Extract WHOIS data for each domain."""
        results: OutputType = []
        for d in data:
            try:
                w = whois.whois(d.domain)
                w_data = json.loads(json.dumps(w, default=str))
                whois_obj = Whois(
                    registrar=w_data.get("registrar"),
                    org=w_data.get("org"),
                    city=w_data.get("city"),
                    country=w_data.get("country"),
                    email=Email(email=w_data["emails"][0]) if isinstance(w_data.get("emails"), list) else None,
                    creation_date=str(w_data.get("creation_date")) if w_data.get("creation_date") else None,
                    expiration_date=str(w_data.get("expiration_date")) if w_data.get("expiration_date") else None,
                )
                results.append({"whois": whois_obj, "domain": d.domain})

            except Exception as e:
                print(e)
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
