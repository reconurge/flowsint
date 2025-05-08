from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.scanners.base import Scanner
from app.scanners.registry import ScannerRegistry
from pydantic import ValidationError

class TransformOrchestrator(Scanner):
    def __init__(self, sketch_id: str, scan_id: str, scanner_names: List[str], neo4j_conn=None):
        super().__init__(sketch_id, scan_id, neo4j_conn=neo4j_conn)
        self.scanner_names = scanner_names
        self.neo4j_conn = neo4j_conn
        self.scanners = []
        self._load_scanners()

    def _load_scanners(self) -> None:
        if not self.scanner_names:
            raise ValueError("No scanners provided")

        for name in self.scanner_names:
            if not ScannerRegistry.scanner_exists(name):
                raise ValueError(f"Scanner '{name}' not found in registry")
            scanner = ScannerRegistry.get_scanner(name, self.sketch_id, self.scan_id, neo4j_conn=self.neo4j_conn)
            self.scanners.append(scanner)

    @classmethod
    def name(cls) -> str:
        return "transform_orchestrator"

    @classmethod
    def category(cls) -> str:
        return "composite"

    @classmethod
    def key(cls) -> str:
        return "values"

    @classmethod
    def input_schema(cls) -> Dict[str, str]:
        return {"values": "array<string>"}

    @classmethod
    def output_schema(cls) -> Dict[str, str]:
        return {
            "scanners": "array",
            "results": "dict"
        }

    def scan(self, values: List[str]) -> Dict[str, Any]:
        results = {
            "initial_values": values,
            "scanners": [],
            "results": {}
        }
        current_values = values

        for scanner in self.scanners:
            print("currentValues" + str(current_values))
            try:
                res = scanner.execute(current_values)
                if not isinstance(res, (dict, list)):
                    raise ValueError(f"Scanner '{scanner.name()}' returned unsupported output format")
                
                results["scanners"].append(scanner.name())
                results["results"][scanner.name()] = res

                if isinstance(res, list):
                    current_values = res
                elif isinstance(res, dict) and "values" in res:
                    current_values = res["values"]
                else:
                    current_values = []

            except (ValueError, ValidationError) as e:
                results["results"][scanner.name()] = {"error": f"Validation error: {str(e)}"}
            except Exception as e:
                results["results"][scanner.name()] = {"error": f"Error during scan: {str(e)}"}

        return results
    
    def results_to_json(self, results: Any) -> Any:
        if isinstance(results, UUID):
            return str(results)
        if isinstance(results, datetime):
            return results.isoformat()
        if isinstance(results, BaseModel):
            return results.dict()
        if isinstance(results, list):
            return [self.results_to_json(item) for item in results]
        if isinstance(results, dict):
            return {key: self.results_to_json(value) for key, value in results.items()}
        return results
    
