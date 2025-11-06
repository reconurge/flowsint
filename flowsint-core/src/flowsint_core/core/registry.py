import inspect
from typing import Dict, Optional, Type, List, Any
from flowsint_core.core.transform_base import Transform

# Domain-related transforms
from flowsint_transforms.domain.to_subdomains import SubdomainTransform
from flowsint_transforms.domain.to_whois import WhoisTransform
from flowsint_transforms.domain.to_ip import ResolveTransform
from flowsint_transforms.domain.to_website import DomainToWebsiteTransform
from flowsint_transforms.domain.to_root_domain import DomainToRootDomain
from flowsint_transforms.domain.to_asn import DomainToAsnTransform
from flowsint_transforms.domain.to_history import DomainToHistoryTransform

# IP-related transforms
from flowsint_transforms.email.to_domains import EmailToDomainsTransform
from flowsint_transforms.individual.to_domains import IndividualToDomainsTransform
from flowsint_transforms.ip.to_domain import ReverseResolveTransform
from flowsint_transforms.ip.to_infos import IpToInfosTransform
from flowsint_transforms.ip.to_asn import IpToAsnTransform

# ASN-related transforms
from flowsint_transforms.asn.to_cidrs import AsnToCidrsTransform

# CIDR-related transforms
from flowsint_transforms.cidr.to_ips import CidrToIpsTransform

# Social media transforms
from flowsint_transforms.organization.to_domains import OrgToDomainsTransform
from flowsint_transforms.social.to_maigret import MaigretTransform

# Organization-related transforms
from flowsint_transforms.organization.to_asn import OrgToAsnTransform
from flowsint_transforms.organization.to_infos import OrgToInfosTransform

# Cryptocurrency transforms
from flowsint_transforms.crypto.to_transactions import (
    CryptoWalletAddressToTransactions,
)
from flowsint_transforms.crypto.to_nfts import CryptoWalletAddressToNFTs

# Website-related transforms
from flowsint_transforms.website.to_crawler import WebsiteToCrawler
from flowsint_transforms.website.to_links import WebsiteToLinks
from flowsint_transforms.website.to_domain import WebsiteToDomainTransform
from flowsint_transforms.website.to_text import WebsiteToText
from flowsint_transforms.website.to_webtrackers import WebsiteToWebtrackersTransform

# Email-related transforms
from flowsint_transforms.email.to_gravatar import EmailToGravatarTransform
from flowsint_transforms.email.to_leaks import EmailToBreachesTransform

# Phone-related transforms
from flowsint_transforms.phone.to_leaks import PhoneToBreachesTransform

# Individual-related transforms
from flowsint_transforms.individual.to_org import IndividualToOrgTransform

# Integration transforms
from flowsint_transforms.n8n.connector import N8nConnector


class TransformRegistry:

    _transforms: Dict[str, Type[Transform]] = {}

    @classmethod
    def register(cls, transform_class: Type[Transform]) -> None:
        cls._transforms[transform_class.name()] = transform_class

    @classmethod
    def transform_exists(cls, name: str) -> bool:
        return name in cls._transforms

    @classmethod
    def get_transform(
        cls, name: str, sketch_id: str, scan_id: str, **kwargs
    ) -> Transform:
        if name not in cls._transforms:
            raise Exception(f"Transform '{name}' not found")
        return cls._transforms[name](sketch_id=sketch_id, scan_id=scan_id, **kwargs)

    @classmethod
    def _create_transform_metadata(cls, transform: Type[Transform]) -> Dict[str, str]:
        """Helper method to create transform metadata dictionary."""
        return {
            "class_name": transform.__name__,
            "name": transform.name(),
            "module": transform.__module__,
            "description": transform.__doc__,
            "documentation": inspect.cleandoc(transform.documentation()),
            "category": transform.category(),
            "inputs": transform.input_schema(),
            "outputs": transform.output_schema(),
            "params": {},
            "params_schema": transform.get_params_schema(),
            "required_params": transform.required_params(),
            "icon": transform.icon(),
        }

    @classmethod
    def list(
        cls, exclude: Optional[List[str]] = None, wobbly_type: Optional[bool] = False
    ) -> List[Dict[str, Any]]:
        if exclude is None:
            exclude = []
        return [
            {
                **cls._create_transform_metadata(transform),
                "wobblyType": wobbly_type,
            }
            for transform in cls._transforms.values()
            if transform.name() not in exclude
        ]

    @classmethod
    def list_by_categories(cls) -> Dict[str, List[Dict[str, str]]]:
        transforms_by_category = {}
        for _, transform in cls._transforms.items():
            category = transform.category()
            if category not in transforms_by_category:
                transforms_by_category[category] = []
            transforms_by_category[category].append(
                cls._create_transform_metadata(transform)
            )
        return transforms_by_category

    @classmethod
    def list_by_input_type(
        cls, input_type: str, exclude: Optional[List[str]] = []
    ) -> List[Dict[str, str]]:
        input_type_lower = input_type.lower()

        if input_type_lower == "any":
            return [
                cls._create_transform_metadata(transform)
                for transform in cls._transforms.values()
                if transform.name() not in exclude
            ]

        return [
            cls._create_transform_metadata(transform)
            for transform in cls._transforms.values()
            if transform.input_schema()["type"].lower() in ["any", input_type_lower]
            and transform.name() not in exclude
        ]


# Register all transforms

# Domain-related transforms
TransformRegistry.register(ReverseResolveTransform)
TransformRegistry.register(ResolveTransform)
TransformRegistry.register(SubdomainTransform)
TransformRegistry.register(WhoisTransform)
TransformRegistry.register(DomainToWebsiteTransform)
TransformRegistry.register(DomainToRootDomain)
TransformRegistry.register(DomainToAsnTransform)
TransformRegistry.register(DomainToHistoryTransform)

# IP-related transforms
TransformRegistry.register(IpToInfosTransform)
TransformRegistry.register(IpToAsnTransform)

# ASN-related transforms
TransformRegistry.register(AsnToCidrsTransform)

# CIDR-related transforms
TransformRegistry.register(CidrToIpsTransform)

# Social media transforms
TransformRegistry.register(MaigretTransform)

# Organization-related transforms
TransformRegistry.register(OrgToAsnTransform)
TransformRegistry.register(OrgToInfosTransform)
TransformRegistry.register(OrgToDomainsTransform)
# Cryptocurrency transforms
TransformRegistry.register(CryptoWalletAddressToTransactions)
TransformRegistry.register(CryptoWalletAddressToNFTs)

# Website-related transforms
TransformRegistry.register(WebsiteToCrawler)
TransformRegistry.register(WebsiteToLinks)
TransformRegistry.register(WebsiteToDomainTransform)
TransformRegistry.register(WebsiteToWebtrackersTransform)
TransformRegistry.register(WebsiteToText)

# Email-related transforms
TransformRegistry.register(EmailToGravatarTransform)
TransformRegistry.register(EmailToBreachesTransform)
TransformRegistry.register(EmailToDomainsTransform)

# Phone-related transforms
TransformRegistry.register(PhoneToBreachesTransform)

# Individual-related transforms
TransformRegistry.register(IndividualToOrgTransform)
TransformRegistry.register(IndividualToDomainsTransform)

# Integration transforms
TransformRegistry.register(N8nConnector)
