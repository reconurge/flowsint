import pytest
from tools.organizations.brasilapi import is_valid_cnpj, normalize_cnpj

from flowsint_enrichers import ENRICHER_REGISTRY
from flowsint_enrichers.organization.to_infos_br import OrgToInfosBrEnricher
from flowsint_types.organization import Organization

VALID_CNPJ = "11.222.333/0001-81"


# ---------------------------------------------------------------------------
# Registry wiring
# ---------------------------------------------------------------------------
def test_org_to_infos_br_is_registered():
    enricher = ENRICHER_REGISTRY.get_enricher("org_to_infos_br", "123", "123")
    assert enricher.name() == "org_to_infos_br"


def test_org_to_infos_br_metadata():
    assert OrgToInfosBrEnricher.category() == "Organization"
    assert OrgToInfosBrEnricher.key() == "cnpj"
    assert OrgToInfosBrEnricher.input_schema()["type"] == "Organization"
    assert OrgToInfosBrEnricher.output_schema()["type"] == "Organization"


# ---------------------------------------------------------------------------
# CNPJ validation (offline, no network required)
# ---------------------------------------------------------------------------
def test_normalize_cnpj_strips_punctuation():
    assert normalize_cnpj("11.222.333/0001-81") == "11222333000181"


def test_is_valid_cnpj_accepts_known_good_number():
    assert is_valid_cnpj(VALID_CNPJ) is True


def test_is_valid_cnpj_rejects_wrong_check_digits():
    assert is_valid_cnpj("11.222.333/0001-00") is False


def test_is_valid_cnpj_rejects_repeated_digits():
    assert is_valid_cnpj("11.111.111/1111-11") is False


def test_is_valid_cnpj_rejects_wrong_length():
    assert is_valid_cnpj("123") is False


# ---------------------------------------------------------------------------
# scan() - BrasilApiTool mocked, no network touched
# ---------------------------------------------------------------------------
class _FakeBrasilApi:
    def __init__(self, mapping):
        self._mapping = mapping
        self.calls = []

    def launch(self, cnpj):
        self.calls.append(cnpj)
        digits = normalize_cnpj(cnpj)
        if digits not in self._mapping:
            raise ValueError(f"No company found for CNPJ {digits}.")
        return self._mapping[digits]


COMPANY_PAYLOAD = {
    "cnpj": "11222333000181",
    "razao_social": "Acme Consultoria Ltda",
    "nome_fantasia": "Acme",
    "natureza_juridica": "Sociedade Empresaria Limitada",
    "porte": "DEMAIS",
    "cnae_fiscal": 6201501,
    "cnae_fiscal_descricao": "Desenvolvimento de programas de computador sob encomenda",
    "data_inicio_atividade": "2010-05-03",
    "descricao_situacao_cadastral": "ATIVA",
    "descricao_tipo_de_logradouro": "Rua",
    "logradouro": "das Flores",
    "numero": "100",
    "municipio": "SAO PAULO",
    "uf": "SP",
    "cep": "01310100",
    "capital_social": 100000,
    "opcao_pelo_simples": True,
    "opcao_pelo_mei": False,
    "qsa": [{"nome_socio": "Maria Silva"}, {"nome_socio": "Joao Souza"}],
}


@pytest.mark.asyncio
async def test_scan_returns_organization_enriched_from_brasilapi(monkeypatch):
    fake = _FakeBrasilApi({"11222333000181": COMPANY_PAYLOAD})
    monkeypatch.setattr(
        "flowsint_enrichers.organization.to_infos_br.BrasilApiTool", lambda: fake
    )

    enricher = OrgToInfosBrEnricher(sketch_id="s", scan_id="t", graph_service=None)
    results = await enricher.scan([Organization(name=VALID_CNPJ)])

    assert len(results) == 1
    org = results[0]
    assert org.name == "Acme Consultoria Ltda"
    assert org.cnpj == "11222333000181"
    assert org.siege_libelle_commune == "SAO PAULO"
    assert org.siege_region == "SP"
    assert org.siege_geo_adresse.city == "SAO PAULO"
    assert org.siege_geo_adresse.country == "BR"
    assert {d.full_name for d in org.dirigeants} == {"Maria Silva", "Joao Souza"}
    assert fake.calls == [VALID_CNPJ]


@pytest.mark.asyncio
async def test_scan_prefers_existing_cnpj_field_over_name(monkeypatch):
    fake = _FakeBrasilApi({"11222333000181": COMPANY_PAYLOAD})
    monkeypatch.setattr(
        "flowsint_enrichers.organization.to_infos_br.BrasilApiTool", lambda: fake
    )

    enricher = OrgToInfosBrEnricher(sketch_id="s", scan_id="t", graph_service=None)
    org_in = Organization(name="Acme Consultoria Ltda")
    org_in.cnpj = VALID_CNPJ

    await enricher.scan([org_in])
    assert fake.calls == [VALID_CNPJ]


@pytest.mark.asyncio
async def test_scan_skips_unmatched_cnpj(monkeypatch):
    fake = _FakeBrasilApi({})
    monkeypatch.setattr(
        "flowsint_enrichers.organization.to_infos_br.BrasilApiTool", lambda: fake
    )

    enricher = OrgToInfosBrEnricher(sketch_id="s", scan_id="t", graph_service=None)
    results = await enricher.scan([Organization(name=VALID_CNPJ)])
    assert results == []
