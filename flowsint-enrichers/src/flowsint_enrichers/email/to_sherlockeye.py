import requests
from typing import Any, Dict, List, Optional

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.social_account import SocialAccount
from flowsint_types.username import Username

SHERLOCKEYE_API_URL = "https://api.sherlockeye.io"


@flowsint_enricher
class UsernameToSherlockeye(Enricher):
    """[Sherlockeye] Find online profiles and social accounts linked to a username."""

    InputType = Username
    OutputType = SocialAccount

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

    @classmethod
    def name(cls) -> str:
        return "username_to_sherlockeye"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        return [
            {
                "name": "SHERLOCKEYE_API_KEY",
                "type": "vaultSecret",
                "description": "Your Sherlockeye bearer token (JWT). Store it in the Vault as SHERLOCKEYE_API_KEY.",
                "required": True,
            },
            {
                "name": "deep_research",
                "type": "select",
                "description": "Enable Deep Research to expand digital accounts discovery (consumes extra credits).",
                "required": False,
                "default": "false",
                "options": [
                    {"label": "Disabled", "value": "false"},
                    {"label": "Enabled", "value": "true"},
                ],
            },
        ]

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[SocialAccount] = []
        api_key = self.get_secret("SHERLOCKEYE_API_KEY")
        deep_research = self.params.get("deep_research", "false") == "true"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        for username_obj in data:
            try:
                payload: Dict[str, Any] = {
                    "type": "username",
                    "value": username_obj.value,
                }
                if deep_research:
                    payload["additional_modules"] = ["digital_accounts_expansion"]

                response = requests.post(
                    f"{SHERLOCKEYE_API_URL}/v1/searches/sync",
                    json=payload,
                    headers=headers,
                    timeout=60,
                )

                if response.status_code == 401:
                    Logger.error(self.sketch_id, {"message": "(UsernameToSherlockeye) Invalid or missing API key."})
                    continue
                if response.status_code == 403:
                    Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Search not allowed for '{username_obj.value}'."})
                    continue
                if response.status_code == 422:
                    Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Invalid username format: '{username_obj.value}'."})
                    continue
                if response.status_code == 429:
                    Logger.error(self.sketch_id, {"message": "(UsernameToSherlockeye) Rate limit or search quota exceeded."})
                    continue
                if response.status_code not in (200, 201):
                    Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Unexpected status {response.status_code} for '{username_obj.value}': {response.text}"})
                    continue

                try:
                    resp_json = response.json()
                except Exception as e:
                    Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Failed to parse JSON for '{username_obj.value}': {e}"})
                    continue

                search_results = resp_json.get("data", {}).get("results", [])
                if not search_results:
                    Logger.info(self.sketch_id, {"message": f"(UsernameToSherlockeye) No results found for '{username_obj.value}'."})
                    continue

                for result in search_results:
                    try:
                        source = result.get("source", "unknown")
                        attributes = result.get("attributes", {})

                        # Resolve the username on this platform: prefer explicit field, then URL path, then input value
                        found_username = (
                            attributes.get("username")
                            or _extract_username_from_url(attributes.get("link"))
                            or username_obj.value
                        )

                        account = SocialAccount(
                            username=Username(value=str(found_username), platform=source),
                            platform=source,
                            profile_url=attributes.get("link"),
                            display_name=attributes.get("name") or attributes.get("display_name"),
                            bio=attributes.get("bio"),
                            location=attributes.get("location"),
                        )
                        results.append(account)

                    except Exception as e:
                        Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Failed to build result for '{username_obj.value}' from {result}: {e}"})
                        continue

            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Exception while querying '{username_obj.value}': {e}"})
                continue

        return results

    def postprocess(self, results: List[OutputType], input_data: List[InputType]) -> List[OutputType]:
        if not self._graph_service:
            return results

        for username_obj in input_data:
            self.create_node(username_obj)

        for account in results:
            try:
                self.create_node(account)
                self.create_relationship(account.username, account, "HAS_SOCIAL_ACCOUNT")
                self.log_graph_message(
                    f"(UsernameToSherlockeye) {account.username.value} -> {account.platform}: "
                    f"{account.profile_url or account.username.value}"
                )
            except Exception as e:
                Logger.error(self.sketch_id, {"message": f"(UsernameToSherlockeye) Failed to create graph nodes for {account}: {e}"})
                continue

        return results


def _extract_username_from_url(url: Optional[str]) -> Optional[str]:
    """Return the last non-empty path segment of a URL as a username candidate."""
    if not url:
        return None
    candidate = url.rstrip("/").rsplit("/", 1)[-1]
    return candidate if len(candidate) >= 2 else None


InputType = UsernameToSherlockeye.InputType
OutputType = UsernameToSherlockeye.OutputType
