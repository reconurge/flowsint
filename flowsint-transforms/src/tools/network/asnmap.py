import json
from typing import Any, Literal
from ..dockertool import DockerTool


class AsnmapTool(DockerTool):
    image = "projectdiscovery/asnmap"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "asnmap"

    @classmethod
    def description(cls) -> str:
        return "ASN mapping and network reconnaissance tool."

    @classmethod
    def category(cls) -> str:
        return "ASN discovery"

    def install(self) -> None:
        super().install()

    def version(self) -> str:
        try:
            output = self.client.containers.run(
                image=self.image,
                command="--version",
                remove=True,
                stderr=True,
                stdout=True,
            )
            output_str = output.decode()
            import re

            match = re.search(r"(v[\d\.]+)", output_str)
            version = match.group(1) if match else "unknown"
            return version
        except Exception as e:
            return f"unknown (error: {str(e)})"

    def update(self) -> None:
        # Pull the latest image
        self.install()

    def is_installed(self) -> bool:
        return super().is_installed()

    def launch(
        self, item: str, type: Literal["domain", "organization", "ip", "asn"] = "domain", api_key: str = None
    ) -> Any:
        flags = {"domain": "-d", "org": "-org", "ip": "-i", "asn": "-a"}
        if type not in flags:
            raise ValueError(
                f"Invalid type: '{type}'. Valid types are: {list(flags.keys())}"
            )
        flag = flags[type]

        # Prepare environment variables
        env = {}
        if api_key:
            env["PDCP_API_KEY"] = api_key

        try:
            # Use the -target argument as asnmap expects
            result = super().launch(f"{flag} {item} -silent -json", environment=env)
            if result and result != "":
                # asnmap returns newline-delimited JSON (one JSON object per line)
                lines = result.strip().split('\n')

                if len(lines) == 1:
                    # Single JSON object
                    return json.loads(lines[0])
                else:
                    # Multiple JSON objects - combine them
                    combined_data = {
                        "as_range": [],
                        "as_name": None,
                        "as_country": None,
                        "as_number": None,
                    }

                    for line in lines:
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            if "as_range" in data:
                                combined_data["as_range"].extend(data["as_range"])
                            if data.get("as_name") and not combined_data["as_name"]:
                                combined_data["as_name"] = data["as_name"]
                            if data.get("as_country") and not combined_data["as_country"]:
                                combined_data["as_country"] = data["as_country"]
                            if data.get("as_number") and not combined_data["as_number"]:
                                combined_data["as_number"] = data["as_number"]
                        except json.JSONDecodeError:
                            continue

                    return combined_data if combined_data["as_range"] or combined_data["as_number"] else {}
            else:
                return {}
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse JSON output from asnmap: {str(e)}")
        except Exception as e:
            # Try to get more info from the container logs
            raise RuntimeError(
                f"Error running asnmap: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
