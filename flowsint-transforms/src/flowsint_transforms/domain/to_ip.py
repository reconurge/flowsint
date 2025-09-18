import socket
from typing import List, Union
from flowsint_core.core.logger import Logger
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain
from flowsint_types.ip import Ip
from flowsint_core.utils import is_valid_domain, is_root_domain


class ResolveTransform(Transform):
    """Resolve domain names to IP addresses."""

    # Define the input and output types as class attributes
    InputType = List[Domain]
    OutputType = List[Ip]

    @classmethod
    def name(cls) -> str:
        return "domain_to_ip"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    @classmethod
    def documentation(cls) -> str:
        """Return formatted markdown documentation for the domain resolver transform."""
        return """
        # Domain Resolver Transform

        Resolve domain names to their corresponding IP addresses using DNS queries. This transform performs forward DNS resolution to discover the IP addresses associated with domain names and subdomains.

        ## Overview

        The Domain Resolver Transform takes domain names as input and returns their resolved IP addresses. It automatically handles different input formats and validates domains before attempting resolution.

        ## Input/Output Types

        - **Input**: `List[Domain]` - Array of domain objects to resolve
        - **Output**: `List[Ip]` - Array of resolved IP addresses

        ## Input Format Support

        The transform accepts multiple input formats and automatically converts them:

        ### String Format

        ```python
        ["example.com", "subdomain.example.com"]
        ```

        ### Dictionary Format

        ```python
        [
            {"domain": "example.com"},
            {"domain": "subdomain.example.com"}
        ]
        ```

        ### Domain Object Format

        ```python
        [
            Domain(domain="example.com", root=True),
            Domain(domain="subdomain.example.com", root=False)
        ]
        ```

        ## Resolution Process

        ### 1. Input Validation

        - Validates domain format using built-in validation
        - Determines if domain is root domain or subdomain
        - Filters out invalid domains

        ### 2. DNS Resolution

        - Uses Python's `socket.gethostbyname()` for DNS queries
        - Resolves each domain to its primary A record
        - Handles resolution errors gracefully

        ### 3. Result Storage

        - Stores domain-to-IP relationships in Neo4j graph database
        - Creates nodes for both domains and IP addresses
        - Establishes `RESOLVES_TO` relationships

        ## Example Usage

        ### Basic Domain Resolution

        **Input:**
        ```json
        [
            "google.com",
            "github.com",
            "stackoverflow.com"
        ]
        ```

        **Expected Output:**
        ```json
        [
            {"address": "142.250.191.14"},
            {"address": "140.82.113.4"},
            {"address": "151.101.193.69"}
        ]
        ```

        ### Mixed Input Types

        **Input:**
        ```json
        [
            "example.com",
            {"domain": "subdomain.example.com"},
            {"domain": "api.example.com", "root": false}
        ]
        ```

        ## Graph Database Storage

        ### Node Creation

        **Domain Node:**
        ```cypher
        MERGE (d:domain {domain: "example.com"})
        SET d.sketch_id = "sketch-uuid",
            d.label = "example.com",
            d.type = "domain"  // or "subdomain"
        ```

        **IP Node:**
        ```cypher
        MERGE (ip:ip {address: "93.184.216.34"})
        SET ip.sketch_id = "sketch-uuid",
            ip.label = "93.184.216.34",
            ip.type = "ip"
        ```

        ### Relationship Creation

        ```cypher
        MERGE (d)-[:RESOLVES_TO {sketch_id: "sketch-uuid"}]->(ip)
        ```

        ## Domain Type Classification

        The transform automatically classifies domains:

        - **Root Domain**: `example.com` → `type: "domain"`
        - **Subdomain**: `api.example.com` → `type: "subdomain"`

        ## Error Handling

        ### Resolution Failures

        When DNS resolution fails, the transform:

        - Logs the error with domain name
        - Continues processing remaining domains
        - Does not create nodes for failed resolutions

        Common resolution failures:

        - **NXDOMAIN**: Domain does not exist
        - **Timeout**: DNS server not responding
        - **Network errors**: Connectivity issues

        ### Invalid Input Handling

        The transform filters out:

        - Malformed domain names
        - Empty strings
        - Non-string, non-dict, non-Domain inputs

        ## Performance Considerations

        ### Resolution Speed

        - Sequential DNS queries (not parallelized)
        - Typical resolution time: 10-100ms per domain
        - Consider batch size for large domain lists

        ### DNS Caching

        - Relies on system DNS cache
        - Results may vary based on TTL values
        - Fresh queries may take longer than cached ones

        ## Use Cases

        ### Investigation Scenarios

        1. **Domain Enumeration**: Resolve discovered subdomains to find active hosts
        2. **Infrastructure Mapping**: Map domain-to-IP relationships for target organization
        3. **CDN Detection**: Identify content delivery network usage patterns
        4. **IP Pivoting**: Find shared hosting infrastructure across domains

        ### Workflow Integration

        ```
        [Domain Discovery] → [Domain Resolver] → [IP Geolocation]
                                            → [Port Transform]
                                            → [ASN Lookup]
        ```

        ## Security Considerations

        - **DNS Leakage**: Resolution queries may be logged by DNS providers
        - **Rate Limiting**: Some DNS servers may rate limit queries
        - **Privacy**: Consider using secure DNS (DoH/DoT) for sensitive investigations

        ## Limitations

        - **IPv4 Only**: Currently resolves only A records (IPv4)
        - **Single IP**: Returns only the first resolved IP address
        - **No CNAME Following**: Does not follow CNAME chains
        - **No Cache Control**: Cannot force fresh DNS queries

        ## Troubleshooting

        ### Common Issues

        1. **No Results**: Check domain validity and DNS configuration
        2. **Timeouts**: Verify network connectivity and DNS server availability
        3. **Partial Results**: Some domains may fail while others succeed

        ### Debug Information

        The transform provides logging for:
        - Input validation results
        - DNS resolution attempts
        - Graph database operations
        - Error conditions

        Check FlowSint logs for detailed resolution information.

        ## Technical Details

        ### DNS Query Method

        - Uses Python's standard library `socket.gethostbyname()`
        - Follows system DNS configuration
        - Respects `/etc/hosts` file entries on Unix systems

        ### Graph Integration

        - Creates typed nodes in Neo4j
        - Maintains investigation context via `sketch_id`
        - Supports graph traversal for relationship analysis
        """

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                domain_obj = Domain(domain=item, root=is_root_domain(item))
            elif isinstance(item, dict) and "domain" in item:
                domain_obj = Domain(
                    domain=item["domain"], root=is_root_domain(item["domain"])
                )
            elif isinstance(item, Domain):
                # If the Domain object already exists, update its root field
                domain_obj = Domain(
                    domain=item.domain, root=is_root_domain(item.domain)
                )
            if domain_obj and is_valid_domain(domain_obj.domain):
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
        for d in data:
            try:
                ip = socket.gethostbyname(d.domain)
                results.append(Ip(address=ip))
            except Exception as e:
                Logger.info(
                    self.sketch_id,
                    {"message": f"Error resolving {d.domain}: {e}"},
                )
                continue
        return results

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for domain_obj, ip_obj in zip(original_input, results):
            self.create_node(
                "domain",
                "domain",
                domain_obj.domain,
                type="domain",
            )
            self.create_node("ip", "address", ip_obj.address, **ip_obj.__dict__)
            self.create_relationship(
                "domain",
                "domain",
                domain_obj.domain,
                "ip",
                "address",
                ip_obj.address,
                "RESOLVES_TO",
            )
            self.log_graph_message(
                f"IP found for domain {domain_obj.domain} -> {ip_obj.address}"
            )
        return results


# Make types available at module level for easy access
InputType = ResolveTransform.InputType
OutputType = ResolveTransform.OutputType
