from typing import Any, Dict, Optional

from docker import from_env
from docker.errors import APIError, DockerException, ImageNotFound

from .base import Tool


class DockerTool(Tool):
    # Subclasses (SubfinderTool, NaabuTool, ...) set this as a class
    # attribute with the bare image name — get_image() below reads that,
    # while __init__ below sets self.image to an instance-level
    # "name:tag" shadow used for the actual docker calls.
    image: str

    def __init__(self, image: str, default_tag: str = "latest") -> None:
        self.image = f"{image}:{default_tag}"
        try:
            self.client = from_env()
        except Exception as e:
            raise RuntimeError(
                f"Failed to connect to Docker daemon. Is Docker running? Error: {e}"
            )

    @classmethod
    def get_image(cls) -> str:
        return cls.image

    def install(self) -> None:
        try:
            print(f"[DockerTool] Pulling image: {self.image}")
            self.client.images.pull(self.image)
        except APIError as e:
            raise RuntimeError(f"Failed to pull image {self.image}: {e.explanation}")

    def version(self) -> str:
        try:
            output = self.client.containers.run(
                self.image,
                command="--version",
                remove=True,
                stdout=True,
                stderr=True,
                detach=False,
                tty=False,
            )
            return str(output.decode().strip())
        except Exception as e:
            return f"unknown (error: {str(e)})"

    def is_installed(self) -> bool:
        try:
            self.client.images.get(self.image)
            return True
        except ImageNotFound:
            return False

    def launch(
        self,
        command: str,
        volumes: Optional[Dict[str, Any]] = None,
        timeout: int = 30,
        environment: Optional[Dict[str, Any]] = None,
        entrypoint: Optional[str] = None,
    ) -> str:
        self.install()
        # Merge default environment with custom environment
        env = {"TERM": "dumb"}  # Set terminal type to avoid TTY issues
        if environment:
            env.update(environment)

        try:
            run_kwargs = dict(
                command=command,
                remove=True,
                stdout=True,
                stderr=True,
                volumes=volumes or {},
                detach=False,
                tty=False,
                network_mode="bridge",
                stdin_open=False,  # Ensure stdin is not open
                environment=env,
            )
            # Some tools only accept a single target on stdin, which needs a
            # shell in front of the image's default entrypoint.
            if entrypoint is not None:
                run_kwargs["entrypoint"] = entrypoint
            result = self.client.containers.run(self.image, **run_kwargs)
            return str(result.decode())
        except ImageNotFound:
            raise RuntimeError(f"Image {self.image} not found. Did you run install()?")
        except DockerException as e:
            # Try to get more detailed error information
            error_detail = str(e)
            if hasattr(e, "response") and hasattr(e.response, "json"):
                try:
                    error_json = e.response.json()
                    error_detail = f"{str(e)} - Details: {error_json}"
                except Exception:
                    pass

            # Check if it's a container exit error
            if "returned non-zero exit status" in str(e):
                # Try to run the command with stderr capture to see what went wrong
                try:
                    test_result = self.client.containers.run(
                        self.image,
                        command=command,
                        remove=True,
                        stdout=True,
                        stderr=True,
                        detach=False,
                        tty=False,
                        network_mode="bridge",
                        stdin_open=False,
                        environment=env,
                    )
                    # If we get here, the command actually worked
                    return str(test_result.decode())
                except DockerException as test_e:
                    error_detail = f"{str(e)} - Test run also failed: {str(test_e)}"

            raise RuntimeError(
                f"Docker error while running {self.image}: {error_detail}"
            )
