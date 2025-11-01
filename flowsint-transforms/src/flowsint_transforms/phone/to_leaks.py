import os
from typing import Any, Dict, List, Optional, Union
import requests
from urllib.parse import urljoin
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger
from flowsint_types.phone import Phone
from flowsint_types.breach import Breach
from dotenv import load_dotenv
from flowsint_core.core.graph_db import Neo4jConnection

# Load environment variables
load_dotenv()

HIBP_API_KEY = os.getenv("HIBP_API_KEY")


class PhoneToBreachesTransform(Transform):
    """[HIBPWNED] Get the breaches the phone number might be invovled in."""

    InputType = List[Phone]
    OutputType = List[tuple]  # List of (phone, breach) tuples

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
    def name(cls) -> str:
        return "phone_to_breaches"

    @classmethod
    def category(cls) -> str:
        return "Email"

    @classmethod
    def key(cls) -> str:
        return "phone"

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
                "description": "The HIBP API key to use for breaches lookup.",
                "required": True,
            },
            {
                "name": "HIBP_API_URL",
                "type": "url",
                "description": "The HIBP API URL to use for breaches lookup.",
                "required": False,
                "default": "https://haveibeenpwned.com/api/v3/breachedaccount/",
            },
        ]

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for number in data:
            phone_obj = None
            if isinstance(number, str):
                phone_obj = Phone(number=number)
            elif isinstance(number, dict) and "number" in number:
                phone_obj = Phone(number=number["number"])
            elif isinstance(number, Phone):
                phone_obj = number
            if phone_obj:
                cleaned.append(phone_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        api_key = self.get_secret("HIBP_API_KEY", os.getenv("HIBP_API_KEY"))
        api_url = self.get_params().get("HIBP_API_URL", "https://haveibeenpwned.com/api/v3/breachedaccount/")
        headers = {"hibp-api-key": api_key, "User-Agent": "FlowsInt-Transform"}
        Logger.info(self.sketch_id, {"message": f"HIBP API URL: {api_url}"})
        for phone in data:
            try:
                # Query Have I Been Pwned API
                full_url = urljoin(api_url, f"{phone.number}?truncateResponse=false")
                Logger.error(self.sketch_id, {"message": f"full url: {full_url}"})
                response = requests.get(full_url, headers=headers, timeout=10)
                Logger.info(
                    self.sketch_id, {"message": f"HIBP API response: {response.json()}"}
                )
                if response.status_code == 200:
                    breaches_data = response.json()
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"Found {len(breaches_data)} breaches for {phone.number}"
                        },
                    )
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
                            logopath=breach_data.get("LogoPath", ""),
                        )
                        # Store phone and breach as a tuple
                        results.append((phone.number, breach))
                        Logger.info(
                            self.sketch_id,
                            {
                                "message": f"Added breach: {breach.name} for phone: {phone.number}"
                            },
                        )

                elif response.status_code == 404:
                    # No breaches found for this phone
                    Logger.info(
                        self.sketch_id,
                        {"message": f"No breaches found for phone {phone.number}"},
                    )
                    continue

                else:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"HIBP API error for {phone.number}: {response.status_code}"
                        },
                    )
                    continue

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Error checking breaches for phone {phone.number}: {e}"
                    },
                )
                continue

        Logger.info(
            self.sketch_id,
            {"message": f"Scan completed. Total results: {len(results)}"},
        )
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        Logger.info(
            self.sketch_id,
            {
                "message": f"Postprocess started. Results count: {len(results)}, Original input count: {len(original_input)}"
            },
        )

        # Create phone nodes first
        for phone_obj in original_input:
            if not self.neo4j_conn:
                continue
            # Create phone node
            self.create_node("phone", "phone", phone_obj.number, **phone_obj.__dict__)
            Logger.info(
                self.sketch_id, {"message": f"Created phone node: {phone_obj.number}"}
            )

        # Process all breaches
        for phone, breach_obj in results:
            if not self.neo4j_conn:
                continue

            # Create breach node
            breach_key = f"{breach_obj.name}_{self.sketch_id}"
            self.create_node(
                "breach",
                "breach_id",
                breach_key,
                **breach_obj.dict(),
                label=breach_obj.name,
                type="breach",
            )
            Logger.info(
                self.sketch_id, {"message": f"Created breach node: {breach_key}"}
            )

            # Create relationship between the specific phone and this breach
            self.create_relationship(
                "phone",
                "number",
                phone,
                "breach",
                "breach_id",
                breach_key,
                "FOUND_IN_BREACH",
            )
            self.log_graph_message(
                f"Breach found for phone {phone} -> {breach_obj.name} ({breach_obj.title})"
            )

        return results


# Make types available at module level for easy access
InputType = PhoneToBreachesTransform.InputType
OutputType = PhoneToBreachesTransform.OutputType
