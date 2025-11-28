import inspect
from typing import Dict, Optional, Type, List, Any
from flowsint_core.core.enricher_base import Enricher

# Domain-related enrichers
from flowsint_enrichers.domain.to_subdomains import SubdomainEnricher
from flowsint_enrichers.domain.to_whois import WhoisEnricher
from flowsint_enrichers.domain.to_ip import ResolveEnricher
from flowsint_enrichers.domain.to_website import DomainToWebsiteEnricher
from flowsint_enrichers.domain.to_root_domain import DomainToRootDomain
from flowsint_enrichers.domain.to_asn import DomainToAsnEnricher
from flowsint_enrichers.domain.to_history import DomainToHistoryEnricher

# IP-related enrichers
from flowsint_enrichers.email.to_domains import EmailToDomainsEnricher
from flowsint_enrichers.individual.to_domains import IndividualToDomainsEnricher
from flowsint_enrichers.ip.to_domain import ReverseResolveEnricher
from flowsint_enrichers.ip.to_infos import IpToInfosEnricher
from flowsint_enrichers.ip.to_asn import IpToAsnEnricher
from flowsint_enrichers.ip.to_ports import IpToPortsEnricher

# ASN-related enrichers
from flowsint_enrichers.asn.to_cidrs import AsnToCidrsEnricher

# CIDR-related enrichers
from flowsint_enrichers.cidr.to_ips import CidrToIpsEnricher

# Social media enrichers
from flowsint_enrichers.organization.to_domains import OrgToDomainsEnricher
from flowsint_enrichers.social.to_maigret import MaigretEnricher

# Organization-related enrichers
from flowsint_enrichers.organization.to_asn import OrgToAsnEnricher
from flowsint_enrichers.organization.to_infos import OrgToInfosEnricher

# Cryptocurrency enrichers
from flowsint_enrichers.crypto.to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_enrichers.crypto.to_nfts import CryptoWalletAddressToNFTs

# Website-related enrichers
from flowsint_enrichers.website.to_crawler import WebsiteToCrawler
from flowsint_enrichers.website.to_links import WebsiteToLinks
from flowsint_enrichers.website.to_domain import WebsiteToDomainEnricher
from flowsint_enrichers.website.to_text import WebsiteToText
from flowsint_enrichers.website.to_webtrackers import WebsiteToWebtrackersEnricher

# Email-related enrichers
from flowsint_enrichers.email.to_gravatar import EmailToGravatarEnricher
from flowsint_enrichers.email.to_leaks import EmailToBreachesEnricher

# Phone-related enrichers

# Individual-related enrichers
from flowsint_enrichers.individual.to_org import IndividualToOrgEnricher

# Integration enrichers
from flowsint_enrichers.n8n.connector import N8nConnector

# Dummy
from flowsint_enrichers.ip.to_dummy_domains import IpToDummyDomainsEnricher
from flowsint_enrichers.domain.to_dummy_ip import DomainToDummyIpEnricher


class EnricherRegistry:

    _enrichers: Dict[str, Type[Enricher]] = {}

    @classmethod
    def register(cls, enricher_class: Type[Enricher]) -> None:
        cls._enrichers[enricher_class.name()] = enricher_class

    @classmethod
    def enricher_exists(cls, name: str) -> bool:
        return name in cls._enrichers

    @classmethod
    def get_enricher(
        cls, name: str, sketch_id: str, scan_id: str, **kwargs
    ) -> Enricher:
        if name not in cls._enrichers:
            raise Exception(f"Enricher '{name}' not found")
        return cls._enrichers[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

    @classmethod
    def _create_enricher_metadata(cls, enricher: Type[Enricher]) -> Dict[str, str]:
        """Helper method to create enricher metadata dictionary."""
        return {
            "class_name": enricher.__name__,
            "name": enricher.name(),
            "module": enricher.__module__,
            "description": enricher.__doc__,
            "documentation": inspect.cleandoc(enricher.documentation()),
            "category": enricher.category(),
            "inputs": enricher.input_schema(),
            "outputs": enricher.output_schema(),
            "params": {},
            "params_schema": enricher.get_params_schema(),
            "required_params": enricher.required_params(),
            "icon": enricher.icon(),
        }

    @classmethod
    def list(
        cls, exclude: Optional[List[str]] = None, wobbly_type: Optional[bool] = False
    ) -> List[Dict[str, Any]]:
        if exclude is None:
            exclude = []
        return [
            {
                **cls._create_enricher_metadata(enricher),
                "wobblyType": wobbly_type,
            }
            for enricher in cls._enrichers.values()
            if enricher.name() not in exclude
        ]

    @classmethod
    def list_by_categories(cls) -> Dict[str, List[Dict[str, str]]]:
        enrichers_by_category = {}
        for _, enricher in cls._enrichers.items():
            category = enricher.category()
            if category not in enrichers_by_category:
                enrichers_by_category[category] = []
            enrichers_by_category[category].append(
                cls._create_enricher_metadata(enricher)
            )
        return enrichers_by_category

    @classmethod
    def list_by_input_type(
        cls, input_type: str, exclude: Optional[List[str]] = []
    ) -> List[Dict[str, str]]:
        input_type_lower = input_type.lower()

        if input_type_lower == "any":
            return [
                cls._create_enricher_metadata(enricher)
                for enricher in cls._enrichers.values()
                if enricher.name() not in exclude
            ]

        return [
            cls._create_enricher_metadata(enricher)
            for enricher in cls._enrichers.values()
            if enricher.input_schema()["type"].lower() in ["any", input_type_lower]
            and enricher.name() not in exclude
        ]


# Register all enrichers

# Domain-related enrichers
EnricherRegistry.register(ReverseResolveEnricher)
EnricherRegistry.register(ResolveEnricher)
EnricherRegistry.register(SubdomainEnricher)
EnricherRegistry.register(WhoisEnricher)
EnricherRegistry.register(DomainToWebsiteEnricher)
EnricherRegistry.register(DomainToRootDomain)
EnricherRegistry.register(DomainToAsnEnricher)
EnricherRegistry.register(DomainToHistoryEnricher)

# IP-related enrichers
EnricherRegistry.register(IpToInfosEnricher)
EnricherRegistry.register(IpToAsnEnricher)
EnricherRegistry.register(IpToPortsEnricher)

# ASN-related enrichers
EnricherRegistry.register(AsnToCidrsEnricher)

# CIDR-related enrichers
EnricherRegistry.register(CidrToIpsEnricher)

# Social media enrichers
EnricherRegistry.register(MaigretEnricher)

# Organization-related enrichers
EnricherRegistry.register(OrgToAsnEnricher)
EnricherRegistry.register(OrgToInfosEnricher)
EnricherRegistry.register(OrgToDomainsEnricher)
# Cryptocurrency enrichers
EnricherRegistry.register(CryptoWalletAddressToTransactions)
EnricherRegistry.register(CryptoWalletAddressToNFTs)

# Website-related enrichers
EnricherRegistry.register(WebsiteToCrawler)
EnricherRegistry.register(WebsiteToLinks)
EnricherRegistry.register(WebsiteToDomainEnricher)
EnricherRegistry.register(WebsiteToWebtrackersEnricher)
EnricherRegistry.register(WebsiteToText)

# Email-related enrichers
EnricherRegistry.register(EmailToGravatarEnricher)
EnricherRegistry.register(EmailToBreachesEnricher)
EnricherRegistry.register(EmailToDomainsEnricher)

# Individual-related enrichers
EnricherRegistry.register(IndividualToOrgEnricher)
EnricherRegistry.register(IndividualToDomainsEnricher)

# Integration enrichers
EnricherRegistry.register(N8nConnector)

# Dummy
EnricherRegistry.register(IpToDummyDomainsEnricher)
EnricherRegistry.register(DomainToDummyIpEnricher)
