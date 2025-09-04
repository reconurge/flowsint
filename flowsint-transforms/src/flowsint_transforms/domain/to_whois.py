from typing import List, Union
import whois
from flowsint_core.utils import is_valid_domain
from flowsint_core.core.transform_base import Transform
from flowsint_types.domain import Domain, Domain
from flowsint_types.whois import Whois
from flowsint_types.email import Email
from flowsint_core.core.logger import Logger
from datetime import datetime


class WhoisTransform(Transform):
    """Scan for WHOIS information of a domain."""

    # Define types as class attributes - base class handles schema generation automatically
    InputType = List[Domain]
    OutputType = List[Whois]

    @classmethod
    def name(cls) -> str:
        return "domain_to_whois"

    @classmethod
    def category(cls) -> str:
        return "Domain"

    @classmethod
    def key(cls) -> str:
        return "domain"

    def preprocess(self, data: Union[List[str], List[dict], InputType]) -> InputType:
        cleaned: InputType = []
        for item in data:
            domain_obj = None
            if isinstance(item, str):
                if is_valid_domain(item):
                    domain_obj = Domain(domain=item)
            elif isinstance(item, dict) and "domain" in item:
                if is_valid_domain(item["domain"]):
                    domain_obj = Domain(domain=item["domain"])
            elif isinstance(item, Domain):
                domain_obj = item
            if domain_obj:
                cleaned.append(domain_obj)
        return cleaned

    async def scan(self, data: InputType) -> OutputType:
        results: OutputType = []
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

                    whois_obj = Whois(
                        domain=domain.domain,
                        registrar=(
                            str(whois_info.registrar) if whois_info.registrar else None
                        ),
                        org=str(whois_info.org) if whois_info.org else None,
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

    def postprocess(self, results: OutputType, original_input: InputType) -> OutputType:
        for whois_obj in results:
            if not self.neo4j_conn:
                continue

            # Create domain node
            self.create_node("domain", "domain", whois_obj.domain, **whois_obj.__dict__)

            # Create whois node
            whois_key = f"{whois_obj.domain}_{self.sketch_id}"
            whois_label = f"Whois-{whois_obj.domain}"
            # Creating unique label
            date_format = "%Y-%m-%dT%H:%M:%S"
            try:
                year = datetime.strptime(whois_obj.creation_date, date_format).year
                whois_label = f"{whois_label}-{year}"
            except Exception:
                continue
            self.create_node(
                "whois",
                "whois_id",
                whois_key,
                domain=whois_obj.domain,
                registrar=whois_obj.registrar,
                org=whois_obj.org,
                city=whois_obj.city,
                country=whois_obj.country,
                creation_date=whois_obj.creation_date,
                expiration_date=whois_obj.expiration_date,
                email=whois_obj.email.email if whois_obj.email else None,
                label=whois_label,
                type="whois",
            )

            # Create relationship between domain and whois
            self.create_relationship(
                "domain",
                "domain",
                whois_obj.domain,
                "whois",
                "whois_id",
                whois_key,
                "HAS_WHOIS",
            )

            # Create organization node if org information is available
            if whois_obj.org:
                self.create_node(
                    "organization",
                    "name",
                    whois_obj.org,
                    country=whois_obj.country,
                    founding_date=whois_obj.creation_date,
                    description=f"Organization from WHOIS data for {whois_obj.domain}",
                    caption=whois_obj.org,
                    type="organization",
                )

                # Create relationship between organization and domain
                self.create_relationship(
                    "organization",
                    "name",
                    whois_obj.org,
                    "domain",
                    "domain",
                    whois_obj.domain,
                    "HAS_DOMAIN",
                )

                self.log_graph_message(
                    f"{whois_obj.domain} -> {whois_obj.org} (organization)"
                )

            if whois_obj.email:
                self.create_node(
                    "email", "email", whois_obj.email.email, **whois_obj.email.__dict__
                )
                self.create_relationship(
                    "whois",
                    "whois_id",
                    whois_key,
                    "email",
                    "email",
                    whois_obj.email.email,
                    "REGISTERED_BY",
                )

            self.log_graph_message(
                f"WHOIS for {whois_obj.domain} -> registrar: {whois_obj.registrar} org: {whois_obj.org} city: {whois_obj.city} country: {whois_obj.country} creation_date: {whois_obj.creation_date} expiration_date: {whois_obj.expiration_date}"
            )

        return results


# Make types available at module level for easy access
InputType = WhoisTransform.InputType
OutputType = WhoisTransform.OutputType
