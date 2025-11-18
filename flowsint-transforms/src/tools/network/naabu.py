import json
from typing import Any, List, Optional, Literal
from ..dockertool import DockerTool


class NaabuTool(DockerTool):
    image = "projectdiscovery/naabu"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "naabu"

    @classmethod
    def description(cls) -> str:
        return "Fast port scanner written in Go with focus on reliability and simplicity."

    @classmethod
    def category(cls) -> str:
        return "Port scanning"

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
        target: str,
        mode: Literal["active", "passive"] = "passive",
        port_range: Optional[str] = None,
        top_ports: Optional[str] = None,
        rate: Optional[int] = None,
        timeout: Optional[int] = None,
        service_detection: bool = False,
        api_key: Optional[str] = None,
    ) -> List[dict]:
        """
        Launch Naabu port scanner on a target IP.

        Args:
            target: IP address to scan
            mode: Scan mode - "active" for active scanning or "passive" for passive enumeration
            port_range: Port range to scan (e.g., "80,443", "1-1000")
            top_ports: Scan top N ports (e.g., "100", "1000", "full")
            rate: Packets per second rate limit
            timeout: Timeout in milliseconds
            service_detection: Enable service/version detection
            api_key: ProjectDiscovery Cloud Platform API key for passive mode

        Returns:
            List of dictionaries containing port scan results
        """
        # Build command arguments
        args = ["-host", target, "-json", "-silent"]

        # Add mode-specific flags
        if mode == "passive":
            args.append("-passive")
        # active mode is the default, no flag needed

        # Add port specification
        if port_range:
            args.extend(["-p", port_range])
        elif top_ports:
            args.extend(["-top-ports", top_ports])
        # If neither specified, naabu will use its defaults

        # Add performance options
        if rate:
            args.extend(["-rate", str(rate)])
        if timeout:
            args.extend(["-timeout", str(timeout)])

        # Add service detection
        if service_detection:
            args.append("-sV")

        # Prepare environment variables
        env = {}
        if api_key:
            env["PDCP_API_KEY"] = api_key

        try:
            command = " ".join(args)
            result = super().launch(command, environment=env if env else None)

            if not result or result.strip() == "":
                return []

            # Parse JSON output (newline-delimited JSON)
            lines = result.strip().split("\n")
            results = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    results.append(data)
                except json.JSONDecodeError:
                    # Skip lines that aren't valid JSON
                    continue

            return results

        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse JSON output from naabu: {str(e)}")
        except Exception as e:
            raise RuntimeError(
                f"Error running naabu: {str(e)}. Output: {getattr(e, 'output', 'No output')}"
            )
