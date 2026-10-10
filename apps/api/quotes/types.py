"""GraphQL types for quotes."""

import graphene
from graphene_django import DjangoObjectType

from contractors.types import ContractorType
from quotes.models import Quote


class QuoteType(DjangoObjectType):
    """A price a contractor gave for a job."""

    contractor = graphene.Field(ContractorType, required=True)
    job_id = graphene.ID(required=True)
    contractor_id = graphene.ID(required=True)
    source_communication_id = graphene.ID()

    class Meta:
        model = Quote
        fields = (
            "id",
            "job",
            "amount",
            "description",
            "status",
            "source_communication",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the contractor who gave the quote."""
        return self.contractor

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job this quote is against."""
        return self.job_id

    def resolve_contractor_id(self, info) -> str:
        """Returns the id of the quoting contractor, without requiring a nested selection."""
        return self.contractor_id

    def resolve_source_communication_id(self, info) -> str | None:
        """Returns the id of the message this quote was read from, when there is one."""
        return self.source_communication_id
