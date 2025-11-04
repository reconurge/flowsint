import os
import re
from typing import Any, List, Union, Dict, Set, Optional
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain
from flowsint_types.organization import Organization
from flowsint_types.individual import Individual
from flowsint_types.address import Location
from flowsint_core.core.logger import Logger
from flowsint_core.core.graph_db import Neo4jConnection
from tools.network.whoxy import WhoxyTool
from flowsint_core.utils import is_valid_domain, is_root_domain
from dotenv import load_dotenv

load_dotenv()


class OrgToDomainsTransform(Transform):
    """[WHOXY] Takes an organization and returns the domains it registered."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Organization]
    OutputType = List[Domain]

    def __init__(
        self,
        sketch_id: Optional[str] = None,
        scan_id: Optional[str] = None,
        neo4j_conn: Optional[Neo4jConnection] = None,
        vault=None,
        params: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            sketch_id=sketch_id,
            scan_id=scan_id,
            neo4j_conn=neo4j_conn,
            params_schema=self.get_params_schema(),
            vault=vault,
            params=params,
        )

    @classmethod
    def required_params(cls) -> bool:
        return True

    @classmethod
    def get_params_schema(cls) -> List[Dict[str, Any]]:
        """Declare required parameters for this transform"""
        return [
            {
                "name": "WHOXY_API_KEY",
                "type": "vaultSecret",
                "description": "The Whoxy API key to use for domain lookups.",
                "required": True,
            },
        ]

    @classmethod
    def name(cls) -> str:
        return "org_to_domains"

    @classmethod
    def category(cls) -> str:
        return "Organization"

    @classmethod
    def key(cls) -> str:
        return "name"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            org_obj = None
            if isinstance(item, str):
                org_obj = Organization(name=item)
            elif isinstance(item, dict) and "name" in item:
                org_obj = Organization(name=item["name"])
            elif isinstance(item, Organization):
                org_obj = item
            if org_obj:
                cleaned.append(org_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        """Find domains related to organizations using whoxy api."""
        domains: OutputType = []
        self._extracted_data = []  # Store all extracted data for postprocess
        self._extracted_individuals = []  # Store extracted individuals for testing
        self._extracted_organizations = []  # Store extracted organizations for testing
        api_key = self.get_secret("WHOXY_API_KEY", os.getenv("WHOXY_API_KEY"))

        for org in data:
            infos_data = self.__get_infos_from_whoxy(org.name, api_key)
            if infos_data and "search_result" in infos_data:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] Found {len(infos_data['search_result'])} domains for organization {org.name}"
                    },
                )

                # Process each domain result
                for result in infos_data["search_result"]:
                    if self.__is_valid_domain_result(result):
                        domain_name = result.get("domain_name")
                        if domain_name:
                            domain = Domain(domain=domain_name, root=True)
                            domains.append(domain)

                            # Store extracted data for postprocess
                            extracted_info = {
                                'org': org,
                                'domain': domain,
                                'domain_data': result,
                                'contacts': {
                                    'registrant': result.get("registrant_contact", {}),
                                    'administrative': result.get("administrative_contact", {}),
                                    'technical': result.get("technical_contact", {}),
                                    'billing': result.get("billing_contact", {})
                                }
                            }
                            self._extracted_data.append(extracted_info)

                            Logger.info(
                                self.sketch_id,
                                {
                                    "message": f"[WHOXY] Processing domain {domain_name} for organization {org.name}"
                                },
                            )

                            # Process contacts and extract individuals/organizations during scan
                            self.__process_contacts_during_scan(extracted_info)
            else:
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] No domain found for org {org.name}."},
                )
        return domains

    def __process_contacts_during_scan(self, extracted_info: Dict[str, Any]):
        """Process contacts and extract individuals and organizations during scan method."""
        org_name = extracted_info["org"].name
        domain_name = extracted_info["domain"].domain
        contacts = extracted_info["contacts"]

        for contact_type, contact in contacts.items():
            if contact:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] Processing {contact_type} contact for {domain_name}"
                    },
                )

                # Extract individual (if name is not redacted)
                individual = self.__extract_individual_from_contact(
                    contact, contact_type
                )
                if individual:
                    # Store the extracted individual for testing/debugging
                    individual_info = {
                        "individual": individual,
                        "contact_type": contact_type,
                        "domain_name": domain_name,
                        "org_name": org_name,
                        "contact_data": contact,
                    }
                    self._extracted_individuals.append(individual_info)

                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[WHOXY] Extracted individual: {individual.full_name} ({contact_type}) for {domain_name}"
                        },
                    )

                # Extract organization (if company name is not redacted)
                organization = self.__extract_organization_from_contact(
                    contact, contact_type
                )
                if organization:
                    # Store the extracted organization for testing/debugging
                    organization_info = {
                        "organization": organization,
                        "contact_type": contact_type,
                        "domain_name": domain_name,
                        "org_name": org_name,
                        "contact_data": contact,
                    }
                    self._extracted_organizations.append(organization_info)

                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[WHOXY] Extracted organization: {organization.name} ({contact_type}) for {domain_name}"
                        },
                    )

                # Extract other non-redacted information (country, email, etc.)
                self.__extract_additional_info_from_contact(contact, contact_type, domain_name, org_name)
            else:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] No contact data for {contact_type} contact for {domain_name}"
                    },
                )

    def __get_infos_from_whoxy(self, org_name: str, api_key: str) -> Dict[str, Any]:
        """Get domain information from Whoxy API or test data."""
        infos: Dict[str, Any] = {}
        whoxy = WhoxyTool()
        try:
            params = {
                "key": api_key,
                "reverse": "whois",
                "company": org_name,
            }
            infos = whoxy.launch(params=params)
        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"[WHOXY] Whoxy exception for {org_name}: {e}"},
            )
        return infos

    def __is_valid_domain_result(self, result: Dict[str, Any]) -> bool:
        """Check if a domain result is valid."""
        domain_name = result.get("domain_name")
        if not domain_name:
            return False
        # A result is valid if it has a domain name - we'll filter contacts individually later
        return True

    def __is_redacted(self, value: str) -> bool:
        """Check if a value is redacted."""
        if not value:
            return True
        return "REDACTED FOR PRIVACY" in value.upper() or "PRIVACY" in value.upper()

    def __extract_individual_from_contact(
        self, contact: Dict[str, Any], contact_type: str
    ) -> Individual:
        """Extract individual information from contact data."""
        full_name = contact.get("full_name", "")

        # Skip if name is redacted - we can't create an individual without a name
        if self.__is_redacted(full_name) or not full_name:
            Logger.info(
                self.sketch_id,
                {"message": f"[WHOXY] Skipping contact with redacted/empty name: {full_name}"},
            )
            return None

        # Parse full name into first and last name
        name_parts = full_name.strip().split()
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Extract email and phone
        email_raw = contact.get("email_address", "")
        phone = contact.get("phone_number", "")

        # Handle comma-separated emails
        emails = []
        if email_raw and not self.__is_redacted(email_raw):
            # Split by comma and clean up each email
            email_list = [e.strip() for e in email_raw.split(",")]
            for email in email_list:
                if email and self.__is_valid_email(email):
                    emails.append(email)

        # Skip if phone is redacted
        if self.__is_redacted(phone):
            phone = ""

        # Extract address information
        address = contact.get("mailing_address", "")
        city = contact.get("city_name", "")
        zip_code = contact.get("zip_code", "")
        country = contact.get("country_name", "")

        # Skip if address is redacted
        if self.__is_redacted(address):
            address = ""
        if self.__is_redacted(city):
            city = ""
        if self.__is_redacted(zip_code):
            zip_code = ""
        if self.__is_redacted(country):
            country = ""

        # Create individual object
        individual = Individual(
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email_addresses=emails if emails else None,
            phone_numbers=[phone] if phone else None,
        )

        Logger.info(
            self.sketch_id,
            {
                "message": f"[WHOXY] Extracted individual: {full_name} ({contact_type}) with {len(emails)} emails"
            },
        )

        return individual

    def __is_valid_email(self, email: str) -> bool:
        """Check if email is valid."""
        if not email:
            return False
        # Basic email validation
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    def __extract_physical_address(self, contact: Dict[str, Any]) -> Location:
        """Extract physical address from contact data."""
        address = contact.get("mailing_address", "")
        city = contact.get("city_name", "")
        zip_code = contact.get("zip_code", "")
        country = contact.get("country_name", "")

        # Skip if any part is redacted
        if any(
            self.__is_redacted(field) for field in [address, city, zip_code, country]
        ):
            return None

        if not all([address, city, zip_code, country]):
            return None

        return Location(
            address=address, city=city, zip=zip_code, country=country
        )

    def __extract_organization_from_contact(
        self, contact: Dict[str, Any], contact_type: str
    ) -> Organization:
        """Extract organization information from contact data."""
        company_name = contact.get("company_name", "")

        # Skip if company name is redacted or empty
        if not company_name or self.__is_redacted(company_name):
            return None

        # Create organization object
        organization = Organization(name=company_name)

        Logger.info(
            self.sketch_id,
            {
                "message": f"[WHOXY] Extracted organization: {company_name} ({contact_type})"
            },
        )

        return organization

    def __extract_additional_info_from_contact(
        self, contact: Dict[str, Any], contact_type: str, domain_name: str, org_name: str
    ):
        """Extract additional non-redacted information from contact data."""
        # Extract country information
        country_name = contact.get("country_name", "")
        country_code = contact.get("country_code", "")

        if country_name and not self.__is_redacted(country_name):
            Logger.info(
                self.sketch_id,
                {
                    "message": f"[WHOXY] Found country: {country_name} ({contact_type}) for {domain_name}"
                },
            )

        if country_code and not self.__is_redacted(country_code):
            Logger.info(
                self.sketch_id,
                {
                    "message": f"[WHOXY] Found country code: {country_code} ({contact_type}) for {domain_name}"
                },
            )

        # Extract email (even if individual name is redacted)
        email_raw = contact.get("email_address", "")
        if email_raw and not self.__is_redacted(email_raw):
            emails = []
            email_list = [e.strip() for e in email_raw.split(",")]
            for email in email_list:
                if email and self.__is_valid_email(email):
                    emails.append(email)

            if emails:
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] Found emails: {emails} ({contact_type}) for {domain_name}"
                    },
                )

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j nodes and relationships from extracted data."""
        if not self.neo4j_conn:
            Logger.info(
                self.sketch_id,
                {"message": "[WHOXY] No Neo4j connection, skipping postprocess"},
            )
            return results

        Logger.info(
            self.sketch_id,
            {
                "message": f"[WHOXY] Starting postprocess with {len(self._extracted_individuals)} individuals and {len(self._extracted_organizations)} organizations"
            },
        )

        # Track processed entities to avoid duplicates
        processed_domains: Set[str] = set()
        processed_individuals: Set[str] = set()
        processed_organizations: Set[str] = set()
        processed_emails: Set[str] = set()
        processed_phones: Set[str] = set()
        processed_addresses: Set[str] = set()

        # Track processed input organizations to ensure they're created
        processed_input_orgs: Set[str] = set()

        # Process extracted individuals (already filtered and extracted during scan)
        for individual_info in self._extracted_individuals:
            individual = individual_info["individual"]
            contact_type = individual_info["contact_type"]
            domain_name = individual_info["domain_name"]
            org_name = individual_info["org_name"]

            Logger.info(
                self.sketch_id,
                {
                    "message": f"[WHOXY] Processing individual: {individual.full_name} ({contact_type}) for {domain_name}"
                },
            )

            # Create organization node if not already processed
            if org_name not in processed_input_orgs:
                processed_input_orgs.add(org_name)
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] Creating organization node: {org_name}"},
                )
                self.create_node(
                    "organization",
                    "name",
                    org_name,
                    caption=org_name,
                    type="organization",
                )

            # Create domain node if not already processed
            if domain_name not in processed_domains:
                processed_domains.add(domain_name)
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] Creating domain node: {domain_name}"},
                )
                self.create_node(
                    "domain",
                    "domain",
                    domain_name,
                    label=domain_name,
                    caption=domain_name,
                    type="domain",
                )

                # Create relationship between organization and domain
                self.create_relationship(
                    "organization",
                    "name",
                    org_name,
                    "domain",
                    "domain",
                    domain_name,
                    "HAS_REGISTERED_DOMAIN",
                )

            # Create individual node if not already processed
            individual_id = (
                f"{individual.first_name}_{individual.last_name}_{individual.full_name}"
            )
            if individual_id not in processed_individuals:
                processed_individuals.add(individual_id)
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] Creating individual node: {individual.full_name}"
                    },
                )
                self.create_node(
                    "individual",
                    "full_name",
                    individual.full_name,
                    caption=individual.full_name,
                    type="individual",
                )

                # Create relationship between individual and domain
                self.create_relationship(
                    "individual",
                    "full_name",
                    individual.full_name,
                    "domain",
                    "domain",
                    domain_name,
                    f"IS_{contact_type.upper()}_CONTACT",
                )

                # Create relationship between individual and organization
                self.create_relationship(
                    "individual",
                    "full_name",
                    individual.full_name,
                    "organization",
                    "name",
                    org_name,
                    "WORKS_FOR",
                )

            # Process email addresses
            if individual.email_addresses:
                for email in individual.email_addresses:
                    if email and email not in processed_emails:
                        processed_emails.add(email)
                        Logger.info(
                            self.sketch_id,
                            {"message": f"[WHOXY] Creating email node: {email}"},
                        )
                        self.create_node(
                            "email",
                            "email",
                            email,
                            caption=email,
                            type="email",
                        )
                        self.create_relationship(
                            "individual",
                            "full_name",
                            individual.full_name,
                            "email",
                            "email",
                            email,
                            "HAS_EMAIL",
                        )

            # Process phone numbers
            if individual.phone_numbers:
                for phone in individual.phone_numbers:
                    if phone and phone not in processed_phones:
                        processed_phones.add(phone)
                        Logger.info(
                            self.sketch_id,
                            {"message": f"[WHOXY] Creating phone node: {phone}"},
                        )
                        self.create_node(
                            "phone",
                            "number",
                            phone,
                            caption=phone,
                            type="phone",
                        )
                        self.create_relationship(
                            "individual",
                            "full_name",
                            individual.full_name,
                            "phone",
                            "number",
                            phone,
                            "HAS_PHONE",
                        )

            # Process physical address from contact data
            contact_data = individual_info["contact_data"]
            address = self.__extract_physical_address(contact_data)
            if address:
                address_id = (
                    f"{address.address}_{address.city}_{address.zip}_{address.country}"
                )
                if address_id not in processed_addresses:
                    processed_addresses.add(address_id)
                    Logger.info(
                        self.sketch_id,
                        {
                            "message": f"[WHOXY] Creating address node: {address.address}"
                        },
                    )
                    self.create_node(
                        "location",
                        "address",
                        address.address,
                        caption=f"{address.address}, {address.city}",
                        type="location",
                    )
                    self.create_relationship(
                        "individual",
                        "full_name",
                        individual.full_name,
                        "location",
                        "address",
                        address.address,
                        "LIVES_AT",
                    )

            self.log_graph_message(
                f"Processed individual {individual.full_name} ({contact_type}) for domain {domain_name}"
            )

        # Process extracted organizations
        for organization_info in self._extracted_organizations:
            organization = organization_info["organization"]
            contact_type = organization_info["contact_type"]
            domain_name = organization_info["domain_name"]
            org_name = organization_info["org_name"]

            Logger.info(
                self.sketch_id,
                {
                    "message": f"[WHOXY] Processing organization: {organization.name} ({contact_type}) for {domain_name}"
                },
            )

            # Create input organization node if not already processed
            if org_name not in processed_input_orgs:
                processed_input_orgs.add(org_name)
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] Creating organization node: {org_name}"},
                )
                self.create_node(
                    "organization",
                    "name",
                    org_name,
                    caption=org_name,
                    type="organization",
                )

            # Create domain node if not already processed
            if domain_name not in processed_domains:
                processed_domains.add(domain_name)
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] Creating domain node: {domain_name}"},
                )
                self.create_node(
                    "domain",
                    "domain",
                    domain_name,
                    label=domain_name,
                    caption=domain_name,
                    type="domain",
                )

                # Create relationship between input organization and domain
                self.create_relationship(
                    "organization",
                    "name",
                    org_name,
                    "domain",
                    "domain",
                    domain_name,
                    "HAS_REGISTERED_DOMAIN",
                )

            # Create extracted organization node if not already processed
            if organization.name not in processed_organizations:
                processed_organizations.add(organization.name)
                Logger.info(
                    self.sketch_id,
                    {
                        "message": f"[WHOXY] Creating organization node: {organization.name}"
                    },
                )
                self.create_node(
                    "organization",
                    "name",
                    organization.name,
                    caption=organization.name,
                    type="organization",
                )

                # Create relationship between extracted organization and domain
                self.create_relationship(
                    "organization",
                    "name",
                    organization.name,
                    "domain",
                    "domain",
                    domain_name,
                    f"IS_{contact_type.upper()}_CONTACT",
                )

            self.log_graph_message(
                f"Processed organization {organization.name} ({contact_type}) for domain {domain_name}"
            )

        Logger.info(
            self.sketch_id,
            {
                "message": f"[WHOXY] Postprocess completed. Processed {len(processed_individuals)} individuals and {len(processed_organizations)} organizations"
            },
        )

        return results


InputType = OrgToDomainsTransform.InputType
OutputType = OrgToDomainsTransform.OutputType
