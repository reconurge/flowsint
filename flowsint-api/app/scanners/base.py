from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.core.graph_db import Neo4jConnection
from app.core.logger import Logger

class Scanner(ABC):    
    def __init__(
        self,
        sketch_id: Optional[str],
        scan_id: str,
        logger: Logger,
        neo4j_conn: Optional[Neo4jConnection] = None,
    ):
        self.scan_id = scan_id
        self.sketch_id = sketch_id or "system"
        self.neo4j_conn = neo4j_conn
        self.logger = logger

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
    def input_schema(cls) -> Dict[str, str]:
        pass

    @classmethod
    @abstractmethod
    def output_schema(cls) -> Dict[str, str]:
        pass

    @abstractmethod
    def scan(self, values: List[str]) -> List[Dict[str, Any]]:
        pass

    def preprocess(self, values: List[str]) -> List[str]:
        return values

    def postprocess(self, results: List[Dict[str, Any]], input_data: List[str] = None) -> List[Dict[str, Any]]:
        return results

    def execute(self, values: List[str]) -> List[Dict[str, Any]]:
        if self.name() != "transform_orchestrator":
            self.logger.info(self.scan_id, f"Scanner {self.name()} started.", self.sketch_id)

        try:
            preprocessed = self.preprocess(values)
            results = self.scan(preprocessed)
            processed = self.postprocess(results, preprocessed)
            if self.name() != "transform_orchestrator":
                self.logger.success(self.scan_id, f"Scanner {self.name()} finished.", self.sketch_id)
            return processed
        except Exception as e:
            if self.name() != "transform_orchestrator":
                self.logger.error(self.scan_id, f"Scanner {self.name()} errored: '{str(e)}'.", self.sketch_id)
            return []
