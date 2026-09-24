import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types import Username
from flowsint_types.social_account import SocialAccount

false_positives = ["LeagueOfLegends"]


@flowsint_enricher
class MaigretEnricher(Enricher):
    """[MAIGRET] Scans usernames for associated social accounts using Maigret."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Username
    OutputType = SocialAccount

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault: Any = None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
            **kwargs,
        )

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_maigret"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare parameters for this enricher."""
        return [
            {
                "name": "MAX_CONNECTIONS",
                "type": "number",
                "description": "Number of concurrent connections to use for the scan",
                "required": False,
                "default": "25",
            },
            {
                "name": "SCAN_ALL_SITES",
                "type": "select",
                "description": "Perform a scan of the username across all sites instead of the top 500 (takes longer)",
                "required": False,
                "default": "false",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "CLOUDFLARE_BYPASS",
                "type": "select",
                "description": "Bypass Cloudflare protection using Flaresolverr or Trawl",
                "required": False,
                "default": "true",
                "options": [
                    {"label": "Enabled", "value": "true"},
                    {"label": "Disabled", "value": "false"},
                ],
            },
            {
                "name": "CLOUDFLARE_BYPASS_URL",
                "type": "url",
                "description": "Flaresolverr or Trawl URL",
                "required": False,
            },
        ]

    def run_maigret(self, username: str, temp_dir: str) -> Path:
        output_file = Path(f"{temp_dir}/report_{username}_simple.json")
        settings_path = Path(f"{temp_dir}/settings.json")

        all_sites = self.params.get("SCAN_ALL_SITES", "false") == "true"
        max_connections = self.params.get("MAX_CONNECTIONS", "25")
        cloudflare_bypass = self.params.get("CLOUDFLARE_BYPASS", "true") == "true"
        cloudflare_bypass_url = self.params.get("CLOUDFLARE_BYPASS_URL", None)

        try:
            cmd = [
                "maigret",
                username,
                "-J",
                "simple",
                "-fo",
                temp_dir,
                "-n",
                max_connections,
            ]

            if all_sites:
                cmd.append("-a")

            # ensure CF bypass is enabled and Flaresolverr URL is valid
            if (
                cloudflare_bypass
                and cloudflare_bypass_url
                and "://" in cloudflare_bypass_url
                and "v1" in cloudflare_bypass_url.lower()
            ):
                settings_data = {
                    "cloudflare_bypass": {
                        "enabled": True,
                        "session_prefix": "maigret",
                        "trigger_protection": [
                            "cf_js_challenge",
                            "cf_firewall",
                            "webgate",
                        ],
                        "modules": [
                            {
                                "name": "flaresolverr",
                                "method": "json_api",
                                "url": cloudflare_bypass_url,
                                "max_timeout_ms": 60000,
                            }
                        ],
                    }
                }

                with open(settings_path, "w") as f:
                    json.dump(settings_data, f)

                cmd.append("--cloudflare-bypass")

            process = subprocess.Popen(
                cmd,
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )

            if process.stdout is not None:
                for line in process.stdout:
                    line = line.strip()

                    # only line successful account searches (starts with [+] and contains a URL and the username)
                    if (
                        line
                        and line.startswith("[+]")
                        and "https://" in line
                        and username in line
                    ):
                        self.log_graph_message(line)

        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Maigret execution failed for {username}: {e}"},
            )
        return output_file

    def parse_maigret_output(
        self, username_obj: Username, output_file: Path
    ) -> List[SocialAccount]:
        results: List[SocialAccount] = []
        if not output_file.exists():
            return results

        try:
            with open(output_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {
                    "message": f"Failed to load output file for {username_obj.value}: {e}"
                },
            )
            return results

        for platform, profile in raw_data.items():
            if profile.get("status", {}).get("status") != "Claimed":
                continue

            if any(fp in platform for fp in false_positives):
                continue

            status = profile.get("status", {})
            ids = status.get("ids", {})
            profile_url = status.get("url") or profile.get("url_user")
            if not profile_url:
                continue

            try:
                followers = (
                    int(ids.get("follower_count", 0))
                    if ids.get("follower_count")
                    else None
                )
                following = (
                    int(ids.get("following_count", 0))
                    if ids.get("following_count")
                    else None
                )
                posts = (
                    int(ids.get("public_repos_count", 0))
                    + int(ids.get("public_gists_count", 0))
                    if "public_repos_count" in ids or "public_gists_count" in ids
                    else None
                )
            except ValueError:
                followers = following = posts = None

            display_name = ids.get("fullname") or ids.get("nickname")
            if display_name:
                nodeLabel = f"{display_name} ({platform})"
            else:
                nodeLabel = None

            try:
                results.append(
                    SocialAccount(
                        nodeLabel=nodeLabel,
                        username=username_obj,
                        display_name=display_name,
                        profile_url=profile_url,
                        profile_picture_url=ids.get("image"),
                        bio=ids.get("bio"),
                        location=ids.get("location"),
                        platform=platform,
                        created_at=ids.get("created_at"),
                        followers_count=followers,
                        following_count=following,
                        posts_count=posts,
                    )
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create SocialAccount for {username_obj.value} on {platform}: {e}"
                    },
                )
                continue

        return results

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for profile in data:
            if not profile.value:
                continue
            try:
                # new temp directory for each maigret scan to avoid conflicts
                with tempfile.TemporaryDirectory(prefix="maigret-") as temp_dir:
                    output_file = self.run_maigret(profile.value, temp_dir)
                    parsed = self.parse_maigret_output(profile, output_file)
                    results.extend(parsed)
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Failed to process username {profile.value}: {e}"},
                )
                continue
        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        for profile in results:
            try:
                # Create username node
                self.create_node(profile.username)
                # Create social profile node
                self.create_node(profile)
                # Create relationship
                self.create_relationship(
                    profile.username, profile, "HAS_SOCIAL_ACCOUNT"
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create graph nodes for {profile.username.value} on {profile.platform}: {e}"
                    },
                )
                continue

        self.log_graph_message(f"Processed {len(results)} social accounts")

        return results


InputType = MaigretEnricher.InputType
OutputType = MaigretEnricher.OutputType
