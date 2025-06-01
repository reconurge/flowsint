import json
from typing import List, Dict, Any, TypeAlias, Union
import whois
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import Domain, MinimalDomain
from app.types.whois import Whois
from app.types.email import Email
from pydantic import TypeAdapter

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[Domain]


class WhoisScanner(Scanner):
    """Scan for WHOIS information of a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_whois_scanner"

    @classmethod
    def category(cls) -> str:
        return "domains"
    
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
                {"name": prop, "type": resolve_type(info)}
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
                {"name": prop, "type": resolve_type(info)}
                for prop, info in details["properties"].items()
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = MinimalDomain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = MinimalDomain(domain=item["domain"])
            elif isinstance(item, MinimalDomain):
                domain_obj = item
            if domain_obj and is_valid_domain(domain_obj.domain) != "invalid":
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
                    domain=Domain(domain=d.domain),
                    registrar=w_data.get("registrar"),
                    org=w_data.get("org"),
                    city=w_data.get("city"),
                    country=w_data.get("country"),
                    email=Email(email=w_data["emails"][0]) if isinstance(w_data.get("emails"), list) else None,
                    creation_date=str(w_data.get("creation_date")) if w_data.get("creation_date") else None,
                    expiration_date=str(w_data.get("expiration_date")) if w_data.get("expiration_date") else None,
                )
                results.append(whois_obj)

            except Exception as e:
                print(e)
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for whois_obj in results:
            if not self.neo4j_conn:
                continue

            props = {
                "domain": whois_obj.domain.domain,
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
            MERGE (d)-[:HAS_WHOIS {sketch_id: $sketch_id}]->(sub)
            SET d.registrar = $registrar,
                d.org = $org,
                d.city = $city,
                d.country = $country,
                d.creation_date = $creation_date,
                d.expiration_date = $expiration_date,
                d.whois_email = $email,
                d.sketch_id = $sketch_id
            """
            self.neo4j_conn.query(query, props)

            if whois_obj.email:
                email_query = """
                MERGE (e:email {email: $email})
                SET e.sketch_id = $sketch_id
                MERGE (d:domain {domain: $domain})
                MERGE (d)-[:HAS_WHOIS_EMAIL {sketch_id: $sketch_id}]->(e)
                """
                self.neo4j_conn.query(email_query, {
                    "email": whois_obj.email.email,
                    "domain": whois_obj.domain.domain,
                    "sketch_id": self.sketch_id
                })

        return results
