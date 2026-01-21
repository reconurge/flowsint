import json
import subprocess
from pathlib import Path
from typing import List
from flowsint_core.core.enricher_base import Enricher
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types import Username
from flowsint_types.social_account import SocialAccount
from flowsint_core.core.logger import Logger

false_positives = ["LeagueOfLegends"]


@flowsint_enricher
class MaigretEnricher(Enricher):
    """[MAIGRET] Scans usernames for associated social accounts using Maigret."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Username
    OutputType = SocialAccount

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_maigret"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    def run_maigret(self, username: str) -> Path:
        output_file = Path(f"/tmp/report_{username}_simple.json")
        try:
            subprocess.run(
                ["maigret", username, "-J", "simple", "-fo", "/tmp"],
                capture_output=True,
                text=True,
                timeout=100,
            )
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Maigret execution failed for {username}: {e}"},
            )
        return output_file

    def parse_maigret_output(self, username_obj: Username, output_file: Path) -> List[SocialAccount]:
        results: List[SocialAccount] = []
        if not output_file.exists():
            return results

        try:
            with open(output_file, "r") as f:
                raw_data = json.load(f)
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Failed to load output file for {username_obj.value}: {e}"},
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

            try:
                results.append(
                    SocialAccount(
                        username=username_obj,
                        profile_url=profile_url,
                        platform=platform,
                        profile_picture_url=ids.get("image"),
                        bio=None,
                        followers_count=followers,
                        following_count=following,
                        posts_count=posts,
                    )
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Failed to create SocialAccount for {username_obj.value} on {platform}: {e}"},
                )
                continue

        return results

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for profile in data:
            if not profile.value:
                continue
            try:
                output_file = self.run_maigret(profile.value)
                parsed = self.parse_maigret_output(profile, output_file)
                results.extend(parsed)
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Failed to process username {profile.value}: {e}"},
                )
                continue
        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        if not self._graph_service:
            return results

        for profile in results:
            try:
                # Create username node
                self.create_node(profile.username)
                # Create social profile node
                self.create_node(profile)
                # Create relationship
                self.create_relationship(profile.username, profile, "HAS_SOCIAL_ACCOUNT")
                self.log_graph_message(
                    f"{profile.username.value} -> account found on {profile.platform}"
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Failed to create graph nodes for {profile.username.value} on {profile.platform}: {e}"},
                )
                continue
        return results


InputType = MaigretEnricher.InputType
OutputType = MaigretEnricher.OutputType
