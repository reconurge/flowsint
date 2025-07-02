import json
from typing import Any, Literal
from app.tools.dockertool import DockerTool

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
                stdout=True
            )
            output_str = output.decode()
            import re
            match = re.search(r'(v[\d\.]+)', output_str)
            version = match.group(1) if match else "unknown"
            return version
        except Exception as e:
            return f"unknown (error: {str(e)})"
        
    def update(self) -> None:
        # Pull the latest image
        self.install()

    def is_installed(self) -> bool:
        return super().is_installed()

    def launch(self, item: str, type: Literal["domain", "org", "ip", "asn"] = "domain") -> Any:
        flags = {
            "domain" : '-d',
            'org':  '-org',
            'ip' : '-i',
            'asn': '-a'
            }
        flag = flags[type]
        try:
            # Use the -target argument as asnmap expects
            result = super().launch(f"{flag} {item} -silent -json ")
            if result and result != "":
                return json.loads(result)
            else:
                return {}
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse JSON output from asnmap: {str(e)}")
        except Exception as e:
            # Try to get more info from the container logs
            raise RuntimeError(f"Error running asnmap: {str(e)}. Output: {getattr(e, 'output', 'No output')}")
    
