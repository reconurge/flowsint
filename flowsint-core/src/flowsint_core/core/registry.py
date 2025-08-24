import inspect
from typing import Dict, Optional, Type, List
from flowsint_core.core.scanner_base import Scanner

# Domain-related scanners
from flowsint_transforms.domain.to_subdomains import SubdomainScanner
from flowsint_transforms.domain.to_whois import WhoisScanner
from flowsint_transforms.domain.to_ip import ResolveScanner
from flowsint_transforms.domain.to_website import DomainToWebsiteScanner
from flowsint_transforms.domain.to_root_domain import DomainToRootDomain
from flowsint_transforms.domain.to_asn import DomainToAsnScanner
from flowsint_transforms.domain.to_history import DomainToHistoryScanner


# IP-related scanners
from flowsint_transforms.email.to_domains import EmailToDomainsScanner
from flowsint_transforms.individual.to_domains import IndividualToDomainsScanner
from flowsint_transforms.ip.to_domain import ReverseResolveScanner
from flowsint_transforms.ip.to_geolocation import GeolocationScanner


from flowsint_transforms.ip.to_asn import IpToAsnScanner

# ASN-related scanners
from flowsint_transforms.asn.to_cidrs import AsnToCidrsScanner

# CIDR-related scanners
from flowsint_transforms.cidr.to_ips import CidrToIpsScanner

# Social media scanners
from flowsint_transforms.organization.to_domains import OrgToDomainsScanner
from flowsint_transforms.social.to_maigret import MaigretScanner

# Organization-related scanners
from flowsint_transforms.organization.to_asn import OrgToAsnScanner
from flowsint_transforms.organization.to_infos import OrgToInfosScanner

# Cryptocurrency scanners
from flowsint_transforms.crypto.to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_transforms.crypto.to_nfts import CryptoWalletAddressToNFTs

# Website-related scanners
from flowsint_transforms.website.to_crawler import WebsiteToCrawler
from flowsint_transforms.website.to_links import WebsiteToLinks
from flowsint_transforms.website.to_domain import WebsiteToDomainScanner
from flowsint_transforms.website.to_text import WebsiteToText
from flowsint_transforms.website.to_webtrackers import WebsiteToWebtrackersScanner

# Email-related scanners
from flowsint_transforms.email.to_gravatar import EmailToGravatarScanner
from flowsint_transforms.email.to_leaks import EmailToBreachesScanner

# Individual-related scanners
from flowsint_transforms.individual.to_org import IndividualToOrgScanner

# Integration scanners
from flowsint_transforms.n8n.connector import N8nConnector


class TransformRegistry:

    _scanners: Dict[str, Type[Scanner]] = {}

    @classmethod
    def register(cls, scanner_class: Type[Scanner]) -> None:
        cls._scanners[scanner_class.name()] = scanner_class

    @classmethod
    def transform_exists(cls, name: str) -> bool:
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
    def list(cls, exclude: Optional[List[str]] = []) -> Dict[str, Dict[str, str]]:
        return {
            name: cls._create_scanner_metadata(scanner)
            for name, scanner in cls._scanners.items()
            if name not in exclude
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
    def list_by_input_type(
        cls, input_type: str, exclude: Optional[List[str]] = []
    ) -> List[Dict[str, str]]:
        input_type_lower = input_type.lower()

        if input_type_lower == "any":
            return [
                cls._create_scanner_metadata(scanner)
                for scanner in cls._scanners.values()
                if scanner.name() not in exclude
            ]

        return [
            cls._create_scanner_metadata(scanner)
            for scanner in cls._scanners.values()
            if scanner.input_schema()["type"].lower() in ["any", input_type_lower]
            and scanner.name() not in exclude
        ]


# Register all scanners

# Domain-related scanners
TransformRegistry.register(ReverseResolveScanner)
TransformRegistry.register(ResolveScanner)
TransformRegistry.register(SubdomainScanner)
TransformRegistry.register(WhoisScanner)
TransformRegistry.register(DomainToWebsiteScanner)
TransformRegistry.register(DomainToRootDomain)
TransformRegistry.register(DomainToAsnScanner)
TransformRegistry.register(DomainToHistoryScanner)

# IP-related scanners
TransformRegistry.register(GeolocationScanner)
TransformRegistry.register(IpToAsnScanner)

# ASN-related scanners
TransformRegistry.register(AsnToCidrsScanner)

# CIDR-related scanners
TransformRegistry.register(CidrToIpsScanner)

# Social media scanners
TransformRegistry.register(MaigretScanner)

# Organization-related scanners
TransformRegistry.register(OrgToAsnScanner)
TransformRegistry.register(OrgToInfosScanner)
TransformRegistry.register(OrgToDomainsScanner)
# Cryptocurrency scanners
TransformRegistry.register(CryptoWalletAddressToTransactions)
TransformRegistry.register(CryptoWalletAddressToNFTs)

# Website-related scanners
TransformRegistry.register(WebsiteToCrawler)
TransformRegistry.register(WebsiteToLinks)
TransformRegistry.register(WebsiteToDomainScanner)
TransformRegistry.register(WebsiteToWebtrackersScanner)
TransformRegistry.register(WebsiteToText)

# Email-related scanners
TransformRegistry.register(EmailToGravatarScanner)
TransformRegistry.register(EmailToBreachesScanner)
TransformRegistry.register(EmailToDomainsScanner)

# Individual-related scanners
TransformRegistry.register(IndividualToOrgScanner)
TransformRegistry.register(IndividualToDomainsScanner)

# Integration scanners
TransformRegistry.register(N8nConnector)
