from typing import List

from flowsint_core.core.enricher_base import Enricher
from flowsint_types.email import Email
from flowsint_types.username import Username

from flowsint_enrichers.registry import flowsint_enricher


@flowsint_enricher
class EmailToUsernameEnricher(Enricher):
    """From email to username."""

    InputType = Email
    OutputType = Username

    @classmethod
    def name(cls) -> str:
        return "email_to_username"

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
            username = splitted[0]
            results.append(Username(value=username))

        return results

    def postprocess(
        self, results: List[OutputType], original_input: List[InputType]
    ) -> List[OutputType]:
        for email_obj, username_obj in zip(original_input, results):
            if not self.neo4j_conn:
                continue
            # Create email node
            self.create_node(email_obj)
            self.create_node(username_obj)
            # Create relationship between email and gravatar
            self.create_relationship(email_obj, username_obj, "HAS_USERNAME")

            self.log_graph_message(
                f"Exctracted username for {email_obj.email} -> username: {username_obj.value}"
            )

        return results


# Make types available at module level for easy access
InputType = EmailToUsernameEnricher.InputType
OutputType = EmailToUsernameEnricher.OutputType
