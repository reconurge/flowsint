import json
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, List
from app.utils import is_valid_username
from app.scanners.base import Scanner

class MaigretScanner(Scanner):
    """Scans the usernames for associated social accounts using maigret."""
    
    @classmethod
    def name(self) -> str:
        return "maigret_scanner"
    
    @classmethod
    def category(self) -> str:
        return "social_account"
    
    @classmethod
    def key(self) -> str:
        return "username"
    
    @classmethod
    def input_schema(self) -> Dict[str, str]:
        """Defines the expected input schema for the scan."""
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
        """Performs the scan using Maigret on the list of usernames."""
        results_list = []  # List to store scan results for each username
        
        for username in usernames:
            folder_output = "/tmp"  # Temporary folder to store the output
            output_file = Path(f"/tmp/report_{username}_simple.json")  # Output file path

            try:
                # Running the Maigret command to perform the scan
                result = subprocess.run(
                    ["maigret", username, "-J", "simple", "-fo", folder_output],
                    capture_output=True,
                    text=True,
                    timeout=100  # 100 seconds timeout for the scan
                )

                if result.returncode != 0:
                    results_list.append({
                        "error": f"Maigret failed for {username}: {result.stderr.strip()}"
                    })
                    continue

                if not output_file.exists():
                    results_list.append({
                        "error": f"Maigret did not produce any output file for {username}."
                    })
                    continue

                # Reading the output from the generated JSON file
                with open(output_file, "r") as f:
                    results = json.load(f)
                    results["username"] = username  # Add the username to the results

                results_list.append(results)  # Add the result for this username

            except subprocess.TimeoutExpired:
                results_list.append({"error": f"Maigret scan for {username} timed out."})
            except Exception as e:
                results_list.append({"error": f"Unexpected error in Maigret scan for {username}: {str(e)}"})

        return results_list
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Adds additional metadata to the results."""
        return { "output": results }
