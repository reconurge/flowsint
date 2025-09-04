import subprocess
from pathlib import Path
from typing import List, Union
from flowsint_core.utils import is_valid_username
from flowsint_types.social import SocialProfile
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger


class SherlockTransform(Transform):
    """[SHERLOCK] Scans the usernames for associated social accounts using Sherlock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[SocialProfile]
    OutputType = List[SocialProfile]

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_sherlock"

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

    async def scan(self, data: InputType) -> OutputType:
        """Performs the scan using Sherlock on the list of usernames."""
        results: OutputType = []

        for social in data:
            username = social.username
            output_file = Path(f"/tmp/sherlock_{username}.txt")
            try:
                # Running the Sherlock command to perform the scan
                result = subprocess.run(
                    ["sherlock", username, "-o", str(output_file)],
                    capture_output=True,
                    text=True,
                    timeout=100,
                )

                if result.returncode != 0:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"Sherlock failed for {username}: {result.stderr.strip()}"
                        },
                    )
                    continue

                if not output_file.exists():
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"Sherlock did not produce any output file for {username}."
                        },
                    )
                    continue

                found_accounts = {}
                with open(output_file, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and line.startswith("http"):
                            platform = line.split("/")[2]  # Example: twitter.com
                            found_accounts[platform] = line

                # Create Social objects for each found account
                for platform, url in found_accounts.items():
                    results.append(
                        SocialProfile(username=username, platform=platform, url=url)
                    )

            except subprocess.TimeoutExpired:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Sherlock scan for {username} timed out."},
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Unexpected error in Sherlock scan for {username}: {str(e)}"
                    },
                )

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j relationships for found social accounts."""
        if not self.neo4j_conn:
            return results

        for social in results:
            self.create_node(
                "social",
                "username",
                social.username,
                platform=social.platform,
                url=social.url,
                caption=social.platform,
                type="social",
            )
            self.log_graph_message(
                f"Found social account: {social.username} on {social.platform}"
            )

        return results


# Make types available at module level for easy access
InputType = SherlockTransform.InputType
OutputType = SherlockTransform.OutputType
