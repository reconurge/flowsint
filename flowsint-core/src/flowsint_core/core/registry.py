import inspect
from typing import Dict, Type, List
from flowsint_core.core.scanner_base import Scanner
from flowsint_transforms.domains.subdomains import SubdomainScanner
from flowsint_transforms.domains.whois import WhoisScanner
from flowsint_transforms.domains.resolve import ResolveScanner
from flowsint_transforms.ips.reverse_resolve import ReverseResolveScanner
from flowsint_transforms.ips.geolocation import GeolocationScanner
from flowsint_transforms.socials.maigret import MaigretScanner
from flowsint_transforms.ips.ip_to_asn import IpToAsnScanner
from flowsint_transforms.ips.asn_to_cidrs import AsnToCidrsScanner
from flowsint_transforms.ips.cidr_to_ips import CidrToIpsScanner
from flowsint_transforms.organizations.org_to_asn import OrgToAsnScanner
from flowsint_transforms.domains.domain_to_asn import DomainToAsnScanner
from flowsint_transforms.crypto.wallet_to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_transforms.crypto.wallet_to_nfts import CryptoWalletAddressToNFTs
from flowsint_transforms.domains.to_website import DomainToWebsiteScanner
from flowsint_transforms.websites.to_crawler import WebsiteToCrawler
from flowsint_transforms.websites.to_links import WebsiteToLinks
from flowsint_transforms.websites.to_domain import WebsiteToDomainScanner
from flowsint_transforms.emails.to_gravatar import EmailToGravatarScanner
from flowsint_transforms.emails.to_leaks import EmailToBreachesScanner
from flowsint_transforms.individuals.to_org import IndividualToOrgScanner
from flowsint_transforms.organizations.to_infos import OrgToInfosScanner
from flowsint_transforms.websites.to_webtrackers import WebsiteToWebtrackersScanner
from flowsint_transforms.n8n.connector import N8nConnector


class ScannerRegistry:

    _scanners: Dict[str, Type[Scanner]] = {}

    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:
        cls._scanners[scanner_class.name()] = scanner_class

    @classmethod
    def scanner_exists(cls, name: str) -> bool:
        return name in cls._scanners

    @classmethod
    def get_scanner(cls, name: str, sketch_id: str, scan_id: str, **kwargs) -> Scanner:
        if name not in cls._scanners:
            raise Exception(f"Scanner '{name}' not found")
        return cls._scanners[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

    @classmethod
    def _create_scanner_metadata(cls, scanner: Type[Scanner]) -> Dict[str, str]:
        """Helper method to create scanner metadata dictionary."""
        return {
            "class_name": scanner.__name__,
            "name": scanner.name(),
            "module": scanner.__module__,
            "description": scanner.__doc__,
            "documentation": inspect.cleandoc(scanner.documentation()),
            "category": scanner.category(),
            "inputs": scanner.input_schema(),
            "outputs": scanner.output_schema(),
            "params": {},
            "params_schema": scanner.get_params_schema(),
            "required_params": scanner.required_params(),
            "icon": scanner.icon(),
        }

    @classmethod
    def list(cls) -> Dict[str, Dict[str, str]]:
        return {
            name: cls._create_scanner_metadata(scanner)
            for name, scanner in cls._scanners.items()
        }

    @classmethod
    def list_by_categories(cls) -> Dict[str, List[Dict[str, str]]]:
        scanners_by_category = {}
        for _, scanner in cls._scanners.items():
            category = scanner.category()
            if category not in scanners_by_category:
                scanners_by_category[category] = []
            scanners_by_category[category].append(cls._create_scanner_metadata(scanner))
        return scanners_by_category

    @classmethod
    def list_by_input_type(cls, input_type: str) -> List[Dict[str, str]]:
        input_type_lower = input_type.lower()

        if input_type_lower == "any":
            return [
                cls._create_scanner_metadata(scanner)
                for scanner in cls._scanners.values()
            ]

        return [
            cls._create_scanner_metadata(scanner)
            for scanner in cls._scanners.values()
            if scanner.input_schema()["type"].lower() in ["any", input_type_lower]
        ]


# Register all scanners
ScannerRegistry.register(ReverseResolveScanner)
ScannerRegistry.register(ResolveScanner)
ScannerRegistry.register(SubdomainScanner)
ScannerRegistry.register(WhoisScanner)
ScannerRegistry.register(GeolocationScanner)
ScannerRegistry.register(MaigretScanner)
ScannerRegistry.register(IpToAsnScanner)
ScannerRegistry.register(AsnToCidrsScanner)
ScannerRegistry.register(CidrToIpsScanner)
ScannerRegistry.register(OrgToAsnScanner)
ScannerRegistry.register(DomainToAsnScanner)
ScannerRegistry.register(CryptoWalletAddressToTransactions)
ScannerRegistry.register(CryptoWalletAddressToNFTs)
ScannerRegistry.register(DomainToWebsiteScanner)
ScannerRegistry.register(WebsiteToCrawler)
ScannerRegistry.register(WebsiteToLinks)
ScannerRegistry.register(WebsiteToDomainScanner)
ScannerRegistry.register(EmailToGravatarScanner)
ScannerRegistry.register(EmailToBreachesScanner)
ScannerRegistry.register(IndividualToOrgScanner)
ScannerRegistry.register(OrgToInfosScanner)
ScannerRegistry.register(WebsiteToWebtrackersScanner)
ScannerRegistry.register(N8nConnector)
