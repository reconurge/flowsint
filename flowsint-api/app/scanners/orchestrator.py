from typing import List, Dict, Any
from app.scanners.base import Scanner
from app.scanners.registry import ScannerRegistry

class TransformOrchestrator(Scanner):
    def __init__(self, scan_id: str, scanner_names: List[str]):
        super().__init__(scan_id)
        self.scanner_names = scanner_names
        self.scanners: List[Scanner] = []
        self._load_scanners()

    def _load_scanners(self) -> None:
        if not self.scanner_names:
            raise ValueError("No scanners provided")

        for name in self.scanner_names:
            if not ScannerRegistry.scanner_exists(name):
                raise ValueError(f"Scanner '{name}' not found in registry")
            scanner = ScannerRegistry.get_scanner(name, self.scan_id)
            self.scanners.append(scanner)

    @classmethod
    def name(cls) -> str:
        return "transform_orchestrator"

    @classmethod
    def category(cls) -> str:
        return "composite"

    @classmethod
    def key(cls) -> str:
        return "value"

    @classmethod
    def input_schema(cls) -> Dict[str, str]:
        return {"value": "string"}

    @classmethod
    def output_schema(cls) -> Dict[str, str]:
        return {
            "scanners": "array",
            "results": "dict"
        }

    def scan(self, value: str) -> Dict[str, Any]:
        results = {
            "initial_value": value,
            "scanners": [],
            "results": {}
        }

        current_values = [value] 

        for scanner in self.scanners:
            try:
                res = scanner.execute(current_values)
                results["scanners"].append(scanner.name())
                results["results"][scanner.name()] = res
                if isinstance(res, list):
                    current_values = res
                elif isinstance(res, dict) and "values" in res:
                    current_values = res["values"]
                else:
                    raise ValueError(f"Unsupported output format from scanner '{scanner.name()}'")
            except Exception as e:
                results["results"][scanner.name()] = {"error": str(e)}
                break

        return results

