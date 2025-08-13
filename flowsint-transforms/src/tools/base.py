from abc import ABC, abstractmethod
from typing import Any


class Tool(ABC):
    @classmethod
    @abstractmethod
    def name(cls) -> str:
        pass

    @classmethod
    @abstractmethod
    def category(cls) -> str:
        pass

    @classmethod
    @abstractmethod
    def description(cls) -> str:
        pass

    @classmethod
    @abstractmethod
    def version(cls) -> str:
        pass

    @abstractmethod
    def launch(self, value: str, *args, **kwargs) -> Any:
        pass
