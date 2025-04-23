import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, List
from app.utils import is_valid_username
from app.scanners.base import Scanner

class SherlockScanner(Scanner):
    """Scans the usernames for associated social accounts using Sherlock."""

    @classmethod
    def name(self) -> str:
        return "sherlock_scanner"
    
    @classmethod
    def category(self) -> str:
        return "social_account"
    
    @classmethod
    def key(self) -> str:
        return "username"
    
    @classmethod
    def input_schema(self) -> Dict[str, str]:
        """Defines the expected input schema."""
        return {
            "usernames": "array"  # The schema expects an array of usernames
        }

    @classmethod
    def output_schema(self) -> Dict[str, str]:
        """Defines the structure of the data returned by the scan."""
        return {
            "output": "dict",  # A list of results for each username scan
        }
        
    def preprocess(self, usernames: List[str]) -> List[str]:
        """Validates the list of usernames before scanning."""
        valid_usernames = [is_valid_username(username) for username in usernames]
        return valid_usernames

    def scan(self, usernames: List[str]) -> Dict[str, Any]:
        """Performs the scan using Sherlock on the list of usernames."""
        results_list = []  # List to store scan results for each username
        
        for username in usernames:
            output_file = Path(f"/tmp/sherlock_{username}.txt")  # Output file path

            try:
                # Running the Sherlock command to perform the scan
                result = subprocess.run(
                    ["sherlock", username, "-o", str(output_file)],
                    capture_output=True,
                    text=True,
                    timeout=100
                )

                if result.returncode != 0:
                    results_list.append({
                        "error": f"Sherlock failed for {username}: {result.stderr.strip()}"
                    })
                    continue

                if not output_file.exists():
                    results_list.append({
                        "error": f"Sherlock did not produce any output file for {username}."
                    })
                    continue

                found_accounts = {}
                with open(output_file, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and line.startswith("http"):
                            platform = line.split("/")[2]  # Example: twitter.com
                            found_accounts[platform] = line

                results_list.append({
                    "username": username,
                    "output": found_accounts
                })

            except subprocess.TimeoutExpired:
                results_list.append({"error": f"Sherlock scan for {username} timed out."})
            except Exception as e:
                results_list.append({"error": f"Unexpected error in Sherlock scan for {username}: {str(e)}"})

        return results_list

    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Adds additional metadata to the results."""
        return {"output": results}
