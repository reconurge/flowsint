from typing import List
from ..dockertool import DockerTool


class MapcidrTool(DockerTool):
    image = "projectdiscovery/mapcidr"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "mapcidr"

    @classmethod
    def description(cls) -> str:
        return "Small utility program to perform multiple operations for a given subnet/CIDR ranges."

    @classmethod
    def category(cls) -> str:
        return "Network utilities"

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
        self,
        cidr: str,
        slice_by: int = None,
        aggregate: bool = False,
        shuffle_ips: bool = False,
        shuffle_ports: bool = False,
        count: bool = False,
        api_key: str = None,
    ) -> List[str]:
        """
        Run mapcidr to expand CIDR ranges into IPs.

        Args:
            cidr: CIDR block to expand (e.g., "192.168.1.0/24")
            slice_by: Slice CIDR by number of hosts
            aggregate: Aggregate IPs/CIDRs into smallest subnet possible
            shuffle_ips: Shuffle IPs in output
            shuffle_ports: Shuffle ports in output
            count: Count number of IPs in CIDR
            api_key: Optional ProjectDiscovery Cloud Platform API key

        Returns:
            List of IP addresses
        """
        # Build command
        flags = ["-silent"]

        if slice_by:
            flags.append(f"-slice-by {slice_by}")
        if aggregate:
            flags.append("-aggregate")
        if shuffle_ips:
            flags.append("-shuffle-ip")
        if shuffle_ports:
            flags.append("-shuffle-port")
        if count:
            flags.append("-count")

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
                f"Error running mapcidr: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
