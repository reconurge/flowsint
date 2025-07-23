import hashlib
from typing import List, Dict, Any, Union
import requests
from app.scanners.base import Scanner
from app.core.logger import Logger
from app.types.email import Email
from app.types.gravatar import Gravatar

class EmailToGravatarScanner(Scanner):
    """From md5 hash of email to gravatar."""

    InputType = List[Email]
    OutputType = List[Gravatar]

    @classmethod
    def name(cls) -> str:
        return "to_gravatar"

    @classmethod
    def category(cls) -> str:
        return "Email"
    
    @classmethod
    def key(cls) -> str:
        return "email"

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
        
        for email in data:
            try:
                # Generate MD5 hash of email
                email_hash = hashlib.md5(email.email.lower().encode()).hexdigest()
                
                # Query Gravatar API
                gravatar_url = f"https://www.gravatar.com/avatar/{email_hash}?d=404"
                response = requests.head(gravatar_url, timeout=10)
                
                if response.status_code == 200:
                    # Gravatar found, get profile info
                    profile_url = f"https://www.gravatar.com/{email_hash}.json"
                    profile_response = requests.get(profile_url, timeout=10)
                    
                    gravatar_data = {
                        "email": email.email,
                        "hash": email_hash,
                        "avatar_url": gravatar_url,
                        "profile_url": profile_url
                    }
                    
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        if "entry" in profile_data and profile_data["entry"]:
                            entry = profile_data["entry"][0]
                            gravatar_data.update({
                                "display_name": entry.get("displayName"),
                                "about_me": entry.get("aboutMe"),
                                "current_location": entry.get("currentLocation")
                            })
                    
                    gravatar = Gravatar(**gravatar_data)
                    results.append(gravatar)
                    
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"Error checking Gravatar for email {email.email}: {e}"})
                continue
                
        return results

    def postprocess(self, results: OutputType, input_data: InputType = None) -> OutputType:
        return results

# Make types available at module level for easy access
InputType = EmailToGravatarScanner.InputType
OutputType = EmailToGravatarScanner.OutputType