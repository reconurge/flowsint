# app/scanners/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from supabase import Client

class Scanner(ABC):    
    def __init__(self, scan_id: str):
        self.scan_id = scan_id
        
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @abstractmethod
    def scan(self, value: str) -> Dict[str, Any]:
        pass
    
    def preprocess(self, value: str) -> str:
        return value
    
    def postprocess(self, results: Dict[str, Any]) -> Dict[str, Any]:
        return results
    
    def execute(self, value: str, db: Optional[Client] = None, sketch_id: Optional[str] = None) -> Dict[str, Any]:
        preprocessed = self.preprocess(value)
        results = self.scan(preprocessed)
        results = self.postprocess(results)

        if db and sketch_id:
            db.table("scans").insert({
                "id": self.scan_id,
                "status": "completed" if "error" not in results else "error",
                "scan_name": self.name,
                "value": value,
                "sketch_id": sketch_id,
                "data": results
            }).execute()

        return results
