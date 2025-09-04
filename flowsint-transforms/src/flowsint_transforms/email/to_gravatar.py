import hashlib
from typing import List, Union
import requests
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger
from flowsint_types.email import Email
from flowsint_types.gravatar import Gravatar


class EmailToGravatarTransform(Transform):
    """From md5 hash of email to gravatar."""

    InputType = List[Email]
    OutputType = List[Gravatar]

    @classmethod
    def name(cls) -> str:
        return "email_to_gravatar"

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
                Logger.warn(
                    self.sketch_id,
                    {"message": f"email url: {gravatar_url}"},
                )
                response = requests.head(gravatar_url, timeout=10)

                if response.status_code == 200:
                    # Gravatar found, get profile info
                    profile_url = f"https://www.gravatar.com/{email_hash}.json"
                    Logger.warn(
                        self.sketch_id,
                        {"message": f"Gravatar url: {profile_url}"},
                    )
                    profile_response = requests.get(profile_url, timeout=10)

                    gravatar_data = {
                        "src": gravatar_url,
                        "hash": email_hash,
                        "profile_url": profile_url,
                        "exists": True,
                    }

                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        if "entry" in profile_data and profile_data["entry"]:
                            entry = profile_data["entry"][0]
                            gravatar_data.update(
                                {
                                    "display_name": entry.get("displayName"),
                                    "about_me": entry.get("aboutMe"),
                                    "location": entry.get("currentLocation"),
                                }
                            )

                    gravatar = Gravatar(**gravatar_data)
                    results.append(gravatar)

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error checking Gravatar for email {email.email}: {e}"
                    },
                )
                continue

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for email_obj, gravatar_obj in zip(original_input, results):
            if not self.neo4j_conn:
                continue

            # Create email node
            self.create_node("email", "email", email_obj.email, **email_obj.__dict__)

            # Create gravatar node
            gravatar_key = f"{email_obj.email}_{self.sketch_id}"
            self.create_node(
                "gravatar", "gravatar_id", gravatar_key, **gravatar_obj.__dict__
            )

            # Create relationship between email and gravatar
            self.create_relationship(
                "email",
                "email",
                email_obj.email,
                "gravatar",
                "gravatar_id",
                gravatar_key,
                "HAS_GRAVATAR",
            )

            self.log_graph_message(
                f"Gravatar found for email {email_obj.email} -> hash: {gravatar_obj.hash}"
            )

        return results


# Make types available at module level for easy access
InputType = EmailToGravatarTransform.InputType
OutputType = EmailToGravatarTransform.OutputType
