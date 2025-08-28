import os
import re
from typing import Any, List, Union, Dict, Set
from flowsint_core.core.scanner_base import Scanner
from flowsint_types.domain import Domain
from flowsint_types.organization import Organization
from flowsint_types.individual import Individual
from flowsint_types.email import Email
from flowsint_types.phone import Phone
from flowsint_types.address import Location
from flowsint_core.core.logger import Logger
from tools.network.whoxy import WhoxyTool
from dotenv import load_dotenv

load_dotenv()

WHOXY_API_KEY = os.getenv("WHOXY_API_KEY")


class OrgToDomainsScanner(Scanner):
    """[WHOXY] Takes an organization and returns the domains it registered."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Organization]
    OutputType = List[Domain]

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

        for org in data:
            infos_data = self.__get_infos_from_whoxy(org.name)
            if infos_data and "search_result" in infos_data:
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
            else:
                Logger.info(
                    self.sketch_id,
                    {"message": f"[WHOXY] No domain found for org {org.name}."},
                )
        return domains

    def __get_infos_from_whoxy(self, org_name: str) -> Dict[str, Any]:
        infos: Dict[str, Any] = {}
        whoxy = WhoxyTool()
        try:
            params = {
                "key": WHOXY_API_KEY,
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
        return True

    def __extract_individual_from_contact(
        self, contact: Dict[str, Any], contact_type: str
    ) -> Individual:
        """Extract individual information from contact data."""
        full_name = contact.get("full_name", "")

        # Skip if name is redacted
        if "REDACTED" in full_name or "REDACTED FOR PRIVACY" in full_name:
            return None

        # Parse full name into first and last name
        name_parts = full_name.strip().split()
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Extract email and phone
        email = contact.get("email_address", "")
        phone = contact.get("phone_number", "")

        # Skip if email is redacted or invalid
        if (
            "REDACTED" in email
            or "REDACTED FOR PRIVACY" in email
            or not self.__is_valid_email(email)
        ):
            email = ""

        # Skip if phone is redacted
        if "REDACTED" in phone or "REDACTED FOR PRIVACY" in phone:
            phone = ""

        # Extract address information
        address = contact.get("mailing_address", "")
        city = contact.get("city_name", "")
        zip_code = contact.get("zip_code", "")
        country = contact.get("country_name", "")

        # Skip if address is redacted
        if "REDACTED" in address or "REDACTED FOR PRIVACY" in address:
            address = ""
        if "REDACTED" in city or "REDACTED FOR PRIVACY" in city:
            city = ""
        if "REDACTED" in zip_code or "REDACTED FOR PRIVACY" in zip_code:
            zip_code = ""
        if "REDACTED" in country or "REDACTED FOR PRIVACY" in country:
            country = ""

        # Create individual object
        individual = Individual(
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email_addresses=[email] if email else None,
            phone_numbers=[phone] if phone else None,
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
        if any("REDACTED" in field for field in [address, city, zip_code, country]):
            return None

        if not all([address, city, zip_code, country]):
            return None

        return Location(
            address=address, city=city, zip=zip_code, country=country
        )

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        """Create Neo4j nodes and relationships from extracted data."""
        if not self.neo4j_conn:
            return results

        # Track processed entities to avoid duplicates
        processed_domains: Set[str] = set()
        processed_individuals: Set[str] = set()
        processed_emails: Set[str] = set()
        processed_phones: Set[str] = set()
        processed_addresses: Set[str] = set()

        for extracted_info in self._extracted_data:
            org = extracted_info['org']
            domain = extracted_info['domain']
            domain_data = extracted_info['domain_data']
            contacts = extracted_info['contacts']

            domain_name = domain.domain
            if domain_name in processed_domains:
                continue
            processed_domains.add(domain_name)

            # Create organization node
            self.create_node(
                "organization",
                "name",
                org.name,
                caption=org.name,
                type="organization",
            )

            # Create domain node
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
                org.name,
                "domain",
                "domain",
                domain_name,
                "HAS_REGISTERED_DOMAIN",
            )

            # Process all contact types
            for contact_type, contact in contacts.items():
                if contact:
                    self.__process_contact(
                        contact,
                        contact_type.upper(),
                        domain_name,
                        org.name,
                        processed_individuals,
                        processed_emails,
                        processed_phones,
                        processed_addresses,
                    )

            self.log_graph_message(
                f"Processed domain {domain_name} for organization {org.name}"
            )

        return results

    def __process_contact(
        self,
        contact: Dict[str, Any],
        contact_type: str,
        domain_name: str,
        org_name: str,
        processed_individuals: Set[str],
        processed_emails: Set[str],
        processed_phones: Set[str],
        processed_addresses: Set[str],
    ):
        """Process a contact and create all related entities and relationships."""

        # Extract individual
        individual = self.__extract_individual_from_contact(contact, contact_type)
        if not individual:
            return

        individual_id = (
            f"{individual.first_name}_{individual.last_name}_{individual.full_name}"
        )
        if individual_id in processed_individuals:
            return

        processed_individuals.add(individual_id)

        # Create individual node
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
            f"IS_{contact_type}_CONTACT",
        )

        # Create relationship between individual and organization
        self.create_relationship(
            "individual",
            "full_name",
            individual.full_name,
            "organization",
            "name",
            org_name,
            f"WORKS_FOR",
        )

        # Process email addresses
        if individual.email_addresses:
            for email in individual.email_addresses:
                if email and email not in processed_emails:
                    processed_emails.add(email)

                    # Create email node
                    self.create_node(
                        "email",
                        "email",
                        email,
                        caption=email,
                        type="email",
                    )

                    # Create relationship between individual and email
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

                    # Create phone node
                    self.create_node(
                        "phone",
                        "number",
                        phone,
                        caption=phone,
                        type="phone",
                    )

                    # Create relationship between individual and phone
                    self.create_relationship(
                        "individual",
                        "full_name",
                        individual.full_name,
                        "phone",
                        "number",
                        phone,
                        "HAS_PHONE",
                    )

        # Process physical address
        address = self.__extract_physical_address(contact)
        if address:
            address_id = (
                f"{address.address}_{address.city}_{address.zip}_{address.country}"
            )
            if address_id not in processed_addresses:
                processed_addresses.add(address_id)

                # Create address node
                self.create_node(
                    "location",
                    "address",
                    address.address,
                    caption=f"{address.address}, {address.city}",
                    type="location",
                )

                # Create relationship between individual and address
                self.create_relationship(
                    "individual",
                    "full_name",
                    individual.full_name,
                    "location",
                    "address",
                    address.address,
                    "LIVES_AT",
                )


InputType = OrgToDomainsScanner.InputType
OutputType = OrgToDomainsScanner.OutputType
