from typing import Dict, List, Optional

from tools.organizations.brasilapi import BrasilApiTool

from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_enrichers.registry import flowsint_enricher
from flowsint_types.address import Location
from flowsint_types.individual import Individual
from flowsint_types.organization import Organization


@flowsint_enricher
class OrgToInfosBrEnricher(Enricher):
    """Enrich Organization with data from BrasilAPI (Brazil CNPJ registry)."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Organization
    OutputType = Organization

    @classmethod
    def name(cls) -> str:
        return "org_to_infos_br"

    @classmethod
    def category(cls) -> str:
        return "Organization"

    @classmethod
    def key(cls) -> str:
        return "cnpj"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for org in data:
            # The CNPJ may already be set on the node, or the node may have
            # been created directly from a raw CNPJ string typed as its name.
            candidate = org.cnpj or org.name
            try:
                brasilapi = BrasilApiTool()
                company = brasilapi.launch(str(candidate))
                enriched_org = self.enrich_org(company)
                if enriched_org is not None:
                    results.append(enriched_org)
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error enriching organization {candidate}: {e}"},
                )
        return results

    def enrich_org(self, company: Dict) -> Optional[Organization]:
        try:
            name = company.get("razao_social")
            if not name:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Organization has no valid name: {company}"},
                )
                return None

            # Sócios (partners/directors) as Individual nodes
            dirigeants = []
            for socio in company.get("qsa") or []:
                full_name = socio.get("nome_socio")
                if full_name:
                    dirigeants.append(Individual(full_name=full_name))

            address = " ".join(
                part
                for part in (
                    company.get("descricao_tipo_de_logradouro"),
                    company.get("logradouro"),
                    company.get("numero"),
                )
                if part
            )

            siege_geo_adresse = None
            if address or company.get("municipio") or company.get("cep"):
                siege_geo_adresse = Location(
                    address=address or "",
                    city=company.get("municipio") or "",
                    country="BR",
                    zip=company.get("cep") or "",
                )

            return Organization(
                name=name,
                cnpj=company.get("cnpj"),
                nom_raison_sociale=company.get("razao_social"),
                nom_complet=company.get("nome_fantasia") or name,
                nature_juridique=company.get("natureza_juridica"),
                categorie_entreprise=company.get("porte"),
                activite_principale=company.get("cnae_fiscal_descricao"),
                section_activite_principale=company.get("cnae_fiscal"),
                date_creation=company.get("data_inicio_atividade"),
                etat_administratif=company.get("descricao_situacao_cadastral"),
                siege_adresse=address or None,
                siege_code_postal=company.get("cep"),
                siege_libelle_commune=company.get("municipio"),
                siege_region=company.get("uf"),
                siege_geo_adresse=siege_geo_adresse,
                dirigeants=dirigeants if dirigeants else None,
                finances={
                    "capital_social": company.get("capital_social"),
                    "opcao_pelo_simples": company.get("opcao_pelo_simples"),
                    "opcao_pelo_mei": company.get("opcao_pelo_mei"),
                },
            )
        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"Error enriching organization: {e}"}
            )
            return None

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        if not self._graph_service:
            return results

        for org in results:
            self.create_node(org)

            if org.cnpj:
                self.log_graph_message(f"{org.name}: CNPJ {org.cnpj}")

            if org.dirigeants:
                for dirigeant in org.dirigeants:
                    self.create_node(dirigeant)
                    self.create_relationship(org, dirigeant, "HAS_LEADER")
                    self.log_graph_message(
                        f"{org.name}: HAS_LEADER -> {dirigeant.full_name}"
                    )

            if org.siege_geo_adresse:
                self.create_node(org.siege_geo_adresse)
                self.create_relationship(org, org.siege_geo_adresse, "HAS_ADDRESS")
                self.log_graph_message(
                    f"{org.name}: HAS_ADDRESS -> {org.siege_geo_adresse.address}, {org.siege_geo_adresse.city}"
                )

            if org.nature_juridique:
                self.log_graph_message(
                    f"{org.name}: HAS_LEGAL_NATURE -> {org.nature_juridique}"
                )

        return results


# Make types available at module level for easy access
InputType = OrgToInfosBrEnricher.InputType
OutputType = OrgToInfosBrEnricher.OutputType
