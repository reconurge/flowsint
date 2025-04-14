import subprocess
import uuid
from pathlib import Path

def perform_sherlock_research(username: str) -> dict:
    report_id = str(uuid.uuid4())
    output_file = Path(f"/tmp/sherlock_{report_id}.txt")
    
    try:
        result = subprocess.run(
            ["sherlock", username, "-o", str(output_file)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Sherlock failed:\n{result.stderr.strip()}")

        if not output_file.exists():
            raise RuntimeError("Sherlock did not produce any output file.")

        found_accounts = {}
        with open(output_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and line.startswith("http"):
                    platform = line.split("/")[2]  # Extract domain name as platform
                    found_accounts[platform] = line

        return {
            "username": username,
            "report_id": report_id,
            "found": found_accounts
        }

    except subprocess.TimeoutExpired:
        raise TimeoutError("Sherlock scan timed out.")
    except Exception as e:
        raise RuntimeError(f"Unexpected error in Sherlock scan: {str(e)}")
