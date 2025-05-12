import requests
from typing import List, Dict, Any, TypeAlias, Union
from pydantic import TypeAdapter
from app.scanners.base import Scanner
from app.types.organization import MinimalOrganization, Organization, Identifier
from app.utils import resolve_type

InputType: TypeAlias = List[MinimalOrganization]
OutputType: TypeAlias = List[Organization]

class SireneScanner(Scanner):
    """Enrich MinimalOrganization with data from SIRENE (France only)."""

    @classmethod
    def name(cls) -> str:
        return "sirene_scanner"

    @classmethod
    def category(cls) -> str:
        return "organizations"

    @classmethod
    def input_schema(cls) -> List[Dict[str, Any]]:
        adapter = TypeAdapter(InputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["MinimalOrganization"]["properties"].items()
        ]

    @classmethod
    def output_schema(cls) -> List[Dict[str, Any]]:
        adapter = TypeAdapter(OutputType)
        return [
            {"name": prop, "type": resolve_type(details)}
            for prop, details in adapter.json_schema()["$defs"]["Organization"]["properties"].items()
        ]

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            if isinstance(item, str):
                cleaned.append(MinimalOrganization(name=item))
            elif isinstance(item, dict) and "name" in item:
                cleaned.append(MinimalOrganization(**item))
            elif isinstance(item, MinimalOrganization):
                cleaned.append(item)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for org in data:
            try:
                enriched = self.query_sirene(org.name)
                if enriched:
                    results.append(enriched)
            except Exception as e:
                print(f"Error enriching organization {org.name}: {e}")
        return results

    def query_sirene(self, name: str) -> Organization:
        try:
            params = {"q": name, "per_page": 1}
            resp = requests.get("https://recherche-entreprises.api.gouv.fr/search", params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("results"):
                raise ValueError(f"No match found for {name}")
            company = data["results"][0]

            identifiers = []
            if siren := company.get("siren"):
                identifiers.append(Identifier(type="SIREN", value=siren, country="FR", issued_by="INSEE"))
            if siret := company.get("siege", {}).get("siret"):
                identifiers.append(Identifier(type="SIRET", value=siret, country="FR", issued_by="INSEE"))

            return Organization(
                name=company.get("nom_entreprise") or name,
                founding_date=company.get("date_creation"),
                country="FR",
                description=company.get("categorie_entreprise"),
                identifiers=identifiers or None,
            )
        except Exception as e:
            print(f"SIRENE API query failed for {name}: {e}")
            return Organization(name=name)
        
    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for org in results:
            self.neo4j_conn.query("""
                MERGE (o:organization {name: $name})
                SET o.founding_date = $founding_date,
                    o.country = $country,
                    o.description = $description,
                    o.label = $label,
                    o.caption = $caption,
                    o.color = $color,
                    o.type = $type,
                    o.sketch_id = $sketch_id
            """, {
                "name": org.name,
                "founding_date": org.founding_date,
                "country": org.country,
                "description": org.description,
                "label": org.name,
                "caption": org.name,
                "color": "#2F80ED",
                "type": "organization",
                "sketch_id": self.sketch_id,
            })

            for identifier in org.identifiers or []:
                self.neo4j_conn.query("""
                    MERGE (i:identifier {type: $type, value: $value})
                    SET i.country = $country,
                        i.issued_by = $issued_by,
                        i.sketch_id = $sketch_id,
                        i.label = $label,
                        i.caption = $label
                    WITH i
                    MATCH (o:organization {name: $org_name})
                    MERGE (o)-[:HAS_IDENTIFIER {sketch_id: $sketch_id}]->(i)
                """, {
                    "type": identifier.type.lower(),
                    "label": f"{identifier.type}: {identifier.value}",
                    "caption": f"{identifier.type}: {identifier.value}",
                    "value": identifier.value,
                    "country": identifier.country,
                    "issued_by": identifier.issued_by,
                    "sketch_id": self.sketch_id,
                    "org_name": org.name,
                })

        return results


