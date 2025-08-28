from pydantic import BaseModel, Field
from typing import Any, Optional, List
from .individual import Individual
from .address import Location


class Organization(BaseModel):
    """Represents an organization with detailed business and administrative information."""

    # Basic information
    name: Any = Field(..., description="Organization name", title="Organization Name")
    siren: Optional[Any] = Field(None, description="SIREN number", title="SIREN Number")
    nom_complet: Optional[Any] = Field(
        None, description="Complete name", title="Complete Name"
    )
    nom_raison_sociale: Optional[Any] = Field(
        None, description="Company name", title="Company Name"
    )
    sigle: Optional[Any] = Field(None, description="Acronym", title="Acronym")
    # Establishment information
    nombre_etablissements: Optional[int] = Field(
        None, description="Number of establishments", title="Number of Establishments"
    )
    nombre_etablissements_ouverts: Optional[int] = Field(
        None,
        description="Number of open establishments",
        title="Number of Open Establishments",
    )
    # Activity information
    activite_principale: Optional[Any] = Field(
        None, description="Main activity code", title="Main Activity Code"
    )
    section_activite_principale: Optional[Any] = Field(
        None, description="Main activity section", title="Main Activity Section"
    )
    # Company category
    categorie_entreprise: Optional[Any] = Field(
        None, description="Company category", title="Company Category"
    )
    annee_categorie_entreprise: Optional[Any] = Field(
        None, description="Year of company category", title="Company Category Year"
    )
    # Employment information
    caractere_employeur: Optional[Any] = Field(
        None, description="Employer character", title="Employer Character"
    )
    tranche_effectif_salarie: Optional[Any] = Field(
        None, description="Employee size range", title="Employee Size Range"
    )
    annee_tranche_effectif_salarie: Optional[Any] = Field(
        None,
        description="Year of employee size range",
        title="Employee Size Range Year",
    )
    # Dates
    date_creation: Optional[Any] = Field(
        None, description="Creation date", title="Creation Date"
    )
    date_fermeture: Optional[Any] = Field(
        None, description="Closing date", title="Closing Date"
    )
    date_mise_a_jour: Optional[Any] = Field(
        None, description="Update date", title="Update Date"
    )
    date_mise_a_jour_insee: Optional[Any] = Field(
        None, description="INSEE update date", title="INSEE Update Date"
    )
    date_mise_a_jour_rne: Optional[Any] = Field(
        None, description="RNE update date", title="RNE Update Date"
    )
    # Legal information
    nature_juridique: Optional[Any] = Field(
        None, description="Legal nature", title="Legal Nature"
    )
    etat_adminiAnyatif: Optional[Any] = Field(
        None, description="AdminiAnyative status", title="AdminiAnyative Status"
    )
    statut_diffusion: Optional[Any] = Field(
        None, description="Diffusion status", title="Diffusion Status"
    )
    # Siege (Headquarters) information
    siege_activite_principale: Optional[Any] = Field(
        None, description="Siege main activity code", title="Headquarters Main Activity"
    )
    siege_activite_principale_regiAnye_metier: Optional[Any] = Field(
        None,
        description="Siege main activity in trade register",
        title="Headquarters Trade Register Activity",
    )
    siege_annee_tranche_effectif_salarie: Optional[Any] = Field(
        None,
        description="Siege year of employee size range",
        title="Headquarters Employee Size Year",
    )
    siege_adresse: Optional[Any] = Field(
        None, description="Siege address", title="Headquarters Address"
    )
    siege_caractere_employeur: Optional[Any] = Field(
        None,
        description="Siege employer character",
        title="Headquarters Employer Character",
    )
    siege_cedex: Optional[Any] = Field(
        None, description="Siege CEDEX code", title="Headquarters CEDEX"
    )
    siege_code_pays_etranger: Optional[Any] = Field(
        None,
        description="Siege foreign country code",
        title="Headquarters Foreign Country Code",
    )
    siege_code_postal: Optional[Any] = Field(
        None, description="Siege postal code", title="Headquarters Postal Code"
    )
    siege_commune: Optional[Any] = Field(
        None,
        description="Siege municipality code",
        title="Headquarters Municipality Code",
    )
    siege_complement_adresse: Optional[Any] = Field(
        None,
        description="Siege address complement",
        title="Headquarters Address Complement",
    )
    siege_coordonnees: Optional[Any] = Field(
        None, description="Siege coordinates", title="Headquarters Coordinates"
    )
    siege_date_creation: Optional[Any] = Field(
        None, description="Siege creation date", title="Headquarters Creation Date"
    )
    siege_date_debut_activite: Optional[Any] = Field(
        None,
        description="Siege activity start date",
        title="Headquarters Activity Start Date",
    )
    siege_date_fermeture: Optional[Any] = Field(
        None, description="Siege closing date", title="Headquarters Closing Date"
    )
    siege_date_mise_a_jour: Optional[Any] = Field(
        None, description="Siege update date", title="Headquarters Update Date"
    )
    siege_date_mise_a_jour_insee: Optional[Any] = Field(
        None,
        description="Siege INSEE update date",
        title="Headquarters INSEE Update Date",
    )
    siege_departement: Optional[Any] = Field(
        None, description="Siege department code", title="Headquarters Department"
    )
    siege_diAnyibution_speciale: Optional[Any] = Field(
        None,
        description="Siege special diAnyibution",
        title="Headquarters Special DiAnyibution",
    )
    siege_epci: Optional[Any] = Field(
        None, description="Siege EPCI code", title="Headquarters EPCI Code"
    )
    siege_est_siege: Optional[bool] = Field(
        None, description="Siege is headquarters", title="Is Headquarters"
    )
    siege_etat_administratif: Optional[Any] = Field(
        None,
        description="Siege administratif status",
        title="Headquarters administratif Status",
    )
    siege_geo_adresse: Optional[Location] = Field(
        None,
        description="Siege geocoded address",
        title="Headquarters Geocoded Address",
    )
    siege_geo_id: Optional[Any] = Field(
        None, description="Siege geographic ID", title="Headquarters Geographic ID"
    )
    siege_indice_repetition: Optional[Any] = Field(
        None,
        description="Siege repetition index",
        title="Headquarters Repetition Index",
    )
    siege_latitude: Optional[Any] = Field(
        None, description="Siege latitude", title="Headquarters Latitude"
    )
    siege_libelle_cedex: Optional[Any] = Field(
        None, description="Siege CEDEX label", title="Headquarters CEDEX Label"
    )
    siege_libelle_commune: Optional[Any] = Field(
        None,
        description="Siege municipality label",
        title="Headquarters Municipality Label",
    )
    siege_libelle_commune_etranger: Optional[Any] = Field(
        None,
        description="Siege foreign municipality label",
        title="Headquarters Foreign Municipality Label",
    )
    siege_libelle_pays_etranger: Optional[Any] = Field(
        None,
        description="Siege foreign country label",
        title="Headquarters Foreign Country Label",
    )
    siege_libelle_voie: Optional[Any] = Field(
        None, description="Siege Anyeet label", title="Headquarters Anyeet Label"
    )
    siege_liste_enseignes: Optional[List[Any]] = Field(
        None, description="Siege list of brands", title="Headquarters Brands List"
    )
    siege_liste_finess: Optional[List[Any]] = Field(
        None, description="Siege list of FINESS", title="Headquarters FINESS List"
    )
    siege_liste_id_bio: Optional[List[Any]] = Field(
        None, description="Siege list of bio IDs", title="Headquarters Bio IDs List"
    )
    siege_liste_idcc: Optional[List[Any]] = Field(
        None, description="Siege list of IDCC", title="Headquarters IDCC List"
    )
    siege_liste_id_organisme_formation: Optional[List[Any]] = Field(
        None,
        description="Siege list of training organization IDs",
        title="Headquarters Training Organization IDs",
    )
    siege_liste_rge: Optional[List[Any]] = Field(
        None, description="Siege list of RGE", title="Headquarters RGE List"
    )
    siege_liste_uai: Optional[List[Any]] = Field(
        None, description="Siege list of UAI", title="Headquarters UAI List"
    )
    siege_longitude: Optional[Any] = Field(
        None, description="Siege longitude", title="Headquarters Longitude"
    )
    siege_nom_commercial: Optional[Any] = Field(
        None, description="Siege commercial name", title="Headquarters Commercial Name"
    )
    siege_numero_voie: Optional[Any] = Field(
        None, description="Siege Anyeet number", title="Headquarters Anyeet Number"
    )
    siege_region: Optional[Any] = Field(
        None, description="Siege region code", title="Headquarters Region"
    )
    siege_siret: Optional[Any] = Field(
        None, description="Siege SIRET number", title="Headquarters SIRET"
    )
    siege_statut_diffusion_etablissement: Optional[Any] = Field(
        None,
        description="Siege establishment diffusion status",
        title="Headquarters Establishment Diffusion Status",
    )
    siege_tranche_effectif_salarie: Optional[Any] = Field(
        None,
        description="Siege employee size range",
        title="Headquarters Employee Size Range",
    )
    siege_type_voie: Optional[Any] = Field(
        None, description="Siege Anyeet type", title="Headquarters Anyeet Type"
    )
    # Dirigeants (Leaders) - using Individual type
    dirigeants: Optional[List[Individual]] = Field(
        None, description="List of leaders", title="Leaders"
    )
    # Matching establishments
    matching_etablissements: Optional[List[dict]] = Field(
        None, description="Matching establishments", title="Matching Establishments"
    )
    # Financial information
    finances: Optional[dict] = Field(
        None, description="Financial information", title="Financial Information"
    )
    # Complements (Additional information)
    complements_collectivite_territoriale: Optional[Any] = Field(
        None,
        description="Complements territorial community",
        title="Territorial Community",
    )
    complements_convention_collective_renseignee: Optional[bool] = Field(
        None,
        description="Complements collective agreement informed",
        title="Collective Agreement Informed",
    )
    complements_liste_idcc: Optional[List[Any]] = Field(
        None, description="Complements list of IDCC", title="IDCC List"
    )
    complements_egapro_renseignee: Optional[bool] = Field(
        None, description="Complements Egapro informed", title="Egapro Informed"
    )
    complements_est_achats_responsables: Optional[bool] = Field(
        None,
        description="Complements is responsible purchases",
        title="Is Responsible Purchases",
    )
    complements_est_alim_confiance: Optional[bool] = Field(
        None, description="Complements is food trust", title="Is Food Trust"
    )
    complements_est_association: Optional[bool] = Field(
        None, description="Complements is association", title="Is Association"
    )
    complements_est_bio: Optional[bool] = Field(
        None, description="Complements is bio", title="Is Bio"
    )
    complements_est_entrepreneur_individuel: Optional[bool] = Field(
        None,
        description="Complements is individual entrepreneur",
        title="Is Individual Entrepreneur",
    )
    complements_est_entrepreneur_spectacle: Optional[bool] = Field(
        None,
        description="Complements is show entrepreneur",
        title="Is Show Entrepreneur",
    )
    complements_est_ess: Optional[bool] = Field(
        None, description="Complements is ESS", title="Is ESS"
    )
    complements_est_finess: Optional[bool] = Field(
        None, description="Complements is FINESS", title="Is FINESS"
    )
    complements_est_organisme_formation: Optional[bool] = Field(
        None,
        description="Complements is training organization",
        title="Is Training Organization",
    )
    complements_est_qualiopi: Optional[bool] = Field(
        None, description="Complements is Qualiopi", title="Is Qualiopi"
    )
    complements_liste_id_organisme_formation: Optional[List[Any]] = Field(
        None,
        description="Complements list of training organization IDs",
        title="Training Organization IDs",
    )
    complements_est_rge: Optional[bool] = Field(
        None, description="Complements is RGE", title="Is RGE"
    )
    complements_est_service_public: Optional[bool] = Field(
        None, description="Complements is public service", title="Is Public Service"
    )
    complements_est_l100_3: Optional[bool] = Field(
        None, description="Complements is L100-3", title="Is L100-3"
    )
    complements_est_siae: Optional[bool] = Field(
        None, description="Complements is SIAE", title="Is SIAE"
    )
    complements_est_societe_mission: Optional[bool] = Field(
        None, description="Complements is mission company", title="Is Mission Company"
    )
    complements_est_uai: Optional[bool] = Field(
        None, description="Complements is UAI", title="Is UAI"
    )
    complements_est_patrimoine_vivant: Optional[bool] = Field(
        None, description="Complements is living heritage", title="Is Living Heritage"
    )
    complements_bilan_ges_renseigne: Optional[bool] = Field(
        None,
        description="Complements GES balance informed",
        title="GES Balance Informed",
    )
    complements_identifiant_association: Optional[Any] = Field(
        None,
        description="Complements association identifier",
        title="Association Identifier",
    )
    complements_statut_entrepreneur_spectacle: Optional[Any] = Field(
        None,
        description="Complements show entrepreneur status",
        title="Show Entrepreneur Status",
    )
    complements_type_siae: Optional[Any] = Field(
        None, description="Complements SIAE type", title="SIAE Type"
    )
