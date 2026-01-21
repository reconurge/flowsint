import subprocess
from pathlib import Path
from typing import List

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types import SocialAccount, Username

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class SherlockEnricher(Enricher):
    """[SHERLOCK] Scans the usernames for associated social accounts using Sherlock."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Username
    OutputType = SocialAccount

    @classmethod
    def name(cls) -> str:
        return "username_to_socials_sherlock"

    @classmethod
    def category(cls) -> str:
        return "social"

    @classmethod
    def key(cls) -> str:
        return "username"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Performs the scan using Sherlock on the list of usernames."""
        results: List[OutputType] = []

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
                        SocialAccount(
                            username=username, platform=platform, profile_url=url
                        )
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

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        """Create Neo4j relationships for found social accounts."""
        if not self._graph_service:
            return results

        for social_account in results:
            try:
                # Create username node
                self.create_node(social_account.username)
                # Create social account node
                self.create_node(social_account)
                # Create relationship
                self.create_relationship(
                    social_account.username, social_account, "HAS_SOCIAL_ACCOUNT"
                )
                self.log_graph_message(
                    f"{social_account.username.value} -> account found on {social_account.platform}"
                )
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {
                        "message": f"Failed to create graph nodes for {social_account.username.value} on {social_account.platform}: {e}"
                    },
                )
                continue

        return results


# Make types available at module level for easy access
InputType = SherlockEnricher.InputType
OutputType = SherlockEnricher.OutputType
