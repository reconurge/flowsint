import os
from typing import Any, Dict, List, Union
import requests
from urllib.parse import urljoin
from app.scanners.base import Scanner
from app.core.logger import Logger
from app.types.email import Email
from app.types.breach import Breach
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

class EmailToBreachesScanner(Scanner):
    """From email to breaches using Have I Been Pwned API."""

    InputType = List[Email]
    OutputType = List[Breach]

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
        api_key = self.resolve_params()["HIBP_API_KEY"]
        api_url = self.resolve_params()["HIBP_API_URL"]
        if not api_key:
            Logger.error(self.sketch_id, {"message": "A valid HIBP_API_KEY is required to scan for breaches."})
        if not api_url:
            Logger.error(self.sketch_id, {"message": "Could not find HIBP_API_URL in params."})
        headers = {
            "hibp-api-key": api_key,
            "User-Agent": "FlowsInt-Scanner"
        }
        Logger.info(self.sketch_id, {"message": f"HIBP API key: {api_key}"})
        Logger.info(self.sketch_id, {"message": f"HIBP API URL: {api_url}"})
        for email in data:
            try:
                # Query Have I Been Pwned API
                full_url = urljoin(api_url, email.email)
                response = requests.get(full_url, headers=headers, timeout=10)
                Logger.info(self.sketch_id, {"message": f"HIBP API response: {response.json()}"})
                if response.status_code == 200:
                    breaches_data = response.json()
                    for breach_data in breaches_data:
                        breach = Breach(
                            name=breach_data.get("Name", ""),
                            title=breach_data.get("Title", ""),
                            domain=breach_data.get("Domain", ""),
                            breach_date=breach_data.get("BreachDate", ""),
                            added_date=breach_data.get("AddedDate", ""),
                            modified_date=breach_data.get("ModifiedDate", ""),
                            pwn_count=breach_data.get("PwnCount", 0),
                            description=breach_data.get("Description", ""),
                            data_classes=breach_data.get("DataClasses", []),
                            is_verified=breach_data.get("IsVerified", False),
                            is_fabricated=breach_data.get("IsFabricated", False),
                            is_sensitive=breach_data.get("IsSensitive", False),
                            is_retired=breach_data.get("IsRetired", False),
                            is_spam_list=breach_data.get("IsSpamList", False),
                            logo_path=breach_data.get("LogoPath", "")
                        )
                        results.append(breach)
                        
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
                
        return results

    def postprocess(self, results: OutputType, input_data: InputType = None) -> OutputType:
        return results

# Make types available at module level for easy access
InputType = EmailToBreachesScanner.InputType
OutputType = EmailToBreachesScanner.OutputType