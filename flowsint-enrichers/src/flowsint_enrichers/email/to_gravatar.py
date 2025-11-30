import hashlib
from typing import List, Union
import requests
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_core.core.logger import Logger
from flowsint_types.email import Email
from flowsint_types.gravatar import Gravatar


@flowsint_enricher
class EmailToGravatarEnricher(Enricher):
    """From md5 hash of email to gravatar."""

    InputType = Email
    OutputType = Gravatar

    @classmethod
    def name(cls) -> str:
        return "email_to_gravatar"

    @classmethod
    def category(cls) -> str:
        return "Email"

    @classmethod
    def key(cls) -> str:
        return "email"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

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

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for email_obj, gravatar_obj in zip(original_input, results):
            if not self.neo4j_conn:
                continue
            # Create email node
            self.create_node(email_obj)
            # Create gravatar node
            gravatar_key = f"{email_obj.email}_{self.sketch_id}"
            self.create_node(gravatar_obj)
            # Create relationship between email and gravatar
            self.create_relationship(email_obj, gravatar_obj, "HAS_GRAVATAR")

            self.log_graph_message(
                f"Gravatar found for email {email_obj.email} -> hash: {gravatar_obj.hash}"
            )

        return results


# Make types available at module level for easy access
InputType = EmailToGravatarEnricher.InputType
OutputType = EmailToGravatarEnricher.OutputType
