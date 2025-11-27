from docker import from_env, DockerClient
from docker.errors import ImageNotFound, APIError, DockerException
from .base import Tool


class DockerTool(Tool):
    def __init__(self, image: str, default_tag: str = "latest"):
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

    def install(self):
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
            return output.decode().strip()
        except Exception as e:
            return f"unknown (error: {str(e)})"

    def is_installed(self) -> bool:
        try:
            self.client.images.get(self.image)
            return True
        except ImageNotFound:
            return False

    def launch(self, command: str, volumes: dict = None, timeout: int = 30, environment: dict = None):
        self.install()
        # Merge default environment with custom environment
        env = {"TERM": "dumb"}  # Set terminal type to avoid TTY issues
        if environment:
            env.update(environment)

        try:
            result = self.client.containers.run(
                self.image,
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
            return result.decode()
        except ImageNotFound:
            raise RuntimeError(f"Image {self.image} not found. Did you run install()?")
        except DockerException as e:
            # Try to get more detailed error information
            error_detail = str(e)
            if hasattr(e, "response") and hasattr(e.response, "json"):
                try:
                    error_json = e.response.json()
                    error_detail = f"{str(e)} - Details: {error_json}"
                except:
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
                    return test_result.decode()
                except DockerException as test_e:
                    error_detail = f"{str(e)} - Test run also failed: {str(test_e)}"

            raise RuntimeError(
                f"Docker error while running {self.image}: {error_detail}"
            )
