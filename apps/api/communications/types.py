"""GraphQL types for communications."""

import graphene
from graphene_django import DjangoObjectType

from communications.models import Communication
from contractors.types import ContractorType


class CommunicationType(DjangoObjectType):
    """One message sent to, or received from, a contractor."""

    contractor = graphene.Field(ContractorType)
    job_id = graphene.ID()
    contractor_id = graphene.ID()

    class Meta:
        model = Communication
        fields = (
            "id",
            "job",
            "channel",
            "direction",
            "subject",
            "body_text",
            "body_html",
            "external_thread_id",
            "external_message_id",
            "sent_at",
            "received_at",
            "parsed_summary",
            "needs_review",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the contractor the message was exchanged with, when there is one."""
        return self.contractor

    def resolve_job_id(self, info) -> str | None:
        """Returns the id of the job this message is about, when there is one."""
        return self.job_id

    def resolve_contractor_id(self, info) -> str | None:
        """Returns the id of the contractor, without requiring a nested selection."""
        return self.contractor_id
