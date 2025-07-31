import os
from typing import Any, Dict, List, Optional, Union
import requests
from urllib.parse import urljoin
from app.scanners.base import Scanner
from app.core.logger import Logger
from app.types.email import Email
from app.types.breach import Breach
from dotenv import load_dotenv
from app.core.graph_db import Neo4jConnection

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

class EmailToBreachesScanner(Scanner):
    """From email to breaches using Have I Been Pwned API."""

    InputType = List[Email]
    OutputType = List[tuple]  # List of (email, breach) tuples
    
    def __init__(
            self,
            sketch_id: Optional[str] = None,
            scan_id: Optional[str] = None,
            neo4j_conn: Optional[Neo4jConnection] = None,
            vault=None,
            params: Optional[Dict[str, Any]] = None
        ):
            super().__init__(
                sketch_id=sketch_id,
                scan_id=scan_id,
                neo4j_conn=neo4j_conn,
                params_schema=self.get_params_schema(),
                vault=vault,
                params=params
            )

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
    def required_params(cls) -> bool:
        return True
    
    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this scanner"""
        return [
            {
                "name": "HIBP_API_KEY",
                "type": "vaultSecret",
                "description": "The HIBP API key to use for breaches lookup.",
                "required": True
            },
            {
                "name": "HIBP_API_URL",
                "type": "url",
                "description": "The HIBP API URL to use for breaches lookup.",
                "required": False,
                "default": "https://haveibeenpwned.com/api/v3/breachedaccount/"
            }
        ]

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            email_obj = None
            if isinstance(item, str):
                email_obj = Email(email=item)
            elif isinstance(item, dict) and "email" in item:
                email_obj = Email(email=item["email"])
            elif isinstance(item, Email):
                email_obj = item
            if email_obj:
                cleaned.append(email_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        print(self.get_params())
        api_key = self.get_params().get("HIBP_API_KEY", None)
        api_url = self.get_params().get("HIBP_API_URL", None)
        if not api_key:
            Logger.error(self.sketch_id, {"message": "A valid HIBP_API_KEY is required to scan for breaches."})
        if not api_url:
            Logger.error(self.sketch_id, {"message": "Could not find HIBP_API_URL in params."})
        headers = {
            "hibp-api-key": api_key,
            "User-Agent": "FlowsInt-Scanner"
        }
        Logger.info(self.sketch_id, {"message": f"HIBP API URL: {api_url}"})
        for email in data:
            try:
                # Query Have I Been Pwned API
                full_url = urljoin(api_url, f"{email.email}?truncateResponse=false")
                Logger.error(self.sketch_id, {"message": f"full url: {full_url}"})
                response = requests.get(full_url, headers=headers, timeout=10)
                Logger.info(self.sketch_id, {"message": f"HIBP API response: {response.json()}"})
                if response.status_code == 200:
                    breaches_data = response.json()
                    Logger.info(self.sketch_id, {"message": f"Found {len(breaches_data)} breaches for {email.email}"})
                    for breach_data in breaches_data:
                        breach = Breach(
                            name=breach_data.get("Name", ""),
                            title=breach_data.get("Title", ""),
                            domain=breach_data.get("Domain", ""),
                            breachdate=breach_data.get("BreachDate", ""),
                            addeddate=breach_data.get("AddedDate", ""),
                            modifieddate=breach_data.get("ModifiedDate", ""),
                            pwncount=breach_data.get("PwnCount", 0),
                            description=breach_data.get("Description", ""),
                            dataclasses=breach_data.get("DataClasses", []),
                            isverified=breach_data.get("IsVerified", False),
                            isfabricated=breach_data.get("IsFabricated", False),
                            issensitive=breach_data.get("IsSensitive", False),
                            isretired=breach_data.get("IsRetired", False),
                            isspamlist=breach_data.get("IsSpamList", False),
                            logopath=breach_data.get("LogoPath", "")
                        )
                        # Store email and breach as a tuple
                        results.append((email.email, breach))
                        Logger.info(self.sketch_id, {"message": f"Added breach: {breach.name} for email: {email.email}"})
                        
                elif response.status_code == 404:
                    # No breaches found for this email
                    Logger.info(self.sketch_id, {"message": f"No breaches found for email {email.email}"})
                    continue
                    
                else:
                    Logger.error(self.sketch_id, {"message": f"HIBP API error for {email.email}: {response.status_code}"})
                    continue
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error checking breaches for email {email.email}: {e}"})
                continue
                
        Logger.info(self.sketch_id, {"message": f"Scan completed. Total results: {len(results)}"})
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        Logger.info(self.sketch_id, {"message": f"Postprocess started. Results count: {len(results)}, Original input count: {len(original_input)}"})
        
        # Create email nodes first
        for email_obj in original_input:
            if not self.neo4j_conn:
                continue
            # Create email node
            self.create_node('email', 'email', email_obj.email, type='email')
            Logger.info(self.sketch_id, {"message": f"Created email node: {email_obj.email}"})
        
        # Process all breaches
        for email_address, breach_obj in results:
            if not self.neo4j_conn:
                continue
            
            # Create breach node
            breach_key = f"{breach_obj.name}_{self.sketch_id}"
            self.create_node(
            'breach', 'breach_id', breach_key,
            **breach_obj.dict(),
            label=breach_obj.name, type="breach"
            )
            Logger.info(self.sketch_id, {"message": f"Created breach node: {breach_key}"})
            
            # Create relationship between the specific email and this breach
            self.create_relationship('email', 'email', email_address,
                                   'breach', 'breach_id', breach_key, 'FOUND_IN_BREACH')
            self.log_graph_message(f"Breach found for email {email_address} -> {breach_obj.name} ({breach_obj.title})")
            
        return results

# Make types available at module level for easy access
InputType = EmailToBreachesScanner.InputType
OutputType = EmailToBreachesScanner.OutputType