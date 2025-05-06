from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.neo4j.connector import Neo4jConnection
class Scanner(ABC):    
    def __init__(self, sketch_id:str, scan_id: str, neo4j_conn: Neo4jConnection = None):
        self.scan_id = scan_id
        self.sketch_id = sketch_id or "system"
        self.neo4j_conn = neo4j_conn  # disponible dans tous les scanners
        
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
    def input_schema(cls) -> Dict[str, str]:
        """
        Returns the input fields and their types.
        """
        pass

    @classmethod
    @abstractmethod
    def output_schema(cls) -> Dict[str, str]:
        """
        Returns the output fields and their types.
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
    
    def postprocess(self, results: List[Dict[str, Any]], input_data: List[str] = None) -> List[Dict[str, Any]]:
        """
        Post-process the scan results if necessary (e.g., format them).
        """
        return results
    
    def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        """
        Execute the scanning process by first preprocessing, then scanning, and finally postprocessing.
        Tries to call postprocess with (results, preprocessed). Falls back to (results) if needed.
        """
        preprocessed = self.preprocess(values)
        results = self.scan(preprocessed)

        try:
            # Try calling with both results and preprocessed
            return self.postprocess(results, preprocessed)
        except TypeError as e:
            if "positional argument" in str(e) or "unexpected" in str(e):
                return self.postprocess(results)
            raise

