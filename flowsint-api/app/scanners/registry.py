from typing import Dict, Type

from app.scanners.base import Scanner
from app.scanners.usernames.sherlock_scanner import SherlockScanner
from app.scanners.usernames.maigret_scanner import MaigretScanner
from app.scanners.emails.holehe_scanner import HoleheScanner
from app.scanners.domains.domain_infos_scanner import DomainInfosScanner

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
ScannerRegistry.register(MaigretScanner)
ScannerRegistry.register(DomainInfosScanner)