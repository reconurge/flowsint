from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.models.types import OSINT_TYPE_METADATA, OSINTType

class Scanner(ABC):    
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        
    @classmethod
    @abstractmethod
    def name(self) -> str:
        pass
    
    @classmethod
    @abstractmethod
    def category(self) -> str:
        pass
    
    @classmethod
    @abstractmethod
    def key(self) -> str:
        """
        This is the key used to identify the items' key to search for. Ex:
        Individual -> full_name
        Phone -> phone_number
        """
        pass
    
    @classmethod
    @abstractmethod
    def input_schema(cls) -> Dict[str, str]:
        """
        Returns the input fields and their types.
        Example: { "email": "string" }
        """
        pass

    @classmethod
    @abstractmethod
    def output_schema(cls) -> Dict[str, str]:
        """
        Returns the output fields and their types.
        Example: { "leaks": "array", "sources": "array" }
        """
        pass
    
    @abstractmethod
    def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        """
        The actual scanning logic that operates on the list of values provided.
        """
        pass
    
    def preprocess(self, values: List[str]) -> List[str]:
        """
        Preprocess the values according to their types.
        Validates if the values match the expected format for the given types.
        """
        return values
    
    def postprocess(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Post-process the scan results if necessary (e.g., format them).
        """
        return results
    
    def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        """
        Execute the scanning process by first preprocessing, then scanning, and finally postprocessing.
        """
        preprocessed = self.preprocess(values)
        results = self.scan(preprocessed)
        results = self.postprocess(results)

        return results
