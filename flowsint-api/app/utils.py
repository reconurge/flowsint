from urllib.parse import urlparse
def extract_domain(url_or_domain: str) -> str:
    parsed = urlparse(url_or_domain if "://" in url_or_domain else "http://" + url_or_domain)
    return parsed.hostname or url_or_domain
