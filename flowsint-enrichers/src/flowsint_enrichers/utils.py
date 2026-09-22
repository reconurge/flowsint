from urllib.parse import urlparse


def get_root_domain(domain: str) -> str:
    """
    Extract the root domain from a given domain string.

    Args:
        domain: The domain string (can be a subdomain or root domain)

    Returns:
        The root domain (e.g., "example.com" from "sub.example.com" or "www.sub.example.com")
    """
    try:
        # Remove protocol if present
        if "://" in domain:
            parsed = urlparse(domain)
            domain = parsed.hostname or domain

        # Split by dots
        parts = domain.split(".")

        # Handle common country code TLDs that have 2 parts (e.g., .co.uk, .com.au, .org.uk)
        common_cc_tlds = [
            ".co.uk",
            ".com.au",
            ".org.uk",
            ".net.uk",
            ".gov.uk",
            ".ac.uk",
            ".co.nz",
            ".com.sg",
            ".co.jp",
            ".co.kr",
            ".com.br",
            ".com.mx",
        ]

        # Check if the domain ends with a common country code TLD
        for cc_tld in common_cc_tlds:
            if domain.endswith(cc_tld):
                # For country code TLDs, take the last 3 parts (e.g., example.co.uk)
                if len(parts) >= 3:
                    return ".".join(parts[-3:])
                return domain

        # For regular TLDs, take the last 2 parts (e.g., example.com)
        if len(parts) >= 2:
            return ".".join(parts[-2:])

        return domain
    except Exception:
        # If we can't parse it, return the original domain
        return domain
