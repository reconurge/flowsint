import json
import uuid
from typing import Dict, Any, List, Union
import hibpwned
from app.scanners.base import Scanner
from app.core.logger import Logger
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

class HibpScanner(Scanner):
    """Queries HaveIBeenPwned for potential leaks."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[str]  # Email addresses as strings
    OutputType = List[Dict[str, Any]]  # Breach results as dictionaries

    @classmethod
    def name(cls) -> str:
        return "hibp_scanner"
    
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
        for email in data:
            try:
                result = hibpwned.Pwned(email, "MyHIBPChecker", HIBP_API_KEY)

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
                results.append({
                    "email": email,
                    "error": f"Error during scan: {str(e)}",
                })
                Logger.error(self.sketch_id, {"message": f"Error scanning email {email}: {str(e)}"})
        
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j relationships for found breaches."""
        if not self.neo4j_conn:
            return results

        for result in results:
            if "error" not in result:
                email = result["email"]
                
                # Create email node
                email_query = """
                MERGE (email:email {address: $address})
                SET email.sketch_id = $sketch_id,
                    email.label = $address,
                    email.caption = $address,
                    email.type = "email"
                """
                self.neo4j_conn.query(email_query, {
                    "address": email,
                    "sketch_id": self.sketch_id
                })
                
                # Create breach relationships
                for breach in result.get("breaches", []):
                    if breach and isinstance(breach, dict):
                        breach_name = breach.get("Name", "Unknown")
                        self.neo4j_conn.query("""
                            MERGE (breach:breach {name: $name})
                            SET breach.sketch_id = $sketch_id,
                                breach.label = $name,
                                breach.caption = $name,
                                breach.type = "breach"
                            WITH breach
                            MATCH (email:email {address: $email_address})
                            MERGE (email)-[:FOUND_IN_BREACH {sketch_id: $sketch_id}]->(breach)
                        """, {
                            "name": breach_name,
                            "email_address": email,
                            "sketch_id": self.sketch_id
                        })
                        Logger.graph_append(self.sketch_id, {"message": f"Email {email} found in breach: {breach_name}"})

        return results

# Make types available at module level for easy access
InputType = HibpScanner.InputType
OutputType = HibpScanner.OutputType
