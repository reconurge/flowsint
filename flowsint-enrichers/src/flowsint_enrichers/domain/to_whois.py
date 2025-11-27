from typing import List
import whois
from flowsint_core.core.enricher_base import Enricher
from flowsint_types.domain import Domain
from flowsint_types.whois import Whois
from flowsint_types.email import Email
from flowsint_types.organization import Organization
from flowsint_core.core.logger import Logger


class WhoisEnricher(Enricher):
    """Scan for WHOIS information of a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = Domain
    OutputType = Whois

    @classmethod
    def name(cls) -> str:
        return "domain_to_whois"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []
        for domain in data:
            try:
                whois_info = whois.whois(domain.domain)
                if whois_info:
                    # Extract emails from whois data
                    emails = []
                    if whois_info.emails:
                        if isinstance(whois_info.emails, list):
                            emails = [
                                Email(email=email)
                                for email in whois_info.emails
                                if email
                            ]
                        else:
                            emails = [Email(email=whois_info.emails)]

                    # Convert datetime objects to ISO format strings
                    creation_date_str = None
                    if whois_info.creation_date:
                        if isinstance(whois_info.creation_date, list):
                            creation_date_str = (
                                whois_info.creation_date[0].isoformat()
                                if whois_info.creation_date
                                else None
                            )
                        else:
                            creation_date_str = whois_info.creation_date.isoformat()

                    expiration_date_str = None
                    if whois_info.expiration_date:
                        if isinstance(whois_info.expiration_date, list):
                            expiration_date_str = (
                                whois_info.expiration_date[0].isoformat()
                                if whois_info.expiration_date
                                else None
                            )
                        else:
                            expiration_date_str = whois_info.expiration_date.isoformat()

                    # Extract registry domain ID
                    registry_domain_id = None
                    if (
                        hasattr(whois_info, "registry_domain_id")
                        and whois_info.registry_domain_id
                    ):
                        registry_domain_id = str(whois_info.registry_domain_id)
                    elif hasattr(whois_info, "domain_id") and whois_info.domain_id:
                        registry_domain_id = str(whois_info.domain_id)

                    # Create organization object if org info is available
                    organization = None
                    if whois_info.org:
                        organization = Organization(name=str(whois_info.org))

                    whois_obj = Whois(
                        domain=domain,
                        registry_domain_id=registry_domain_id,
                        registrar=(
                            str(whois_info.registrar) if whois_info.registrar else None
                        ),
                        organization=organization,
                        city=str(whois_info.city) if whois_info.city else None,
                        country=str(whois_info.country) if whois_info.country else None,
                        email=emails[0] if emails else None,
                        creation_date=creation_date_str,
                        expiration_date=expiration_date_str,
                    )
                    results.append(whois_obj)

            except Exception as e:
                Logger.error(
                    self.sketch_id,
                    {"message": f"Error getting WHOIS for domain {domain.domain}: {e}"},
                )
                continue

        return results

    def postprocess(self, results: List[OutputType], original_input: List[InputType]) -> List[OutputType]:
        for whois_obj in results:
            if not self.neo4j_conn:
                continue
            # Create domain node
            self.create_node(whois_obj.domain)
            # Create whois node (nested Pydantic objects are automatically skipped)
            self.create_node(whois_obj)
            # Create relationship between domain and whois
            self.create_relationship(whois_obj.domain, whois_obj, "HAS_WHOIS")
            # Create organization node if available
            if whois_obj.organization:
                self.create_node(whois_obj.organization)
                self.create_relationship(whois_obj.organization, whois_obj.domain, "HAS_DOMAIN")
            # Create email node if available
            if whois_obj.email:
                self.create_node(whois_obj.email)
                self.create_relationship(whois_obj, whois_obj.email, "REGISTERED_BY")
            # Log message
            self.log_graph_message(
                f"WHOIS for {whois_obj.domain.domain} -> registry_id: {whois_obj.registry_domain_id} registrar: {whois_obj.registrar} org: {whois_obj.organization.name if whois_obj.organization else None} city: {whois_obj.city} country: {whois_obj.country} creation_date: {whois_obj.creation_date} expiration_date: {whois_obj.expiration_date}"
            )

        return results
