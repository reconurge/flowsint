"""Parser for nmap XML scan output.

Turns an nmap (or naabu --json -nmap-cli style) XML report into Ip and Port
entities plus IP-[HAS_PORT]->Port edges, so an existing scan can be imported
into a sketch without re-scanning the target (issue #107).
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional

# defusedxml hardens parsing against XXE / billion-laughs attacks; import files
# are untrusted input. Element type hints still come from the stdlib (the types
# are identical and not a security concern).
from defusedxml.ElementTree import fromstring as safe_fromstring

from flowsint_types import Ip, Port

from flowsint_core.core.graph.serializer import TypeResolver

from ..types import Edge, Entity, EntityPreview, FileParseResult


def _host_address(host: ET.Element) -> Optional[str]:
    """Return the host's IP address, preferring IPv4 then IPv6."""
    for addrtype in ("ipv4", "ipv6"):
        el = host.find(f"./address[@addrtype='{addrtype}']")
        if el is not None and el.get("addr"):
            return el.get("addr")
    # Fallback: first address element that isn't a MAC.
    for el in host.findall("address"):
        if el.get("addrtype") != "mac" and el.get("addr"):
            return el.get("addr")
    return None


def _is_host_up(host: ET.Element) -> bool:
    status = host.find("status")
    # Treat missing status as up (some tools omit it); only skip explicit "down".
    return status is None or status.get("state") != "down"


def _build_port(port_el: ET.Element) -> Optional[Port]:
    portid = port_el.get("portid")
    if not portid:
        return None
    try:
        number = int(portid)
    except (TypeError, ValueError):
        return None

    protocol = (port_el.get("protocol") or "").upper() or None

    state_el = port_el.find("state")
    state = state_el.get("state") if state_el is not None else None

    service_el = port_el.find("service")
    service = None
    banner = None
    if service_el is not None:
        service = service_el.get("name") or None
        # Compose a human-readable banner from product/version/extrainfo.
        banner = " ".join(
            part
            for part in (
                service_el.get("product"),
                service_el.get("version"),
                service_el.get("extrainfo"),
            )
            if part
        ) or None

    try:
        return Port(
            number=number,
            protocol=protocol,
            state=state,
            service=service,
            banner=banner,
        )
    except Exception:
        # Out-of-range port number or other validation failure: skip it.
        return None


def parse_nmap_xml(
    file_bytes: bytes,
    max_preview_rows: int,
    type_resolver: Optional[TypeResolver] = None,  # accepted for signature parity
) -> FileParseResult:
    """Parse nmap XML into Ip + Port entities and IP-[HAS_PORT]->Port edges."""
    try:
        root = safe_fromstring(file_bytes)
    except ET.ParseError as e:
        raise ValueError(f"Invalid nmap XML file: {e}")

    entities: Dict[str, Entity] = {}
    edges: List[Edge] = []

    def add_preview(preview: EntityPreview) -> None:
        bucket = entities.get(preview.detected_type)
        if bucket is None:
            entities[preview.detected_type] = Entity(
                type=preview.detected_type, results=[preview]
            )
        else:
            bucket.results.append(preview)

    for host in root.findall("host"):
        if not _is_host_up(host):
            continue

        address = _host_address(host)
        if not address:
            continue

        try:
            ip_obj = Ip(address=address)
        except Exception:
            # Not a valid IP (shouldn't happen for nmap output) -> skip host.
            continue

        ip_node_id = f"ip-{address}"
        ip_preview = EntityPreview(
            node_id=ip_node_id, obj=ip_obj, detected_type="Ip"
        )
        add_preview(ip_preview)

        for port_el in host.findall("./ports/port"):
            port_obj = _build_port(port_el)
            if port_obj is None:
                continue

            port_node_id = f"port-{address}-{port_obj.number}-{port_obj.protocol}"
            add_preview(
                EntityPreview(
                    node_id=port_node_id, obj=port_obj, detected_type="Port"
                )
            )
            edges.append(
                Edge(
                    from_obj=ip_obj,
                    from_id=ip_node_id,
                    to_obj=port_obj,
                    to_id=port_node_id,
                    label="HAS_PORT",
                )
            )

    total = sum(len(entity.results) for entity in entities.values())
    return FileParseResult(entities=entities, edges=edges, total_entities=total)
