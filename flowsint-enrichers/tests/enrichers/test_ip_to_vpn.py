from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.ip.to_vpn import IpToVpn


def test_ip_to_vpn_is_registered() -> None:
    enricher = ENRICHER_REGISTRY.get_enricher("ip_to_vpn", "123", "123")
    assert enricher.name() == "ip_to_vpn"


def test_ip_to_vpn_metadata() -> None:
    assert IpToVpn.category() == "Ip"
    assert IpToVpn.key() == "address"
    assert IpToVpn.input_schema()["type"] == "Ip"
    assert IpToVpn.output_schema()["type"] == "RiskProfile"
    assert not any(p["required"] for p in IpToVpn.get_params_schema())


# Answers below are trimmed from live api.vpndetection.io lookups.
def test_risk_factors_free_plan_vpn() -> None:
    answer = {"is_vpn": True, "is_tor": False, "is_relay": False}
    assert IpToVpn._risk_factors(answer) == ["VPN"]


def test_risk_factors_names_the_relay_provider() -> None:
    answer = {
        "is_vpn": False,
        "is_tor": False,
        "is_relay": True,
        "relay": {
            "provider": "apple_private_relay",
            "provider_name": "Apple iCloud Private Relay",
        },
    }
    assert IpToVpn._risk_factors(answer) == [
        "Privacy relay: Apple iCloud Private Relay"
    ]


def test_risk_factors_tor_with_empty_provider() -> None:
    answer = {"is_tor": True, "tor": {"provider": "", "provider_name": ""}}
    assert IpToVpn._risk_factors(answer) == ["Tor"]


def test_risk_factors_paid_plan_flags() -> None:
    answer = {
        "is_vpn": True,
        "vpn": {"provider": "nordvpn", "provider_name": "NordVPN"},
        "is_dcproxy": True,
        "is_hosting": True,
        "is_resproxy": False,
        "is_bot": True,
    }
    assert IpToVpn._risk_factors(answer) == [
        "VPN: NordVPN",
        "Datacenter proxy",
        "Hosting",
        "Bot",
    ]


def test_risk_factors_clean_address() -> None:
    answer = {"is_vpn": False, "is_tor": False, "is_relay": False}
    assert IpToVpn._risk_factors(answer) == []
