import subprocess
from pathlib import Path
from typing import List, Union
from flowsint_core.utils import is_valid_username
from flowsint_types import SocialAccount, Username
from flowsint_core.core.transform_base import Transform
from flowsint_core.core.logger import Logger


class SherlockTransform(Transform):
    """[SHERLOCK] Scans the usernames for associated social accounts using Sherlock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Username]
    OutputType = List[SocialAccount]

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_sherlock"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    async def scan(self, data: InputType) -> OutputType:
        """Performs the scan using Sherlock on the list of usernames."""
        results: OutputType = []

        for username in data:
            output_file = Path(f"/tmp/sherlock_{username.value}.txt")
            try:
                # Running the Sherlock command to perform the scan
                result = subprocess.run(
                    ["sherlock", username.value, "-o", str(output_file)],
                    capture_output=True,
                    text=True,
                    timeout=100,
                )

                if result.returncode != 0:
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"Sherlock failed for {username.value}: {result.stderr.strip()}"
                        },
                    )
                    continue

                if not output_file.exists():
                    Logger.error(
                        self.sketch_id,
                        {
                            "message": f"Sherlock did not produce any output file for {username.value}."
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
                        SocialAccount(username=username, platform=platform, url=url)
                    )

            except subprocess.TimeoutExpired:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Sherlock scan for {username.value} timed out."},
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Unexpected error in Sherlock scan for {username.value}: {str(e)}"
                    },
                )

        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j relationships for found social accounts."""
        if not self.neo4j_conn:
            return results

        for social_account in results:
            self.create_node(social_account)
            self.log_graph_message(
                f"Found social account: {social_account.username.value} on {social_account.platform}"
            )

        return results


# Make types available at module level for easy access
InputType = SherlockTransform.InputType
OutputType = SherlockTransform.OutputType
