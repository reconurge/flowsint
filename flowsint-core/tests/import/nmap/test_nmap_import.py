"""Comprehensive tests for nmap XML import functionality.

Tests parsing of nmap reports into hosts, hostnames and ports. Every report
below is a canned fixture; no scan was run to produce them.
"""

import pytest
from flowsint_types import Domain, Ip, Port

from flowsint_core.imports import parse_import_file
from flowsint_core.imports.nmap.parse_nmap import (
    MAX_FILE_BYTES,
    MAX_TEXT_LENGTH,
    parse_nmap,
)

# An `nmap -sV` report against nmap's own public scan-permission host. One host
# up, a scanned name and a differing PTR name, a probed service, a service
# guessed from the port number, a filtered port and a closed port.
scanme_report = b"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<?xml-stylesheet href="file:///usr/local/share/nmap/nmap.xsl" type="text/xsl"?>
<nmaprun scanner="nmap" args="nmap -sV -oX scan.xml scanme.nmap.org" start="1735689600" startstr="Wed Jan  1 00:00:00 2025" version="7.94" xmloutputversion="1.05">
<scaninfo type="connect" protocol="tcp" numservices="1000" services="1-1000"/>
<verbose level="0"/>
<debugging level="0"/>
<host starttime="1735689600" endtime="1735689610">
<status state="up" reason="conn-refused" reason_ttl="0"/>
<address addr="45.33.32.156" addrtype="ipv4"/>
<hostnames>
<hostname name="scanme.nmap.org" type="user"/>
<hostname name="li982-156.members.linode.com" type="PTR"/>
</hostnames>
<ports>
<extraports state="filtered" count="996">
<extrareasons reason="no-response" count="996"/>
</extraports>
<port protocol="tcp" portid="22"><state state="open" reason="conn-refused" reason_ttl="0"/><service name="ssh" product="OpenSSH" version="6.6.1p1 Ubuntu 2ubuntu2.13" extrainfo="Ubuntu Linux; protocol 2.0" method="probed" conf="10"><cpe>cpe:/a:openbsd:openssh:6.6.1p1</cpe></service></port>
<port protocol="tcp" portid="25"><state state="closed" reason="conn-refused" reason_ttl="0"/></port>
<port protocol="tcp" portid="80"><state state="open" reason="syn-ack" reason_ttl="0"/><service name="http" product="Apache httpd" version="2.4.7" method="table" conf="3"/></port>
<port protocol="tcp" portid="443"><state state="filtered" reason="no-response" reason_ttl="0"/></port>
</ports>
<times srtt="120000" rttvar="30000" to="240000"/>
</host>
<runstats><finished time="1735689610" timestr="Wed Jan  1 00:00:10 2025" elapsed="10.00" exit="success"/><hosts up="1" down="0" total="1"/></runstats>
</nmaprun>
"""

# Two hosts that are both up and share a port number, plus one that is down.
subnet_report = b"""<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -oX scan.xml 10.0.0.0/29" start="1735689600" version="7.94">
<host>
<status state="up" reason="syn-ack" reason_ttl="64"/>
<address addr="10.0.0.1" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="80"><state state="open" reason="syn-ack"/><service name="http" product="nginx" version="1.18.0" method="probed"/></port>
</ports>
</host>
<host>
<status state="up" reason="syn-ack" reason_ttl="64"/>
<address addr="10.0.0.2" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="53"><state state="open" reason="syn-ack"/></port>
<port protocol="udp" portid="53"><state state="open" reason="udp-response"/></port>
</ports>
</host>
<host>
<status state="down" reason="no-response"/>
<address addr="10.0.0.3" addrtype="ipv4"/>
</host>
</nmaprun>
"""

# A link-local host, where nmap reports a MAC address alongside the IP.
local_report = b"""<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -oX scan.xml 192.168.1.0/24" start="1735689600" version="7.94">
<host>
<status state="up" reason="arp-response"/>
<address addr="00:0C:29:AB:CD:EF" addrtype="mac" vendor="VMware"/>
<address addr="192.168.1.10" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="443"><state state="open" reason="syn-ack"/><service name="http" tunnel="ssl" product="nginx" method="probed"/></port>
</ports>
</host>
</nmaprun>
"""

# An IPv6 host.
ipv6_report = b"""<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -6 -sU -oX scan.xml" start="1735689600" version="7.94">
<host>
<status state="up" reason="syn-ack"/>
<address addr="2606:2800:220:1:248:1893:25c8:1946" addrtype="ipv6"/>
<ports>
<port protocol="udp" portid="53"><state state="open" reason="udp-response"/><service name="domain" method="table"/></port>
</ports>
</host>
</nmaprun>
"""

# The shape another tool emits: no <status>, no <hostnames>, no method, and the
# service text in a banner attribute.
converted_report = b"""<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="masscan" args="masscan --output-format xml" start="1735689600">
<host>
<address addr="192.168.1.20" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="8080"><service name="http" banner="HTTP/1.0 200 OK"/></port>
</ports>
</host>
</nmaprun>
"""


class TestBasicNmapParsing:
    """Tests for parsing a normal nmap report."""

    def test_host_becomes_an_ip(self):
        """Test that the scanned host is imported as an Ip entity."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        assert "Ip" in result.entities
        ips = result.entities["Ip"].results
        assert len(ips) == 1
        assert isinstance(ips[0].obj, Ip)
        assert ips[0].obj.address == "45.33.32.156"

    def test_every_port_element_is_imported(self):
        """Test that all four <port> elements become Port entities."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        ports = result.entities["Port"].results
        assert len(ports) == 4
        assert {port.obj.number for port in ports} == {22, 25, 80, 443}
        assert all(isinstance(port.obj, Port) for port in ports)

    def test_hostnames_become_domains(self):
        """Test that each hostname record becomes a Domain entity."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        domains = result.entities["Domain"].results
        assert {domain.obj.domain for domain in domains} == {
            "scanme.nmap.org",
            "li982-156.members.linode.com",
        }
        assert all(isinstance(domain.obj, Domain) for domain in domains)

    def test_total_entities_counts_every_entity(self):
        """Test that total_entities is 1 Ip + 2 Domains + 4 Ports."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        assert result.total_entities == 7

    def test_every_entity_has_a_node_id(self):
        """Test that entities carry a node_id, without which edges are dropped."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        for entity in result.entities.values():
            for preview in entity.results:
                assert preview.node_id


class TestPortState:
    """Tests that a port's state survives the import verbatim."""

    def test_states_are_not_flattened(self):
        """Test that open, closed and filtered are kept apart."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        states = {
            port.obj.number: port.obj.state for port in result.entities["Port"].results
        }
        assert states[22] == "open"
        assert states[80] == "open"
        assert states[443] == "filtered"
        assert states[25] == "closed"

    def test_protocol_is_read_from_the_report(self):
        """Test that a UDP result is not defaulted to TCP."""
        result = parse_nmap(ipv6_report, max_preview_rows=100)

        assert result.entities["Port"].results[0].obj.protocol == "UDP"

    def test_protocol_case_matches_the_naabu_enricher(self):
        """Test that protocol is upper case, since it is part of the node label."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        port = result.entities["Port"].results[0].obj
        assert port.protocol == "TCP"
        assert "(TCP)" in port.nodeLabel

    def test_missing_state_element_leaves_state_unset(self):
        """Test that a port with no <state> child does not get an invented one."""
        result = parse_nmap(converted_report, max_preview_rows=100)

        port = result.entities["Port"].results[0].obj
        assert port.number == 8080
        assert port.state is None

    def test_ip_protocol_scan_is_not_imported_as_ports(self):
        """Test that nmap -sO protocol numbers are not mistaken for port numbers."""
        report = scanme_report.replace(
            b'protocol="tcp" portid="22"', b'protocol="ip" portid="1"'
        )

        result = parse_nmap(report, max_preview_rows=100)

        assert {p.obj.number for p in result.entities["Port"].results} == {25, 80, 443}


class TestServiceDetection:
    """Tests for the probed/guessed distinction on service names."""

    def test_probed_service_carries_a_banner(self):
        """Test that a fingerprinted service keeps its product and version."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        ssh = next(p.obj for p in result.entities["Port"].results if p.obj.number == 22)
        assert ssh.service == "ssh"
        assert (
            ssh.banner
            == "OpenSSH 6.6.1p1 Ubuntu 2ubuntu2.13 Ubuntu Linux; protocol 2.0"
        )

    def test_guessed_service_has_no_banner(self):
        """Test that a service named from the port number is not given a banner.

        The fixture's port 80 carries a product and version alongside
        method="table", which nmap does not do, precisely so that this asserts
        the method gate rather than the absence of the fields.
        """
        result = parse_nmap(scanme_report, max_preview_rows=100)

        http = next(
            p.obj for p in result.entities["Port"].results if p.obj.number == 80
        )
        assert http.service == "http"
        assert http.banner is None

    def test_port_without_a_service_element(self):
        """Test that a port nmap could not name has no service and no banner."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        filtered = next(
            p.obj for p in result.entities["Port"].results if p.obj.number == 443
        )
        assert filtered.service is None
        assert filtered.banner is None

    def test_tls_wrapped_service_is_distinguishable(self):
        """Test that an SSL-tunnelled service does not import as cleartext."""
        result = parse_nmap(local_report, max_preview_rows=100)

        port = result.entities["Port"].results[0].obj
        assert port.service == "ssl/http"

    def test_banner_attribute_is_read_when_there_is_no_method(self):
        """Test that a converted report's banner attribute is not dropped."""
        result = parse_nmap(converted_report, max_preview_rows=100)

        assert result.entities["Port"].results[0].obj.banner == "HTTP/1.0 200 OK"

    def test_control_characters_are_stripped_from_banners(self):
        """Test that control characters do not survive into a banner.

        DEL is used because it is a control character that is also a legal XML
        1.0 character, so it survives the parser and reaches the banner.
        """
        report = scanme_report.replace(b'product="OpenSSH"', b'product="Open\x7fSSH"')

        result = parse_nmap(report, max_preview_rows=100)

        ssh = next(p.obj for p in result.entities["Port"].results if p.obj.number == 22)
        assert "\x7f" not in ssh.banner
        assert ssh.banner.startswith("OpenSSH")

    def test_service_name_is_bounded(self):
        """Test that a remote host cannot choose the length of a graph label."""
        report = scanme_report.replace(b'name="ssh"', b'name="' + b"A" * 5000 + b'"')

        result = parse_nmap(report, max_preview_rows=100)

        ssh = next(p.obj for p in result.entities["Port"].results if p.obj.number == 22)
        assert len(ssh.service) == MAX_TEXT_LENGTH

    def test_banner_is_bounded(self):
        """Test that the joined product, version and extrainfo are bounded."""
        long_value = b"B" * 400
        report = scanme_report.replace(
            b'product="OpenSSH"', b'product="' + long_value + b'"'
        )
        report = report.replace(
            b'version="6.6.1p1 Ubuntu 2ubuntu2.13"', b'version="' + long_value + b'"'
        )
        report = report.replace(
            b'extrainfo="Ubuntu Linux; protocol 2.0"',
            b'extrainfo="' + long_value + b'"',
        )

        result = parse_nmap(report, max_preview_rows=100)

        ssh = next(p.obj for p in result.entities["Port"].results if p.obj.number == 22)
        assert len(ssh.banner) == MAX_TEXT_LENGTH


class TestEdges:
    """Tests for the relationships an nmap report implies."""

    def test_every_port_is_linked_to_its_host(self):
        """Test that each Port gets a HAS_PORT edge from its host."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        has_port = [edge for edge in result.edges if edge.label == "HAS_PORT"]
        assert len(has_port) == 4
        assert all(edge.from_id == "ip:45.33.32.156" for edge in has_port)

    def test_ptr_and_user_hostnames_get_opposite_edges(self):
        """Test that a PTR record resolves backwards and a scanned name forwards."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        reverse = next(e for e in result.edges if e.label == "REVERSE_RESOLVES_TO")
        assert reverse.from_id == "ip:45.33.32.156"
        assert reverse.to_id == "domain:li982-156.members.linode.com"

        forward = next(e for e in result.edges if e.label == "RESOLVES_TO")
        assert forward.from_id == "domain:scanme.nmap.org"
        assert forward.to_id == "ip:45.33.32.156"

    def test_edges_reference_entities_that_were_imported(self):
        """Test that every edge endpoint matches an entity in the result."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        node_ids = {
            preview.node_id
            for entity in result.entities.values()
            for preview in entity.results
        }
        for edge in result.edges:
            assert edge.from_id in node_ids
            assert edge.to_id in node_ids


class TestMultipleHosts:
    """Tests for a report covering more than one host."""

    def test_the_same_port_on_two_hosts_stays_two_entities(self):
        """Test that a port is identified per host, not globally."""
        result = parse_nmap(subnet_report, max_preview_rows=100)

        node_ids = {p.node_id for p in result.entities["Port"].results}
        assert "port:10.0.0.1:TCP:80" in node_ids

        has_port = [e for e in result.edges if e.label == "HAS_PORT"]
        assert {e.from_id for e in has_port} == {"ip:10.0.0.1", "ip:10.0.0.2"}

    def test_tcp_and_udp_on_one_number_stay_separate(self):
        """Test that the protocol is part of a port's identity."""
        result = parse_nmap(subnet_report, max_preview_rows=100)

        node_ids = {p.node_id for p in result.entities["Port"].results}
        assert "port:10.0.0.2:TCP:53" in node_ids
        assert "port:10.0.0.2:UDP:53" in node_ids

    def test_each_host_keeps_its_own_port_details(self):
        """Test that one host's findings do not overwrite another's."""
        result = parse_nmap(subnet_report, max_preview_rows=100)

        by_id = {p.node_id: p.obj for p in result.entities["Port"].results}
        assert by_id["port:10.0.0.1:TCP:80"].banner == "nginx 1.18.0"
        assert by_id["port:10.0.0.2:TCP:53"].banner is None


class TestHostSelection:
    """Tests for which hosts are imported at all."""

    def test_hosts_that_are_down_are_not_imported(self):
        """Test that a host which never answered discovery is skipped."""
        result = parse_nmap(subnet_report, max_preview_rows=100)

        addresses = {ip.obj.address for ip in result.entities["Ip"].results}
        assert addresses == {"10.0.0.1", "10.0.0.2"}

    def test_host_state_unknown_is_not_treated_as_up(self):
        """Test that only an explicit up state counts as scanned."""
        report = subnet_report.replace(b'state="up"', b'state="unknown"')

        result = parse_nmap(report, max_preview_rows=100)

        assert result.total_entities == 0

    def test_host_without_a_status_element_is_imported(self):
        """Test that a report with no <status> element still imports."""
        result = parse_nmap(converted_report, max_preview_rows=100)

        assert result.entities["Ip"].results[0].obj.address == "192.168.1.20"

    def test_ipv6_address_is_imported(self):
        """Test that an IPv6 host is imported."""
        result = parse_nmap(ipv6_report, max_preview_rows=100)

        assert (
            result.entities["Ip"].results[0].obj.address
            == "2606:2800:220:1:248:1893:25c8:1946"
        )

    def test_mac_address_is_not_treated_as_the_host(self):
        """Test that a MAC listed before the IP is not read as the address."""
        result = parse_nmap(local_report, max_preview_rows=100)

        ips = result.entities["Ip"].results
        assert len(ips) == 1
        assert ips[0].obj.address == "192.168.1.10"

    def test_host_with_only_a_mac_address_is_skipped(self):
        """Test that a host with no IP address is not imported."""
        report = local_report.replace(
            b'<address addr="192.168.1.10" addrtype="ipv4"/>', b""
        )

        result = parse_nmap(report, max_preview_rows=100)

        assert result.total_entities == 0

    def test_extraports_do_not_become_entities(self):
        """Test that the <extraports> count is not expanded into nodes."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        assert len(result.entities["Port"].results) == 4
        assert all(port.obj.number != 996 for port in result.entities["Port"].results)

    def test_unparseable_hostname_is_skipped_not_fatal(self):
        """Test that a name the Domain type rejects does not fail the import."""
        report = scanme_report.replace(b'name="scanme.nmap.org"', b'name="localhost"')

        result = parse_nmap(report, max_preview_rows=100)

        domains = {d.obj.domain for d in result.entities["Domain"].results}
        assert domains == {"li982-156.members.linode.com"}
        assert len(result.entities["Ip"].results) == 1


class TestPreviewLimit:
    """Tests for max_preview_rows."""

    def test_entities_are_capped(self):
        """Test that the parser stops at the requested number of entities."""
        result = parse_nmap(scanme_report, max_preview_rows=3)

        assert result.total_entities == 3
        assert sum(len(e.results) for e in result.entities.values()) == 3

    def test_edges_never_dangle_when_capped(self):
        """Test that an edge is only emitted if both endpoints survived."""
        result = parse_nmap(scanme_report, max_preview_rows=3)

        node_ids = {
            preview.node_id
            for entity in result.entities.values()
            for preview in entity.results
        }
        for edge in result.edges:
            assert edge.from_id in node_ids
            assert edge.to_id in node_ids

    def test_a_cap_stops_later_hosts(self):
        """Test that the cap applies across hosts, not per host."""
        result = parse_nmap(subnet_report, max_preview_rows=2)

        assert result.total_entities == 2


class TestEdgeCases:
    """Tests for malformed and hostile input."""

    def test_empty_file(self):
        """Test that an empty upload is rejected with a readable message."""
        with pytest.raises(ValueError) as exc_info:
            parse_nmap(b"", max_preview_rows=100)

        assert "empty" in str(exc_info.value).lower()

    def test_whitespace_only_file(self):
        """Test that a whitespace-only upload is rejected."""
        with pytest.raises(ValueError) as exc_info:
            parse_nmap(b"   \n\t  ", max_preview_rows=100)

        assert "empty" in str(exc_info.value).lower()

    def test_invalid_xml(self):
        """Test that broken XML raises ValueError rather than crashing."""
        with pytest.raises(ValueError) as exc_info:
            parse_nmap(b"<nmaprun><host>", max_preview_rows=100)

        assert "invalid xml" in str(exc_info.value).lower()

    def test_unknown_encoding_declaration(self):
        """Test that an unknown encoding is a parse error, not a server error."""
        report = (
            b'<?xml version="1.0" encoding="NOPE"?>'
            b'<nmaprun scanner="nmap"><host/></nmaprun>'
        )

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "invalid xml" in str(exc_info.value).lower()

    def test_xml_that_is_not_an_nmap_report(self):
        """Test that a valid XML document with the wrong root is refused."""
        with pytest.raises(ValueError) as exc_info:
            parse_nmap(
                b"<?xml version='1.0'?><rss><channel/></rss>", max_preview_rows=100
            )

        assert "nmaprun" in str(exc_info.value)

    def test_report_with_no_hosts(self):
        """Test that a report containing no host has nothing to import."""
        report = b'<?xml version="1.0"?><nmaprun scanner="nmap"><runstats/></nmaprun>'

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "no <host>" in str(exc_info.value)

    def test_entity_declaration_is_refused(self):
        """Test that an entity declaration is refused, as nmap never writes one."""
        report = b"""<?xml version="1.0"?>
<!DOCTYPE nmaprun [
  <!ENTITY lol "lollollollollollollollol">
]>
<nmaprun scanner="nmap"><host><status state="up"/><address addr="1.1.1.1" addrtype="ipv4"/></host></nmaprun>"""

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "EntitiesForbidden" in str(exc_info.value)

    def test_entity_declaration_is_refused_in_utf16(self):
        """Test that the refusal does not depend on the document's encoding.

        A byte-level scan for the literal `<!ENTITY` misses a UTF-16 document,
        where the same declaration is encoded with interleaved null bytes, so
        the refusal has to happen in the parser.
        """
        report = """<?xml version="1.0" encoding="UTF-16"?>
<!DOCTYPE nmaprun [
  <!ENTITY a "AAAAAAAAAA">
  <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">
]>
<nmaprun scanner="nmap"><host><status state="up"/>
<address addr="1.1.1.1" addrtype="ipv4"/>
<ports><port protocol="tcp" portid="80"><state state="open"/>
<service name="&b;" method="probed" product="&b;"/></port></ports>
</host></nmaprun>""".encode("utf-16")

        assert b"<!ENTITY" not in report

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "EntitiesForbidden" in str(exc_info.value)

    def test_external_entity_is_refused(self):
        """Test that an entity which would read a local file is refused."""
        report = (
            b'<?xml version="1.0"?>\n'
            b'<!DOCTYPE nmaprun [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>\n'
            b'<nmaprun scanner="nmap"><host><status state="up"/>'
            b'<address addr="&xxe;" addrtype="ipv4"/></host></nmaprun>'
        )

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "refused" in str(exc_info.value).lower()

    def test_bare_doctype_is_accepted(self):
        """Test that nmap's own <!DOCTYPE nmaprun> still parses."""
        result = parse_nmap(scanme_report, max_preview_rows=100)

        assert result.total_entities == 7

    def test_oversized_file_is_refused(self):
        """Test that a very large upload is refused rather than parsed."""
        report = b"<nmaprun>" + b" " * (MAX_FILE_BYTES + 1) + b"</nmaprun>"

        with pytest.raises(ValueError) as exc_info:
            parse_nmap(report, max_preview_rows=100)

        assert "larger than" in str(exc_info.value).lower()

    def test_port_number_out_of_range_is_skipped(self):
        """Test that a port number outside 0-65535 does not fail the import."""
        report = scanme_report.replace(b'portid="80"', b'portid="99999"')

        result = parse_nmap(report, max_preview_rows=100)

        assert {p.obj.number for p in result.entities["Port"].results} == {22, 25, 443}

    def test_non_numeric_port_id_is_skipped(self):
        """Test that a non-numeric portid is skipped rather than coerced."""
        report = scanme_report.replace(b'portid="80"', b'portid="http"')

        result = parse_nmap(report, max_preview_rows=100)

        assert {p.obj.number for p in result.entities["Port"].results} == {22, 25, 443}

    def test_host_without_an_ip_address_is_skipped(self):
        """Test that a host element with no IP address is not imported."""
        report = b"""<?xml version="1.0"?>
<nmaprun scanner="nmap"><host><status state="up"/><ports>
<port protocol="tcp" portid="80"><state state="open"/></port>
</ports></host></nmaprun>"""

        result = parse_nmap(report, max_preview_rows=100)

        assert result.total_entities == 0
        assert result.edges == []


class TestIntegration:
    """Integration tests with parse_import_file."""

    def test_parse_import_file_dispatches_on_xml(self):
        """Test the full import pipeline with an nmap XML file."""
        result = parse_import_file(scanme_report, "scan.xml", max_preview_rows=100)

        assert result.total_entities == 7
        assert "Ip" in result.entities
        assert "Port" in result.entities

    def test_uppercase_extension_is_accepted(self):
        """Test that the extension is lowercased before dispatch."""
        result = parse_import_file(scanme_report, "SCAN.XML", max_preview_rows=100)

        assert result.total_entities == 7
