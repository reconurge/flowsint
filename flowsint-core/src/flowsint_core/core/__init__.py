"""
Core module initialization.
"""

from .registry import ScannerRegistry

# Register scanner modules for discovery
ScannerRegistry.register_module("flowsint_transforms.domains.subdomains")
ScannerRegistry.register_module("flowsint_transforms.domains.whois")
ScannerRegistry.register_module("flowsint_transforms.domains.resolve")
ScannerRegistry.register_module("flowsint_transforms.ips.reverse_resolve")
ScannerRegistry.register_module("flowsint_transforms.ips.geolocation")
ScannerRegistry.register_module("flowsint_transforms.socials.maigret")
ScannerRegistry.register_module("flowsint_transforms.ips.ip_to_asn")
ScannerRegistry.register_module("flowsint_transforms.ips.asn_to_cidrs")
ScannerRegistry.register_module("flowsint_transforms.ips.cidr_to_ips")
ScannerRegistry.register_module("flowsint_transforms.organizations.org_to_asn")
ScannerRegistry.register_module("flowsint_transforms.domains.domain_to_asn")
ScannerRegistry.register_module("flowsint_transforms.crypto.wallet_to_transactions")
ScannerRegistry.register_module("flowsint_transforms.crypto.wallet_to_nfts")
ScannerRegistry.register_module("flowsint_transforms.domains.to_website")
ScannerRegistry.register_module("flowsint_transforms.websites.to_crawler")
ScannerRegistry.register_module("flowsint_transforms.websites.to_links")
ScannerRegistry.register_module("flowsint_transforms.websites.to_domain")
ScannerRegistry.register_module("flowsint_transforms.emails.to_gravatar")
ScannerRegistry.register_module("flowsint_transforms.emails.to_leaks")
ScannerRegistry.register_module("flowsint_transforms.individuals.to_org")
ScannerRegistry.register_module("flowsint_transforms.organizations.to_infos")
ScannerRegistry.register_module("flowsint_transforms.websites.to_webtrackers")
ScannerRegistry.register_module("flowsint_transforms.n8n.connector")

# Discover and register all scanners
ScannerRegistry.discover_scanners()

__all__ = ["ScannerRegistry"]
