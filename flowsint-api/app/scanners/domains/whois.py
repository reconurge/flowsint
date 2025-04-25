import json
from typing import List, Dict, Any, TypeAlias
import whois
from app.utils import is_valid_domain, resolve_type
from app.scanners.base import Scanner
from app.types.domain import MinimalDomain
from app.types.whois import Whois
from app.types.email import Email
from pydantic import TypeAdapter

InputType: TypeAlias = List[MinimalDomain]
OutputType: TypeAlias = List[Whois]


class WhoisScanner(Scanner):
    """Scan for WHOIS information of a domain."""

    @classmethod
    def name(cls) -> str:
        return "domain_whois_scanner"

    @classmethod
    def category(cls) -> str:
        return "domains"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalDomain"]["properties"].items()
            ]
        return schema

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["Whois"]["properties"].items()
            ]
        return schema

    def preprocess(self, data: InputType) -> InputType:
        """Filter out invalid domains."""
        return[d for d in data if is_valid_domain(d.domain) != "invalid"]

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
                results.append(whois_obj)

            except Exception as e:
                print(e)
                continue

        return results

    def postprocess(self, results: OutputType) -> OutputType:
        print(results)
        return results
