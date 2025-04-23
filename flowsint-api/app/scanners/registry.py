from typing import Dict, Type

from app.scanners.base import Scanner
from app.scanners.usernames.sherlock import SherlockScanner
from app.scanners.usernames.maigret import MaigretScanner
from app.scanners.emails.holehe import HoleheScanner
from app.scanners.domains.domain_infos import DomainInfosScanner
from app.scanners.emails.ghunt import GHuntGmailScanner
from app.scanners.phones.ignorant import IgnorantScanner
from app.scanners.leaks.hibp import HibpScanner

class ScannerRegistry:
    
    _scanners: Dict[str, Type[Scanner]] = {}
    
    @classmethod
    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:
        cls._scanners[scanner_class.name()] = scanner_class
    
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

    @classmethod
    def list(cls) -> Dict[str, Dict[str, str]]:
        return {
    name: {
        "class_name": scanner.__name__,
        "name": scanner.name(),
        "category": scanner.category(),
        "module": scanner.__module__,
        "doc": scanner.__doc__,
        "key": scanner.key(),
    }
    for name, scanner in cls._scanners.items()
        }
    
    @classmethod
    def list_by_category(cls) -> Dict[str, Dict[str, str]]:
        scanners_by_category = {}
        for _, scanner in cls._scanners.items():
            category = scanner.category()
            if category not in scanners_by_category:
                scanners_by_category[category] = []
            scanners_by_category[category].append({
                "class_name": scanner.__name__,
                "name": scanner.name(),
                "module": scanner.__module__,
                "doc": scanner.__doc__,
                "key": scanner.key(),
                "inputs": scanner.input_schema(),
                "outputs": scanner.output_schema(),
            })
        return scanners_by_category

ScannerRegistry.register(SherlockScanner)
ScannerRegistry.register(HoleheScanner)
ScannerRegistry.register(MaigretScanner)
ScannerRegistry.register(DomainInfosScanner)
ScannerRegistry.register(GHuntGmailScanner)
ScannerRegistry.register(IgnorantScanner)
ScannerRegistry.register(HibpScanner)