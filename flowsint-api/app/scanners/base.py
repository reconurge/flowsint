from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

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
        ## This is the key used to identify the items' key to search for. Ex:
        ## Individual -> full_name
        ## Phone -> phone_number
        pass
    
    @abstractmethod
    def scan(self, value: str) -> Dict[str, Any]:
        pass
    
    def preprocess(self, value: str) -> str:
        return value
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        return results
    
    def execute(self, value: str) -> Dict[str, Any]:
        preprocessed = self.preprocess(value)
        results = self.scan(preprocessed)
        results = self.postprocess(results)

        return results

