import os
import re
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv
from flowsint_core.core.enricher_base import Enricher
from flowsint_core.core.logger import Logger
from flowsint_types.address import Location
from flowsint_types.domain import Domain
from flowsint_types.email import Email
from flowsint_types.individual import Individual
from flowsint_types.organization import Organization
from flowsint_types.whois import Whois

from flowsint_enrichers.registry import flowsint_enricher
from tools.network.whoisxml import WhoisXmlTool

load_dotenv()


@flowsint_enricher
class DomainToWhoisHistoryEnricher(Enricher):
    """[WHOISXML] Takes a domain and returns WHOIS history records (registrants, registrars, organizations, contacts)."""

    InputType = Domain
    OutputType = Whois

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this enricher"""
        return [
            {
                "name": "WHOISXML_API_KEY",
                "type": "vaultSecret",
                "description": "The WhoisXML API key for WHOIS history lookups.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "domain_to_whois_history"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        """Fetch WHOIS history records for domains using WhoisXML API."""
        results: List[OutputType] = []
        self._extracted_data = []
        api_key = self.get_secret("WHOISXML_API_KEY", os.getenv("WHOISXML_API_KEY"))

        for domain in data:
            try:
                api_data = self.__fetch_whois_history(domain.domain, api_key)
                if not api_data or "records" not in api_data:
                    Logger.info(
                        self.sketch_id,
                        {"message": f"[WHOISXML] No WHOIS history found for {domain.domain}."},
                    )
                    continue

                records = api_data["records"]
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOISXML] Found {len(records)} WHOIS history records for {domain.domain}"},
                )

                for record in records:
                    domain_name = record.get("domainName")
                    if not domain_name:
                        continue

                    registrant = record.get("registrantContact") or {}
                    # Skip trimmed/demo entries
                    if isinstance(registrant, str):
                        registrant = {}

                    # Extract organization
                    org_name = registrant.get("organization")
                    organization = Organization(name=org_name) if org_name else None

                    # Extract registrant email
                    email_str = registrant.get("email")
                    email = Email(email=email_str) if email_str and self.__is_valid_email(email_str) else None

                    domain_obj = Domain(domain=domain_name)

                    whois_obj = Whois(
                        domain=domain_obj,
                        registrar=record.get("registrarName"),
                        organization=organization,
                        city=registrant.get("city"),
                        country=registrant.get("country"),
                        email=email,
                        creation_date=record.get("createdDateISO8601"),
                        expiration_date=record.get("expiresDateISO8601"),
                    )
                    results.append(whois_obj)

                    # Store extracted data for postprocess
                    self._extracted_data.append({
                        "whois": whois_obj,
                        "original_domain": domain,
                        "record": record,
                        "contacts": {
                            "registrant": registrant,
                            "administrative": record.get("administrativeContact") or {},
                            "technical": record.get("technicalContact") or {},
                            "billing": record.get("billingContact") or {},
                        },
                    })

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"[WHOISXML] Error fetching WHOIS history for {domain.domain}: {e}"},
                )
                continue

        return results

    def __fetch_whois_history(self, domain: str, api_key: str) -> Dict[str, Any]:
        """Fetch WHOIS history from WhoisXML API."""
        tool = WhoisXmlTool()
        try:
            return tool.launch(params={
                "apiKey": api_key,
                "domainName": domain,
            })
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"[WHOISXML] API exception for {domain}: {e}"},
            )
            return {}

    def __is_redacted(self, value: str) -> bool:
        """Check if a value is redacted or privacy-protected."""
        if not value:
            return True
        upper = value.upper()
        return "REDACTED" in upper or "PRIVACY" in upper or "ANONYMISED" in upper

    def __is_valid_email(self, email: str) -> bool:
        if not email:
            return False
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    def __extract_individual(self, contact: Dict[str, Any]) -> Optional[Individual]:
        """Extract an Individual from a contact block if name is not redacted."""
        name = contact.get("name", "")
        if not name or self.__is_redacted(name):
            return None

        parts = name.strip().split()
        first_name = parts[0] if parts else "N/A"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "N/A"

        email_str = contact.get("email", "")
        emails = []
        if email_str and not self.__is_redacted(email_str):
            for e in email_str.split(","):
                e = e.strip()
                if e and self.__is_valid_email(e):
                    emails.append(e)

        phone_str = contact.get("telephone", "")
        phones = []
        if phone_str and not self.__is_redacted(phone_str):
            phones.append(phone_str)

        return Individual(
            first_name=first_name,
            last_name=last_name,
            full_name=name,
            email_addresses=emails if emails else None,
            phone_numbers=phones if phones else None,
        )

    def __extract_location(self, contact: Dict[str, Any]) -> Optional[Location]:
        """Extract a Location from a contact block."""
        street = contact.get("street", "")
        city = contact.get("city")
        state = contact.get("state", "")
        postal_code = contact.get("postalCode", "")
        country = contact.get("country", "")

        if any(self.__is_redacted(f) for f in [street, city or "", country]):
            return None

        if not city and not country:
            return None

        return Location(
            address=street or None,
            city=city or None,
            zip=postal_code or None,
            country=country or None,
        )

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        """Create Neo4j nodes and relationships from extracted WHOIS history data."""
        if not self._graph_service:
            return results

        processed_domains: Set[str] = set()
        processed_individuals: Set[str] = set()
        processed_organizations: Set[str] = set()
        processed_emails: Set[str] = set()
        processed_locations: Set[str] = set()

        for entry in self._extracted_data:
            whois_obj: Whois = entry["whois"]
            original_domain: Domain = entry["original_domain"]
            contacts = entry["contacts"]
            domain_name = whois_obj.domain.domain

            # Create domain node
            if domain_name not in processed_domains:
                processed_domains.add(domain_name)
                self.create_node(whois_obj.domain)
                if domain_name != original_domain.domain:
                    self.create_relationship(
                        original_domain, whois_obj.domain, "HAS_RELATED_DOMAIN"
                    )

            # Create whois node and link to domain
            self.create_node(whois_obj)
            self.create_relationship(whois_obj.domain, whois_obj, "HAS_WHOIS")

            # Create organization node if available
            if whois_obj.organization and whois_obj.organization.name not in processed_organizations:
                processed_organizations.add(whois_obj.organization.name)
                self.create_node(whois_obj.organization)
                self.create_relationship(
                    whois_obj.organization, whois_obj.domain, "HAS_DOMAIN"
                )

            # Create email node if available
            if whois_obj.email and whois_obj.email.email not in processed_emails:
                processed_emails.add(whois_obj.email.email)
                self.create_node(whois_obj.email)
                self.create_relationship(whois_obj, whois_obj.email, "REGISTERED_BY")

            # Process each contact type for individuals and locations
            for contact_type, contact in contacts.items():
                if not contact or isinstance(contact, str):
                    continue

                # Extract individual
                individual = self.__extract_individual(contact)
                if individual:
                    ind_id = f"{individual.first_name}_{individual.last_name}"
                    if ind_id not in processed_individuals:
                        processed_individuals.add(ind_id)
                        self.create_node(individual)
                        self.create_relationship(
                            individual, whois_obj.domain, f"IS_{contact_type.upper()}_CONTACT"
                        )

                    # Individual emails
                    if individual.email_addresses:
                        for email_obj in individual.email_addresses:
                            if email_obj.email and email_obj.email not in processed_emails:
                                processed_emails.add(email_obj.email)
                                self.create_node(email_obj)
                                self.create_relationship(individual, email_obj, "HAS_EMAIL")

                # Extract location
                location = self.__extract_location(contact)
                if location:
                    loc_id = f"{location.address}_{location.city}_{location.country}"
                    if loc_id not in processed_locations:
                        processed_locations.add(loc_id)
                        self.create_node(location)
                        self.create_relationship(whois_obj.domain, location, "REGISTERED_IN")

            self.log_graph_message(
                f"WHOIS history for {domain_name} -> registrar: {whois_obj.registrar} "
                f"org: {whois_obj.organization.name if whois_obj.organization else 'N/A'} "
                f"created: {whois_obj.creation_date} expires: {whois_obj.expiration_date}"
            )

        return results


InputType = DomainToWhoisHistoryEnricher.InputType
OutputType = DomainToWhoisHistoryEnricher.OutputType
