import hashlib
import os
from typing import List, Dict, Any, TypeAlias, Union
from urllib.parse import urlparse

import requests
from app.utils import resolve_type
from app.scanners.base import Scanner
from app.types.website import Website
from app.types.domain import Domain
from pydantic import TypeAdapter
from app.core.logger import Logger
from app.types.email import Email
from app.types.breach import Breach
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

InputType: TypeAlias = List[Email]
OutputType: TypeAlias = List[Breach]


class EmailToBreachesScanner(Scanner):
    """From email to breaches."""

    @classmethod
    def name(cls) -> str:
        return "to_breaches"

    @classmethod
    def category(cls) -> str:
        return "Email"
    
    @classmethod
    def key(cls) -> str:
        return "email"

    @classmethod
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        # Find the Email type in $defs
        website_def = schema["$defs"].get("Email")
        if not website_def:
            raise ValueError("Email type not found in schema")
        return {
            "type": "Email",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in website_def["properties"].items()
            ]
        }


    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        # Find the Breach type in $defs
        breach_def = schema["$defs"].get("Breach")
        if not breach_def:
            raise ValueError("Breach type not found in schema")
        return {
            "type": "Breach",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in breach_def["properties"].items()
            ]
        }

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            email_obj = None
            if isinstance(item, str):
                # If it's a string, treat it as a str
                email_obj = Email(email=item)
            elif isinstance(item, dict) and "email" in item:
                email_obj = Email(**item)
            elif isinstance(item, Email):
                email_obj = item
            if email_obj:
                cleaned.append(email_obj)
        return cleaned

    def scan(self, data: InputType) -> OutputType:
        """Fetch breaches from email using HaveIBeenPwned API."""
        results: OutputType = []
        if not HIBP_API_KEY:
            raise ValueError("HIBP_API_KEY not set for this account. Usr the Vault to set your haveibeenpwned key. ")
        for email in data:
            try:
                url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email.email}?truncateResponse=false"
                headers = {"hibp-api-key": HIBP_API_KEY} if HIBP_API_KEY else {}
                response = requests.get(url, headers=headers)
                if response.status_code == 200:
                    breaches_data = response.json()
                    # Create a Breach object for each breach in the response
                    for breach_item in breaches_data:
                        # Lowercase all keys for the model
                        breach_item_lc = {k.lower(): v for k, v in breach_item.items()}
                        name_value = breach_item.get("Name")
                        name = name_value.lower() if name_value else "unknown"
                        # Lowercase the value of the 'name' key in the breach dict as well
                        if "name" in breach_item_lc and breach_item_lc["name"]:
                            breach_item_lc["name"] = breach_item_lc["name"].lower()
                        breach = Breach(
                            name=name,
                            **{k: breach_item_lc.get(k) for k in Breach.model_fields.keys() if k not in ("breach", "name")},
                            breach=breach_item_lc
                        )
                        results.append(breach)
                else:
                    continue
            except Exception as e:
                Logger.info(self.sketch_id, {"message": f"No breach found for email {email.email}: {e}"})
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        # Create a mapping of email to breaches
        email_to_breaches = {}
        for i, breach in enumerate(results):
            # Find the corresponding email (assuming one email can have multiple breaches)
            # We need to track which email this breach belongs to
            # For now, we'll use the first email if we have multiple breaches
            email_index = min(i, len(original_input) - 1) if original_input else None
            email = original_input[email_index] if email_index is not None else None
            
            if email:
                if email.email not in email_to_breaches:
                    email_to_breaches[email.email] = []
                email_to_breaches[email.email].append(breach)
            
            # Create breach node with all properties
            query = """
            MERGE (b:breach {name: $name})
            SET b.sketch_id = $sketch_id,
                b.label = $name,
                b.type = "breach",
                b.title = $title,
                b.domain = $domain,
                b.breachdate = $breachdate,
                b.addeddate = $addeddate,
                b.modifieddate = $modifieddate,
                b.pwncount = $pwncount,
                b.description = $description,
                b.src = $logopath,
                b.dataclasses = $dataclasses,
                b.isverified = $isverified,
                b.isfabricated = $isfabricated,
                b.issensitive = $issensitive,
                b.isretired = $isretired,
                b.isspamlist = $isspamlist,
                b.ismalware = $ismalware,
                b.isstealerlog = $isstealerlog,
                b.issubscriptionfree = $issubscriptionfree
            """
            
            if self.neo4j_conn:
                params = {
                    "name": breach.name,
                    "sketch_id": self.sketch_id,
                    "title": breach.title,
                    "domain": breach.domain,
                    "breachdate": breach.breachdate,
                    "addeddate": breach.addeddate,
                    "modifieddate": breach.modifieddate,
                    "pwncount": breach.pwncount,
                    "description": breach.description,
                    "logopath": breach.logopath,
                    "dataclasses": breach.dataclasses,
                    "isverified": breach.isverified,
                    "isfabricated": breach.isfabricated,
                    "issensitive": breach.issensitive,
                    "isretired": breach.isretired,
                    "isspamlist": breach.isspamlist,
                    "ismalware": breach.ismalware,
                    "isstealerlog": breach.isstealerlog,
                    "issubscriptionfree": breach.issubscriptionfree,
                }
                self.neo4j_conn.query(query, params)
        
        # Create email nodes and relationships
        for email_email, breaches in email_to_breaches.items():
            email_query = """
            MERGE (e:email {email: $email})
            SET e.sketch_id = $sketch_id,
                e.label = $email,
                e.type = "email"
            """
            
            if self.neo4j_conn:
                email_params = {
                    "email": email_email,
                    "sketch_id": self.sketch_id,
                }
                self.neo4j_conn.query(email_query, email_params)
            
            # Create relationships for each breach
            for breach in breaches:
                rel_query = """
                MATCH (e:email {email: $email})
                MATCH (b:breach {name: $breach_name})
                MERGE (e)-[:HAS_BREACH {sketch_id: $sketch_id}]->(b)
                """
                
                if self.neo4j_conn:
                    rel_params = {
                        "email": email_email,
                        "breach_name": breach.name,
                        "sketch_id": self.sketch_id,
                    }
                    self.neo4j_conn.query(rel_query, rel_params)
                
                payload: Dict = {
                    "message": f"{email_email} -> {breach.name}"
                }
                Logger.graph_append(self.sketch_id, payload)
            
        return results