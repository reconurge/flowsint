from typing import Dict, Any, List, Union, Optional
import hibpwned
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger
from flowsint_core.core.graph_db import Neo4jConnection
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")


class HibpTransform(Transform):
    """Queries HaveIBeenPwned for potential leaks."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[str]  # Email addresses as strings
    OutputType = List[Dict[str, Any]]  # Breach results as dictionaries

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this transform"""
        return [
            {
                "name": "HIBP_API_KEY",
                "type": "vaultSecret",
                "description": "The HIBP API key to use for breach lookups.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "to_hibp_leaks"

    @classmethod
    def category(cls) -> str:
        return "leaks"

    @classmethod
    def key(cls) -> str:
        return "email"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            if isinstance(item, str):
                cleaned.append(item)
            elif isinstance(item, dict) and "email" in item:
                cleaned.append(item["email"])
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Performs a search on HaveIBeenPwned for a list of emails."""
        results: OutputType = []
        api_key = self.get_secret("HIBP_API_KEY", os.getenv("HIBP_API_KEY"))

        for email in data:
            try:
                result = hibpwned.Pwned(email, "MyHIBPChecker", api_key)

                # Clear data structure for results
                breaches = result.search_all_breaches()
                pastes = result.search_pastes()
                password = result.search_password("BadPassword")
                hashes = result.search_hashes("21BD1")

                email_result = {
                    "email": email,
                    "breaches": breaches if breaches else [],
                    "adobe": result.single_breach("adobe") or {},
                    "data": result.data_classes() or [],
                    "pastes": pastes if pastes else [],
                    "password": password if password else {},
                    "hashes": hashes if hashes else [],
                }
                results.append(email_result)
            except Exception as e:
                results.append(
                    {
                        "email": email,
                        "error": f"Error during scan: {str(e)}",
                    }
                )
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error scanning email {email}: {str(e)}"},
                )

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j relationships for found breaches."""
        if not self.neo4j_conn:
            return results

        for result in results:
            if "error" not in result:
                email = result["email"]

                # Create email node
                self.create_node("email", "address", email, email=email)

                # Create breach relationships
                for breach in result.get("breaches", []):
                    if breach and isinstance(breach, dict):
                        breach_name = breach.get("Name", "Unknown")
                        self.create_node(
                            "breach",
                            "name",
                            breach_name,
                            caption=breach_name,
                            type="breach",
                        )
                        self.create_relationship(
                            "email",
                            "address",
                            email,
                            "breach",
                            "name",
                            breach_name,
                            "FOUND_IN_BREACH",
                        )
                        self.log_graph_message(
                            f"Email {email} found in breach: {breach_name}"
                        )

        return results


# Make types available at module level for easy access
InputType = HibpTransform.InputType
OutputType = HibpTransform.OutputType
