from typing import List

from flowsint_core.core.enricher_base import Enricher
from flowsint_types.domain import Domain
from flowsint_types.email import Email

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class EmailToDomainEnricher(Enricher):
    """From email to domain."""

    InputType = Email
    OutputType = Domain

    @classmethod
    def name(cls) -> str:
        return "email_to_domain"

    @classmethod
    def category(cls) -> str:
        return "Email"

    @classmethod
    def key(cls) -> str:
        return "email"

    async def scan(self, data: List[InputType]) -> List[OutputType]:
        results: List[OutputType] = []

        for email in data:
            splitted = email.email.split("@")
            domain = splitted[1]
            results.append(Domain(domain=domain))

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        for email_obj, domain_obj in zip(original_input, results):
            if not self._graph_service:
                continue
            # Create email node
            self.create_node(email_obj)
            self.create_node(domain_obj)
            # Create relationship between email and gravatar
            self.create_relationship(email_obj, domain_obj, "HAS_DOMAIN")

            self.log_graph_message(
                f"Exctracted domain for {email_obj.email} -> domain: {domain_obj.domain}"
            )

        return results


# Make types available at module level for easy access
InputType = EmailToDomainEnricher.InputType
OutputType = EmailToDomainEnricher.OutputType
