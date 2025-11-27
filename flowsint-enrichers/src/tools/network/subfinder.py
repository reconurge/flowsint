from typing import Any, List
from ..dockertool import DockerTool
from flowsint_core.utils import is_valid_domain


class SubfinderTool(DockerTool):
    image = "projectdiscovery/subfinder"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "subfinder"

    @classmethod
    def description(cls) -> str:
        return "Fast passive subdomain enumeration tool."

    @classmethod
    def category(cls) -> str:
        return "Subdomain enumeration"

    def install(self) -> None:
        super().install()

    def version(self) -> str:
        try:
            # subfinder requires input even when checking version, so we provide a dummy domain
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

    def launch(self, domain: str, args: List[str] = None) -> Any:
        subdomains: set[str] = set()
        if args is None:
            args = []
        command = f"-d {domain} {' '.join(args)}"
        result = super().launch(command)
        for sub in result.split("\n"):
            if (
                is_valid_domain(sub)
                and sub.endswith(domain)
                and sub != domain
                and not sub.startswith(".")
            ):
                subdomains.add(sub)
        return list(subdomains)
