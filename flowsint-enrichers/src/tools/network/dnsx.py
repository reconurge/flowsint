import json
from typing import Any, List
from ..dockertool import DockerTool


class DnsxTool(DockerTool):
    image = "projectdiscovery/dnsx"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "dnsx"

    @classmethod
    def description(cls) -> str:
        return "Fast and multi-purpose DNS toolkit for running various DNS queries."

    @classmethod
    def category(cls) -> str:
        return "DNS resolution"

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

    def launch(self, cidr: str, ptr: bool = False, api_key: str = None) -> List[str]:
        """
        Run dnsx to resolve IPs from CIDR.

        Args:
            cidr: CIDR block to resolve (e.g., "192.168.1.0/24")
            ptr: Whether to include PTR records
            api_key: Optional ProjectDiscovery Cloud Platform API key

        Returns:
            List of IP addresses
        """
        # Build command
        flags = ["-silent"]
        if ptr:
            flags.append("-ptr")

        command = f"-cidr {cidr} {' '.join(flags)}"

        # Prepare environment variables
        env = {}
        if api_key:
            env["PDCP_API_KEY"] = api_key

        try:
            result = super().launch(command, environment=env)
            if result and result.strip():
                # Split by newlines and filter out empty lines
                ips = [line.strip() for line in result.split("\n") if line.strip()]
                return ips
            else:
                return []
        except Exception as e:
            raise RuntimeError(
                f"Error running dnsx: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
