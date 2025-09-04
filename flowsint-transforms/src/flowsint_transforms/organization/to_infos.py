from typing import List, Dict, Any, Union
from flowsint_core.core.transform_base import Transform
from flowsint_types.organization import Organization
from flowsint_core.core.logger import Logger
from tools.organizations.sirene import SireneTool


class OrgToInfosTransform(Transform):
    """Enrich Organization with data from SIRENE (France only)."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Organization]
    OutputType = List[Organization]

    @classmethod
    def name(cls) -> str:
        return "org_to_infos"

    @classmethod
    def category(cls) -> str:
        return "Organization"

    @classmethod
    def key(cls) -> str:
        return "name"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        if not isinstance(data, list):
            raise ValueError(f"Expected list input, got {type(data).__name__}")
        cleaned: InputType = []
        for item in data:
            if isinstance(item, str) and item != "":
                cleaned.append(Organization(name=item))
            elif isinstance(item, dict) and "name" in item and item["name"] != "":
                cleaned.append(Organization(**item))
            elif isinstance(item, Organization):
                cleaned.append(item)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:

        results: OutputType = []
        for org in data:
            try:
                sirene = SireneTool()
                raw_orgs = sirene.launch(org.name, limit=25)
                if len(raw_orgs) > 0:
                    for org_dict in raw_orgs:
                        enriched_org = self.enrich_org(org_dict)
                        if enriched_org is not None:
                            results.append(enriched_org)
            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error enriching organization {org.name}: {e}"},
                )
        return results

    def enrich_org(self, company: Dict) -> Organization:
        try:
            # Extract siege data
            siege = company.get("siege", {})
            # Create Location for siege_geo_adresse if coordinates exist
            siege_geo_adresse = None
            if siege.get("latitude") and siege.get("longitude"):
                from flowsint_types.address import Location

                siege_geo_adresse = Location(
                    address=siege.get("adresse", ""),
                    city=siege.get("libelle_commune", ""),
                    country="FR",  # SIRENE is French registry
                    zip=siege.get("code_postal", ""),
                    latitude=float(siege.get("latitude", 0)),
                    longitude=float(siege.get("longitude", 0)),
                )

            # Extract dirigeants and convert to Individual objects
            dirigeants = []
            for dirigeant_data in company.get("dirigeants", []):
                from flowsint_types.individual import Individual

                dirigeant = Individual(
                    first_name=dirigeant_data.get("prenoms", ""),
                    last_name=dirigeant_data.get("nom", ""),
                    full_name=f"{dirigeant_data.get('prenoms', '')} {dirigeant_data.get('nom', '')}".strip(),
                    birth_date=dirigeant_data.get("date_de_naissance"),
                    gender=None,  # Not available in SIRENE data
                )
                dirigeants.append(dirigeant)

            name = company.get("nom_raison_sociale") or company.get("nom_complet")

            # Ensure we have a valid name
            if not name:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Organization has no valid name: {company}"},
                )
                return None

            return Organization(
                # Basic information
                name=name,
                siren=company.get("siren"),
                nom_complet=company.get("nom_complet"),
                nom_raison_sociale=company.get("nom_raison_sociale"),
                sigle=company.get("sigle"),
                # Establishment information
                nombre_etablissements=company.get("nombre_etablissements"),
                nombre_etablissements_ouverts=company.get(
                    "nombre_etablissements_ouverts"
                ),
                # Activity information
                activite_principale=company.get("activite_principale"),
                section_activite_principale=company.get("section_activite_principale"),
                # Company category
                categorie_entreprise=company.get("categorie_entreprise"),
                annee_categorie_entreprise=company.get("annee_categorie_entreprise"),
                # Employment information
                caractere_employeur=company.get("caractere_employeur"),
                tranche_effectif_salarie=company.get("tranche_effectif_salarie"),
                annee_tranche_effectif_salarie=company.get(
                    "annee_tranche_effectif_salarie"
                ),
                # Dates
                date_creation=company.get("date_creation"),
                date_fermeture=company.get("date_fermeture"),
                date_mise_a_jour=company.get("date_mise_a_jour"),
                date_mise_a_jour_insee=company.get("date_mise_a_jour_insee"),
                date_mise_a_jour_rne=company.get("date_mise_a_jour_rne"),
                # Legal information
                nature_juridique=company.get("nature_juridique"),
                statut_diffusion=company.get("statut_diffusion"),
                # Siege (Headquarters) information
                siege_activite_principale=siege.get("activite_principale"),
                siege_activite_principale_registre_metier=siege.get(
                    "activite_principale_registre_metier"
                ),
                siege_annee_tranche_effectif_salarie=siege.get(
                    "annee_tranche_effectif_salarie"
                ),
                siege_adresse=siege.get("adresse"),
                siege_caractere_employeur=siege.get("caractere_employeur"),
                siege_cedex=siege.get("cedex"),
                siege_code_pays_etranger=siege.get("code_pays_etranger"),
                siege_code_postal=siege.get("code_postal"),
                siege_commune=siege.get("commune"),
                siege_complement_adresse=siege.get("complement_adresse"),
                siege_coordonnees=siege.get("coordonnees"),
                siege_date_creation=siege.get("date_creation"),
                siege_date_debut_activite=siege.get("date_debut_activite"),
                siege_date_fermeture=siege.get("date_fermeture"),
                siege_date_mise_a_jour=siege.get("date_mise_a_jour"),
                siege_date_mise_a_jour_insee=siege.get("date_mise_a_jour_insee"),
                siege_departement=siege.get("departement"),
                siege_distribution_speciale=siege.get("distribution_speciale"),
                siege_epci=siege.get("epci"),
                siege_est_siege=siege.get("est_siege"),
                siege_etat_administratif=siege.get("etat_administratif"),
                siege_geo_adresse=siege_geo_adresse,
                siege_geo_id=siege.get("geo_id"),
                siege_indice_repetition=siege.get("indice_repetition"),
                siege_latitude=siege.get("latitude"),
                siege_libelle_cedex=siege.get("libelle_cedex"),
                siege_libelle_commune=siege.get("libelle_commune"),
                siege_libelle_commune_etranger=siege.get("libelle_commune_etranger"),
                siege_libelle_pays_etranger=siege.get("libelle_pays_etranger"),
                siege_libelle_voie=siege.get("libelle_voie"),
                siege_liste_enseignes=siege.get("liste_enseignes"),
                siege_liste_finess=siege.get("liste_finess"),
                siege_liste_id_bio=siege.get("liste_id_bio"),
                siege_liste_idcc=siege.get("liste_idcc"),
                siege_liste_id_organisme_formation=siege.get(
                    "liste_id_organisme_formation"
                ),
                siege_liste_rge=siege.get("liste_rge"),
                siege_liste_uai=siege.get("liste_uai"),
                siege_longitude=siege.get("longitude"),
                siege_nom_commercial=siege.get("nom_commercial"),
                siege_numero_voie=siege.get("numero_voie"),
                siege_region=siege.get("region"),
                siege_siret=siege.get("siret"),
                siege_statut_diffusion_etablissement=siege.get(
                    "statut_diffusion_etablissement"
                ),
                siege_tranche_effectif_salarie=siege.get("tranche_effectif_salarie"),
                siege_type_voie=siege.get("type_voie"),
                # Dirigeants (Leaders)
                dirigeants=dirigeants if dirigeants else None,
                # Matching establishments
                matching_etablissements=company.get("matching_etablissements"),
                # Financial information
                finances=company.get("finances"),
                # Complements (Additional information)
                complements_collectivite_territoriale=company.get(
                    "complements", {}
                ).get("collectivite_territoriale"),
                complements_convention_collective_renseignee=company.get(
                    "complements", {}
                ).get("convention_collective_renseignee"),
                complements_liste_idcc=company.get("complements", {}).get("liste_idcc"),
                complements_egapro_renseignee=company.get("complements", {}).get(
                    "egapro_renseignee"
                ),
                complements_est_achats_responsables=company.get("complements", {}).get(
                    "est_achats_responsables"
                ),
                complements_est_alim_confiance=company.get("complements", {}).get(
                    "est_alim_confiance"
                ),
                complements_est_association=company.get("complements", {}).get(
                    "est_association"
                ),
                complements_est_bio=company.get("complements", {}).get("est_bio"),
                complements_est_entrepreneur_individuel=company.get(
                    "complements", {}
                ).get("est_entrepreneur_individuel"),
                complements_est_entrepreneur_spectacle=company.get(
                    "complements", {}
                ).get("est_entrepreneur_spectacle"),
                complements_est_ess=company.get("complements", {}).get("est_ess"),
                complements_est_finess=company.get("complements", {}).get("est_finess"),
                complements_est_organisme_formation=company.get("complements", {}).get(
                    "est_organisme_formation"
                ),
                complements_est_qualiopi=company.get("complements", {}).get(
                    "est_qualiopi"
                ),
                complements_liste_id_organisme_formation=company.get(
                    "complements", {}
                ).get("liste_id_organisme_formation"),
                complements_est_rge=company.get("complements", {}).get("est_rge"),
                complements_est_service_public=company.get("complements", {}).get(
                    "est_service_public"
                ),
                complements_est_l100_3=company.get("complements", {}).get("est_l100_3"),
                complements_est_siae=company.get("complements", {}).get("est_siae"),
                complements_est_societe_mission=company.get("complements", {}).get(
                    "est_societe_mission"
                ),
                complements_est_uai=company.get("complements", {}).get("est_uai"),
                complements_est_patrimoine_vivant=company.get("complements", {}).get(
                    "est_patrimoine_vivant"
                ),
                complements_bilan_ges_renseigne=company.get("complements", {}).get(
                    "bilan_ges_renseigne"
                ),
                complements_identifiant_association=company.get("complements", {}).get(
                    "identifiant_association"
                ),
                complements_statut_entrepreneur_spectacle=company.get(
                    "complements", {}
                ).get("statut_entrepreneur_spectacle"),
                complements_type_siae=company.get("complements", {}).get("type_siae"),
            )
        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"Error enriching organization: {e}"}
            )
            return None

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        if not self.neo4j_conn:
            return results

        for org in results:
            # Create or update the organization node with all SIRENE properties
            org_key = f"{org.name}_FR"
            self.create_node(
                "Organization",
                "org_id",
                org_key,
                name=org.name,
                country="FR",
                siren=org.siren,
                siege_siret=org.siege_siret,
                nom_complet=org.nom_complet,
                nom_raison_sociale=org.nom_raison_sociale,
                sigle=org.sigle,
                nombre_etablissements=org.nombre_etablissements,
                nombre_etablissements_ouverts=org.nombre_etablissements_ouverts,
                activite_principale=org.activite_principale,
                section_activite_principale=org.section_activite_principale,
                categorie_entreprise=org.categorie_entreprise,
                annee_categorie_entreprise=org.annee_categorie_entreprise,
                caractere_employeur=org.caractere_employeur,
                tranche_effectif_salarie=org.tranche_effectif_salarie,
                annee_tranche_effectif_salarie=org.annee_tranche_effectif_salarie,
                date_creation=org.date_creation,
                date_fermeture=org.date_fermeture,
                date_mise_a_jour=org.date_mise_a_jour,
                date_mise_a_jour_insee=org.date_mise_a_jour_insee,
                date_mise_a_jour_rne=org.date_mise_a_jour_rne,
                nature_juridique=org.nature_juridique,
                statut_diffusion=org.statut_diffusion,
                type="organization",
            )

            if org.siren:
                self.log_graph_message(f"{org.name}: SIREN {org.siren} -> {org.name}")

            # Add SIRET as identifier if available
            if org.siege_siret:
                self.log_graph_message(
                    f"{org.name}: SIRET {org.siege_siret} -> {org.name}"
                )

            # Add dirigeants (leaders) as Individual nodes with relationships
            if org.dirigeants:
                for dirigeant in org.dirigeants:
                    self.create_node(
                        "individual",
                        "full_name",
                        dirigeant.full_name,
                        first_name=dirigeant.first_name,
                        last_name=dirigeant.last_name,
                        birth_date=dirigeant.birth_date,
                        gender=dirigeant.gender,
                        caption=dirigeant.full_name,
                        type="individual",
                    )

                    self.create_relationship(
                        "organization",
                        "org_id",
                        org_key,
                        "Individual",
                        "full_name",
                        dirigeant.full_name,
                        "HAS_LEADER",
                    )
                    self.log_graph_message(
                        f"{org.name}: HAS_LEADER -> {dirigeant.full_name}"
                    )

            # Add siege address as Location node if available
            if org.siege_geo_adresse:
                address = org.siege_geo_adresse
                address_key = f"{address.address}_{address.city}_{address.country}"
                self.create_node(
                    "location",
                    "address_id",
                    address_key,
                    address=address.address,
                    city=address.city,
                    country=address.country,
                    zip=address.zip,
                    latitude=address.latitude,
                    longitude=address.longitude,
                    label=f"{address.address}, {address.city}",
                    caption=f"{address.address}, {address.city}",
                    type="location",
                )

                self.create_relationship(
                    "organization",
                    "org_id",
                    org_key,
                    "location",
                    "address_id",
                    address_key,
                    "HAS_ADDRESS",
                )
                self.log_graph_message(
                    f"{org.name}: HAS_ADDRESS -> {address.address}, {address.city}"
                )

            # Add siege location as Location node if coordinates are available but no location
            elif org.siege_latitude and org.siege_longitude:
                location_key = f"{org.siege_latitude}_{org.siege_longitude}"
                self.create_node(
                    "location",
                    "location_id",
                    location_key,
                    latitude=float(org.siege_latitude),
                    longitude=float(org.siege_longitude),
                    address=org.siege_adresse,
                    city=org.siege_libelle_commune,
                    country="FR",
                    zip=org.siege_code_postal,
                    label=f"{org.siege_adresse or 'Unknown'}, {org.siege_libelle_commune or 'Unknown'}",
                    caption=f"{org.siege_adresse or 'Unknown'}, {org.siege_libelle_commune or 'Unknown'}",
                    type="location",
                )

                self.create_relationship(
                    "organization",
                    "org_id",
                    org_key,
                    "Location",
                    "location_id",
                    location_key,
                    "LOCATED_AT",
                )
                self.log_graph_message(
                    f"{org.name}: LOCATED_AT -> {org.siege_libelle_commune or 'Unknown'}"
                )

            # Add activity codes as Activity nodes
            if org.activite_principale:
                self.log_graph_message(
                    f"{org.name}: HAS_ACTIVITY -> {org.activite_principale}"
                )

            # Add legal nature as LegalNature node
            if org.nature_juridique:
                self.log_graph_message(
                    f"{org.name}: HAS_LEGAL_NATURE -> {org.nature_juridique}"
                )

        return results


# Make types available at module level for easy access
InputType = OrgToInfosTransform.InputType
OutputType = OrgToInfosTransform.OutputType
