import json
import subprocess
from pathlib import Path
from typing import List, Union
from flowsint_core.utils import is_valid_username
from flowsint_core.core.transform_base import Transform
from flowsint_types.social import SocialProfile
from flowsint_core.core.logger import Logger

false_positives = ["LeagueOfLegends"]


class MaigretTransform(Transform):
    """[MAIGRET] Scans usernames for associated social accounts using Maigret."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[SocialProfile]
    OutputType = List[SocialProfile]

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_maigret"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            obj = None
            if isinstance(item, str):
                obj = SocialProfile(username=item)
            elif isinstance(item, dict) and "username" in item:
                obj = SocialProfile(username=item["username"])
            elif isinstance(item, SocialProfile):
                obj = item

            if obj and obj.username and is_valid_username(obj.username):
                cleaned.append(obj)
        return cleaned

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

    def parse_maigret_output(
        self, username: str, output_file: Path
    ) -> List[SocialProfile]:
        results: List[SocialProfile] = []
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
                SocialProfile(
                    username=username,
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
            if not profile.username:
                continue
            output_file = self.run_maigret(profile.username)
            parsed = self.parse_maigret_output(profile.username, output_file)
            results.extend(parsed)
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for profile in results:
            # Create social profile node
            self.create_node(
                "social_profile",
                "profile_url",
                profile.profile_url,
                username=profile.username,
                platform=profile.platform,
                profile_picture_url=profile.profile_picture_url,
                bio=profile.bio,
                followers_count=profile.followers_count,
                following_count=profile.following_count,
                posts_count=profile.posts_count,
                label=f"{profile.platform}:{profile.username}",
                caption=f"{profile.platform}:{profile.username}",
                color="#1DA1F2",
                type="social_profile",
            )

            # Create username node
            self.create_node(
                "username", "username", profile.username, username=profile.username
            )

            # Create relationship
            self.create_relationship(
                "username",
                "username",
                profile.username,
                "social_profile",
                "profile_url",
                profile.profile_url,
                "HAS_SOCIAL_ACCOUNT",
            )

            self.log_graph_message(
                f"{profile.username} -> account found on {profile.platform}"
            )

        return results


# Make types available at module level for easy access
InputType = MaigretTransform.InputType
OutputType = MaigretTransform.OutputType
