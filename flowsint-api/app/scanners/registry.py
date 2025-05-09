from typing import Dict, Type

from app.scanners.base import Scanner
from app.scanners.domains.subdomains import SubdomainScanner
from app.scanners.domains.whois import WhoisScanner
from app.scanners.domains.resolve import ResolveScanner
from app.scanners.ips.reverse_resolve import ReverseResolveScanner
from app.scanners.ips.geolocation import GeolocationScanner
from app.scanners.socials.maigret import MaigretScanner

class ScannerRegistry:
    
    _scanners: Dict[str, Type[Scanner]] = {}
    
    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:
        cls._scanners[scanner_class.name()] = scanner_class
    
    @classmethod
    def scanner_exists(cls, name: str) -> bool:
        if name not in cls._scanners:
            return False
        return True
    
    @classmethod
    def get_scanner(cls, name: str, sketch_id:str, scan_id: str, **kwargs) -> Scanner:
        if name not in cls._scanners:
            raise Exception(f"Scanner '{name}' not found")
        return cls._scanners[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

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
                "inputs": scanner.input_schema(),
                "outputs": scanner.output_schema(),
            })
        return scanners_by_category
    
ScannerRegistry.register(ReverseResolveScanner)
ScannerRegistry.register(ResolveScanner)
ScannerRegistry.register(SubdomainScanner)
ScannerRegistry.register(WhoisScanner)
ScannerRegistry.register(GeolocationScanner)
ScannerRegistry.register(MaigretScanner)