import hashlib
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
from app.types.gravatar import Gravatar

InputType: TypeAlias = List[Email]
OutputType: TypeAlias = List[Gravatar]


class EmailToGravatarScanner(Scanner):
    """From email to gravatar."""

    @classmethod
    def name(cls) -> str:
        return "to_gravatar"

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
        # Find the Gravatar type in $defs
        domain_def = schema["$defs"].get("Gravatar")
        if not domain_def:
            raise ValueError("Gravatar type not found in schema")
        return {
            "type": "Gravatar",
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in domain_def["properties"].items()
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
        """Fetch gravatar from email."""
        results: OutputType = []
        for email in data:
            try:
                # MD5 hash of the email
                hash = hashlib.md5(email.email.encode()).hexdigest()
                url = f"https://www.gravatar.com/avatar/{hash}"
                response = requests.get(url)
                if response.status_code == 200:
                    results.append(Gravatar(src=url, hash=hash))
                else:
                    continue
            except Exception as e:
                Logger.info(self.sketch_id, {"message": f"No gravatar found for email {email.email}: {e}"})
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for i, gravatar in enumerate(results):
            email = original_input[i] if i < len(original_input) else None
            
            query = """
            MERGE (g:gravatar {hash: $hash})
            SET g.sketch_id = $sketch_id,
                g.label = $src,
                g.type = "gravatar",
                g.src = $src
            """
            if email:
                query += """
                MERGE (e:email {email: $email})
                SET e.sketch_id = $sketch_id,
                    e.label = $email,
                    e.type = "email"
                MERGE (e)-[:HAS_GRAVATAR {sketch_id: $sketch_id}]->(g)
                """
            
            if self.neo4j_conn:
                params = {
                    "hash": gravatar.hash,
                    "src": str(gravatar.src),
                    "sketch_id": self.sketch_id,
                }
                if email:
                    params.update({
                        "email": email.email,
                    })
                self.neo4j_conn.query(query, params)
            
            email_address = email.email if email else "unknown"
            payload: Dict = {
                "message": f"{email_address} -> {gravatar.hash}"
            }
            Logger.graph_append(self.sketch_id, payload)
            
        return results