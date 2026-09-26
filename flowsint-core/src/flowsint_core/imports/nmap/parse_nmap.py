"""Parse an nmap XML report (`nmap -oX`) into hosts, hostnames and ports.

Produces:
- one Ip per host reported up
- one Domain per <hostname>, linked REVERSE_RESOLVES_TO for a PTR record and
  RESOLVES_TO for a name given on the command line
- one Port per <port> element, linked HAS_PORT from its host

Port state is carried through verbatim, so filtered stays distinguishable from
closed, and banner is only set when nmap fingerprinted the service.

Hosts reported down and <extraports> summaries are skipped: neither carries a
per-port result. A host with no <status> element is treated as up, since tools
that reuse nmap's format do not always write one.
"""

import re
from typing import Dict, Iterator, List, Optional, Tuple
from xml.etree.ElementTree import Element, ParseError

from defusedxml.common import DefusedXmlException
from defusedxml.ElementTree import fromstring
from flowsint_types import Domain, Ip, Port

from ..types import Edge, Entity, EntityPreview, FileParseResult

# A bound on how much is parsed into memory as a DOM.
MAX_FILE_BYTES = 32 * 1024 * 1024

# Service names and banners are whatever the remote host chose to send back.
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
MAX_TEXT_LENGTH = 512

# nmap -sO reports IP protocol numbers in portid, which are not port numbers.
PORT_PROTOCOLS = ("tcp", "udp", "sctp")


def parse_nmap(
    file_bytes: bytes,
    max_preview_rows: int,
) -> FileParseResult:
    """Parse an nmap XML report into hosts, hostnames and ports."""
    root = _parse_xml(file_bytes)

    hosts = root.findall("host")
    if not hosts:
        raise ValueError(
            "This is a valid nmap report but it contains no <host> element, "
            "so there is nothing to import."
        )

    previews: Dict[str, EntityPreview] = {}
    edges: List[Edge] = []

    def add(node_id: str, obj) -> bool:
        """Record an entity once. False means the preview limit was reached."""
        if node_id in previews:
            return True
        if len(previews) >= max_preview_rows:
            return False
        previews[node_id] = EntityPreview(
            obj=obj,
            detected_type=type(obj).__name__,
            node_id=node_id,
        )
        return True

    def link(from_id: str, to_id: str, label: str) -> None:
        """Link two entities, but only if both survived the preview limit."""
        source = previews.get(from_id)
        target = previews.get(to_id)
        if source is None or target is None:
            return
        edges.append(
            Edge(
                from_obj=source.obj,
                from_id=from_id,
                to_obj=target.obj,
                to_id=to_id,
                label=label,
            )
        )

    for host in hosts:
        if not _is_up(host):
            continue

        address = _host_address(host)
        if address is None:
            continue
        try:
            ip = Ip(address=address)
        except ValueError:
            continue

        ip_id = f"ip:{address}"
        if not add(ip_id, ip):
            break

        for hostname, is_ptr in _hostnames(host):
            try:
                domain = Domain(domain=hostname)
            except ValueError:
                # nmap resolves names that are not domains -- localhost, a bare
                # NetBIOS name, a name with an underscore. Skip those rather
                # than fail the whole import.
                continue
            domain_id = f"domain:{hostname}"
            if not add(domain_id, domain):
                break
            if is_ptr:
                link(ip_id, domain_id, "REVERSE_RESOLVES_TO")
            else:
                link(domain_id, ip_id, "RESOLVES_TO")

        for port in _ports(host):
            port_id = f"port:{address}:{port.protocol}:{port.number}"
            if not add(port_id, port):
                break
            link(ip_id, port_id, "HAS_PORT")

    entities: Dict[str, Entity] = {}
    for preview in previews.values():
        if preview.detected_type in entities:
            entities[preview.detected_type].results.append(preview)
        else:
            entities[preview.detected_type] = Entity(
                type=preview.detected_type, results=[preview]
            )

    return FileParseResult(
        entities=entities,
        edges=edges,
        total_entities=len(previews),
    )


def _parse_xml(file_bytes: Optional[bytes]) -> Element:
    """Turn the uploaded bytes into an <nmaprun> element, or explain why not."""
    if not file_bytes or not file_bytes.strip():
        raise ValueError("File is empty")

    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValueError(
            f"nmap report is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB "
            "and was not parsed."
        )

    try:
        # An uploaded report is untrusted, and so are the service banners inside
        # it. defusedxml refuses entity declarations and external references in
        # the parser, so the refusal holds whatever encoding the file declares.
        # DTDs are not forbidden outright because nmap writes <!DOCTYPE nmaprun>.
        # Bytes rather than str: the document carries its own encoding
        # declaration and the parser is the right thing to honour it.
        root = fromstring(file_bytes)
    except (ParseError, LookupError) as e:
        raise ValueError(f"Invalid XML: {str(e)}")
    except DefusedXmlException as e:
        raise ValueError(
            f"This XML uses a feature that is refused when parsing an untrusted "
            f"file ({type(e).__name__}). nmap does not produce such a report."
        )

    if root.tag != "nmaprun":
        raise ValueError(
            f"Not an nmap report: expected a <nmaprun> root element, found "
            f"<{root.tag}>."
        )
    return root


def _is_up(host: Element) -> bool:
    """Whether nmap found the host up, and so actually scanned its ports."""
    status = host.find("status")
    if status is None:
        # Tools that reuse nmap's format do not always write <status>.
        return True
    return (status.get("state") or "").lower() == "up"


def _host_address(host: Element) -> Optional[str]:
    """The host's first IPv4 or IPv6 address. MAC addresses are not hosts."""
    for address in host.findall("address"):
        if (address.get("addrtype") or "").startswith("ipv"):
            value = address.get("addr")
            if value:
                return value.strip()
    return None


def _hostnames(host: Element) -> Iterator[Tuple[str, bool]]:
    """Each name nmap has for the host, and whether it came from a PTR record."""
    container = host.find("hostnames")
    if container is None:
        return
    seen = set()
    for hostname in container.findall("hostname"):
        name = (hostname.get("name") or "").strip().lower()
        if not name:
            continue
        # type="PTR" is a reverse lookup nmap did; type="user" is the name given
        # on the command line, which resolved forward to this address. nmap
        # reports both when they agree, so the pair is what is de-duplicated.
        is_ptr = (hostname.get("type") or "").upper() == "PTR"
        if (name, is_ptr) in seen:
            continue
        seen.add((name, is_ptr))
        yield name, is_ptr


def _ports(host: Element) -> Iterator[Port]:
    """Each port nmap reported an individual result for."""
    container = host.find("ports")
    if container is None:
        return
    for element in container.findall("port"):
        protocol = (element.get("protocol") or "tcp").lower()
        if protocol not in PORT_PROTOCOLS:
            continue

        portid = element.get("portid")
        if portid is None:
            continue
        try:
            number = int(portid)
        except ValueError:
            continue

        state_element = element.find("state")
        state = state_element.get("state") if state_element is not None else None
        service, banner = _service(element)

        try:
            yield Port(
                number=number,
                # Upper case to match the Port nodes the naabu enricher creates,
                # since the protocol is part of the node label.
                protocol=protocol.upper(),
                state=state or None,
                service=service,
                banner=banner,
            )
        except ValueError:
            # A port number outside 0-65535 is not a port. Skip the row.
            continue


def _service(port: Element) -> Tuple[Optional[str], Optional[str]]:
    """The service name, and the banner only if nmap really read one."""
    service = port.find("service")
    if service is None:
        return None, None

    name = _clean(service.get("name"))
    # nmap prints a TLS-wrapped service as ssl/http rather than http, and the
    # difference between a cleartext and an encrypted service is worth keeping.
    if name and (service.get("tunnel") or "").lower() == "ssl":
        name = f"ssl/{name}"

    # nmap records how it decided: "probed" means it fingerprinted the service
    # (-sV), anything else means it looked the port number up in nmap-services
    # and guessed. product/version/extrainfo only exist in the probed case.
    if (service.get("method") or "table").lower() != "probed":
        # Tools that reuse nmap's format write no method but do write a banner.
        return name, _clean(service.get("banner"))

    parts = [
        _clean(service.get("product")),
        _clean(service.get("version")),
        _clean(service.get("extrainfo")),
    ]
    banner = " ".join(part for part in parts if part).strip()
    return name, banner[:MAX_TEXT_LENGTH] or None


def _clean(value: Optional[str]) -> Optional[str]:
    """Strip control characters out of remote-controlled text, and bound it."""
    if not value:
        return None
    cleaned = _CONTROL_CHARACTERS.sub("", value).strip()
    return cleaned[:MAX_TEXT_LENGTH] or None
