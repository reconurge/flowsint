from typing import List, Dict, Any
from app.scanners.base import Scanner
from app.scanners.registry import ScannerRegistry

class TransformOrchestrator(Scanner):
    def __init__(self, scan_id: str, scanner_names: List[str]):
        super().__init__(scan_id)
        self.scanner_names = scanner_names
        self.scanners = []

    def _load_scanners(self) -> List[Scanner]:
        scanners = []
        if (self.scanner_names is None) or (len(self.scanner_names) == 0):
            raise ValueError("No scanners provided")
        for name in self.scanner_names:
            if not ScannerRegistry.scanner_exists(name):
                raise ValueError(f"Scanner '{name}' not found in registry")
            scanners.append(ScannerRegistry.get_scanner(name, self.scan_id))
        return scanners

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
        return {"scanners": "array", "results": "dict"}

    def preprocess(cls) -> Dict[str, Any]:
        cls.scanners = cls._load_scanners()
        return True

    def scan(self, value: str) -> Dict[str, Any]:
        results = {
            "value": value,
            "scanners": [],
            "results": {}
        }

        for scanner in self.scanners:
            try:
                res = scanner.execute(value)
                results["scanners"].append(scanner.name())
                results["results"][scanner.name()] = res
            except Exception as e:
                results["results"][scanner.name()] = {"error": str(e)}

        return results
