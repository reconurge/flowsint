"""Tests for the nmap XML importer."""

import pytest

from flowsint_core.imports.file_parser import parse_import_file
from flowsint_core.imports.nmap.parse_nmap import parse_nmap_xml
from flowsint_types import Ip, Port

# A representative nmap -oX report: one host up with two open ports, one host down.
NMAP_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -oX">
  <host>
    <status state="up" reason="syn-ack"/>
    <address addr="93.184.216.34" addrtype="ipv4"/>
    <address addr="00:11:22:33:44:55" addrtype="mac"/>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open" reason="syn-ack"/>
        <service name="http" product="nginx" version="1.18.0" extrainfo="Ubuntu"/>
      </port>
      <port protocol="tcp" portid="443">
        <state state="open"/>
        <service name="https"/>
      </port>
    </ports>
  </host>
  <host>
    <status state="down" reason="no-response"/>
    <address addr="10.0.0.1" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh"/>
      </port>
    </ports>
  </host>
</nmaprun>"""


def test_parses_ip_and_ports():
    result = parse_nmap_xml(NMAP_XML, max_preview_rows=100)

    assert "Ip" in result.entities
    assert "Port" in result.entities

    ips = [p.obj for p in result.entities["Ip"].results]
    assert [ip.address for ip in ips] == ["93.184.216.34"]
    assert all(isinstance(ip, Ip) for ip in ips)

    ports = {p.obj.number: p.obj for p in result.entities["Port"].results}
    assert set(ports) == {80, 443}
    assert all(isinstance(p, Port) for p in ports.values())


def test_port_fields_and_banner():
    result = parse_nmap_xml(NMAP_XML, max_preview_rows=100)
    ports = {p.obj.number: p.obj for p in result.entities["Port"].results}

    http = ports[80]
    assert http.protocol == "TCP"
    assert http.state == "open"
    assert http.service == "http"
    assert http.banner == "nginx 1.18.0 Ubuntu"

    https = ports[443]
    assert https.service == "https"
    assert https.banner is None  # no product/version -> no banner


def test_has_port_edges_link_ip_to_ports():
    result = parse_nmap_xml(NMAP_XML, max_preview_rows=100)

    assert len(result.edges) == 2
    assert all(edge.label == "HAS_PORT" for edge in result.edges)
    assert all(edge.from_id == "ip-93.184.216.34" for edge in result.edges)
    assert {edge.to_id for edge in result.edges} == {
        "port-93.184.216.34-80-TCP",
        "port-93.184.216.34-443-TCP",
    }


def test_down_host_is_skipped():
    result = parse_nmap_xml(NMAP_XML, max_preview_rows=100)
    ip_addresses = [p.obj.address for p in result.entities["Ip"].results]
    assert "10.0.0.1" not in ip_addresses  # the down host is excluded


def test_total_entities_count():
    result = parse_nmap_xml(NMAP_XML, max_preview_rows=100)
    assert result.total_entities == 3  # 1 IP + 2 ports


def test_ipv6_host():
    xml = b"""<nmaprun>
      <host>
        <status state="up"/>
        <address addr="2606:2800:220:1:248:1893:25c8:1946" addrtype="ipv6"/>
        <ports><port protocol="tcp" portid="443"><state state="open"/></port></ports>
      </host>
    </nmaprun>"""
    result = parse_nmap_xml(xml, max_preview_rows=100)
    ips = [p.obj.address for p in result.entities["Ip"].results]
    assert ips == ["2606:2800:220:1:248:1893:25c8:1946"]


def test_invalid_port_number_is_skipped():
    xml = b"""<nmaprun>
      <host>
        <status state="up"/>
        <address addr="1.2.3.4" addrtype="ipv4"/>
        <ports>
          <port protocol="tcp" portid="not-a-number"><state state="open"/></port>
          <port protocol="tcp" portid="22"><state state="open"/></port>
        </ports>
      </host>
    </nmaprun>"""
    result = parse_nmap_xml(xml, max_preview_rows=100)
    ports = [p.obj.number for p in result.entities["Port"].results]
    assert ports == [22]


def test_empty_scan_returns_no_entities():
    xml = b"""<nmaprun></nmaprun>"""
    result = parse_nmap_xml(xml, max_preview_rows=100)
    assert result.entities == {}
    assert result.edges == []
    assert result.total_entities == 0


def test_invalid_xml_raises_value_error():
    with pytest.raises(ValueError):
        parse_nmap_xml(b"<nmaprun><host>", max_preview_rows=100)


def test_xml_dispatched_via_file_parser():
    """.xml files route to the nmap parser through the shared dispatcher."""
    result = parse_import_file(NMAP_XML, "scan.xml")
    assert result is not None
    assert "Ip" in result.entities
    assert isinstance(result.entities["Ip"].results[0].obj, Ip)
