import json
import subprocess
from pathlib import Path
from typing import List
from flowsint_core.core.transform_base import Transform
from flowsint_types import Username
from flowsint_types.social_account import SocialAccount
from flowsint_core.core.logger import Logger

false_positives = ["LeagueOfLegends"]


class MaigretTransform(Transform):
    """[MAIGRET] Scans usernames for associated social accounts using Maigret."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Username]
    OutputType = List[SocialAccount]

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

    def parse_maigret_output(self, username: str, output_file: Path) -> List[Username]:
        results: List[SocialAccount] = []
        if not output_file.exists():
            return results

        try:
            with open(output_file, "r") as f:
                raw_data = json.load(f)
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Failed to load output file for {username}: {e}"},
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

            results.append(
                SocialAccount(
                    username=Username(value=username),
                    profile_url=profile_url,
                    platform=platform,
                    profile_picture_url=ids.get("image"),
                    bio=None,
                    followers_count=followers,
                    following_count=following,
                    posts_count=posts,
                )
            )

        return results

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for profile in data:
            if not profile.value:
                continue
            output_file = self.run_maigret(profile.value)
            parsed = self.parse_maigret_output(profile.value, output_file)
            results.extend(parsed)
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for profile in results:
            # Create social profile node
            self.create_node(profile.username)
            self.create_node(profile)
            # Create username node

            # Create relationship
            self.create_relationship(profile.username, profile, "HAS_SOCIAL_ACCOUNT")
            self.log_graph_message(
                f"{profile.username.value} -> account found on {profile.platform}"
            )
        return results


InputType = MaigretTransform.InputType
OutputType = MaigretTransform.OutputType
