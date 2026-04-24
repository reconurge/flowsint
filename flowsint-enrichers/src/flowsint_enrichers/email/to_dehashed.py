import json
import os
import requests

from typing import Any, Dict, List, Optional
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.email import Email
from flowsint_types.individual import Individual
from flowsint_core.core.logger import Logger

@flowsint_enricher
class EmailToDehashed(Enricher):
    """[DeHashed] Get breach intelligence from an email address."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Email
    OutputType = Individual

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    # @classmethod
    # def required_params(cls) -> bool:
    #     return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this enricher"""
        return [
            {
                "name": "DEHASHED_API_KEY", # Get your API key from dehashed.com/api
                "type": "vaultSecret",
                "description": "Your Dehashed API key.",
                "required": True,
            }
        ]

    @classmethod
    def name(cls) -> str:
        return "email_to_intelligence"

    @classmethod
    def category(cls) -> str:
        return "Email"

    @classmethod
    def key(cls) -> str:
        return "email"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        api_key = self.get_secret("DEHASHED_API_KEY", os.getenv("DEHASHED_API_KEY")) 

        for email in data:
            try:
                headers = {'Dehashed-Api-Key': api_key, 'Content-Type': 'application/json'}
                raw_data = json.dumps({"query": f"email:{email.email}"})

                api_request = requests.post(f'https://api.dehashed.com/v2/search', data=raw_data, headers=headers, timeout=30)

                if api_request.status_code != 200:
                    if api_request.status_code == 401:
                        Logger.error(
                            self.sketch_id,
                            {
                                "message": f"(EmailToDehashed) Enricher failed for the email because API key does not have a valid subscription: '{email.email}': {api_request.text}"
                            },
                        )

                    elif api_request.status_code == 403:
                        Logger.error(
                            self.sketch_id,
                            {
                                "message": f"(EmailToDehashed) Enricher failed for the email because request has malfunctioned (missing API_KEY): '{email.email}': {api_request.text}"
                            },
                        )

                try:
                    response_json = api_request.json()
                except Exception as e:
                    Logger.error(None, {"message": f"(EmailToDehashed) Failed to parse JSON for {email.email}: {e}"})
                    continue

                dehashed_entries = response_json.get("entries", [])
                if not dehashed_entries:
                    Logger.error(
                            self.sketch_id,
                            {
                                "message": f"(EmailToDehashed) Enricher failed for the email: '{email.email}': {api_request.text}"
                            },
                        )
                    continue


                api_balance = response_json.get("balance")
                if api_balance:
                    Logger.info(self.sketch_id, f'(EmailToDehashed) Your remaining API balance is {api_balance}.')

                for entry in dehashed_entries:
                    entry_email = entry.get("email")
                    entry_phone = entry.get("phone")
                    entry_name = entry.get("name")
                    entry_socialmedia = entry.get("social")
                    entry_ip = entry.get("ip_address")
                    entry_username = entry.get("username")
                    entry_dob = entry.get("dob")

                    results.append(
                        Individual(
                            full_name=entry_name[0] if entry_name else None, 
                            birth_date=entry_dob[0] if entry_dob else None, 
                            email_addresses=entry_email if entry_email else None, 
                            phone_numbers=entry_phone if entry_phone else None, 
                            social_media_profiles=entry_socialmedia if entry_socialmedia else None, 
                            ip_addresses=entry_ip if entry_ip else None, 
                            usernames=entry_username if entry_username else None
                            )
                        )
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(EmailToDehashed) Exception while querying email {email.email}: {e}"})
        
        return results

    def postprocess(
        self, results: List[OutputType], input_data: List[InputType] = None
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        if input_data and self._graph_service:
            for email in input_data:
                for individual in results:
                    self.create_node(email)
                    self.create_node(individual)

                    # Create relationship
                    self.create_relationship(email, individual, "CONNECTION_WITH")
                    self.log_graph_message(
                        f"(EmailToDehashed) Successfully found individual connections with {email.email}. "
                    )

        return results


# Make types available at module level for easy access
InputType = EmailToDehashed.InputType
OutputType = EmailToDehashed.OutputType