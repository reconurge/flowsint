import subprocess
from pathlib import Path
from typing import Dict, Any, List, TypeAlias, Union
from app.utils import is_valid_username
from app.types.social import Social, Social
from app.scanners.base import Scanner
from pydantic import TypeAdapter
from app.utils import is_valid_username, resolve_type
from app.core.logger import logger


InputType: TypeAlias = List[Social]
OutputType: TypeAlias = List[Social]


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
    def input_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(InputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }

    @classmethod
    def output_schema(cls) -> Dict[str, Any]:
        adapter = TypeAdapter(OutputType)
        schema = adapter.json_schema()
        type_name, details = list(schema["$defs"].items())[0]
        return {
            "type": type_name,
            "properties": [
                {"name": prop, "type": resolve_type(info, schema)}
                for prop, info in details["properties"].items()
            ]
        }
        
    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            obj = None
            if isinstance(item, str):
                obj = Social(username=item)
            elif isinstance(item, dict) and "username" in item:
                obj = Social(username=item["username"])
            elif isinstance(item, Social):
                obj = item

            if obj and obj.username and is_valid_username(obj.username):
                cleaned.append(obj)
        return cleaned

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
