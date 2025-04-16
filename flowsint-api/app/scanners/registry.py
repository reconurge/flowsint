from typing import Dict, Type

from app.scanners.base import Scanner
from app.scanners.sherlock_scanner import SherlockScanner
from app.scanners.holehe_scanner import HoleheScanner

class ScannerRegistry:
    
    _scanners: Dict[str, Type[Scanner]] = {}
    
    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:

        instance = scanner_class("")
        cls._scanners[instance.name] = scanner_class
    
    @classmethod
    def scanner_exists(cls, name: str) -> bool:
        if name not in cls._scanners:
            return False
        return True
    
    @classmethod
    def get_scanner(cls, name: str, scan_id: str) -> Scanner:
        if name not in cls._scanners:
            raise Exception(f"Scanner '{name}' not found")
        return cls._scanners[name](scan_id)

ScannerRegistry.register(SherlockScanner)
ScannerRegistry.register(HoleheScanner)