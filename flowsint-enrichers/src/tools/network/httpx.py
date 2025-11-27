import json
from typing import Any, List
from ..dockertool import DockerTool


class HttpxTool(DockerTool):
    image = "projectdiscovery/httpx"
    default_tag = "latest"

    def __init__(self):
        super().__init__(self.image, self.default_tag)

    @classmethod
    def name(cls) -> str:
        return "httpx"

    @classmethod
    def description(cls) -> str:
        return "An HTTP toolkit that probes services, web servers, and other valuable metadata."

    @classmethod
    def category(cls) -> str:
        return "Web technologies enumeration"

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

    def launch(self, target: str, args: List[str] | None = None) -> Any:
        if args is None:
            args = []
        args_str = " ".join(args) if args else ""
        command = f"-u {target} {args_str} -json -silent"
        result = super().launch(command)

        # Handle empty result
        if not result or result.strip() == "":
            return []

        # Handle multiple JSON lines (one per result)
        lines = result.strip().split("\n")
        results = []

        for line in lines:
            line = line.strip()
            if line:
                try:
                    results.append(json.loads(line))
                except json.JSONDecodeError as e:
                    raise e
        return results
