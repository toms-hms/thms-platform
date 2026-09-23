"""GraphQL surface for communications."""

import graphene
from graphene_django import DjangoObjectType

from communications import services
from communications.models import Communication
from contractors.schema import ContractorType
from core import permissions
from core.enums import CommunicationDirectionEnum
from core.graphql import current_user, login_required
from jobs.models import Job


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


class UpdateCommunication(graphene.Mutation):
    """Updates the review flag or parsed summary on a message."""

    class Arguments:
        communication_id = graphene.ID(required=True)
        needs_review = graphene.Boolean()
        parsed_summary = graphene.String()

    communication = graphene.Field(CommunicationType)

    @login_required
    def mutate(self, info, communication_id: str, **data):
        """Applies the update after checking the caller's access to the message."""
        permissions.require(Communication.objects, current_user(info).pk, communication_id)
        return UpdateCommunication(communication=services.update_communication(communication_id, data))


class CommunicationsQuery(graphene.ObjectType):
    """Communication reads."""

    communications = graphene.List(
        graphene.NonNull(CommunicationType),
        job_id=graphene.ID(required=True),
        contractor_id=graphene.ID(),
        needs_review=graphene.Boolean(),
        direction=CommunicationDirectionEnum(),
        required=True,
    )
    communication = graphene.Field(CommunicationType, communication_id=graphene.ID(required=True))

    @login_required
    def resolve_communications(
        self, info, job_id: str, contractor_id=None, needs_review=None, direction=None
    ):
        """Returns the messages on a job the caller can access, narrowed by the given filters."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return Communication.objects.list_for_job(
            job_id, contractor_id=contractor_id, needs_review=needs_review, direction=direction
        )

    @login_required
    def resolve_communication(self, info, communication_id: str):
        """Returns one message after checking the caller's access."""
        permissions.require(Communication.objects, current_user(info).pk, communication_id)
        return Communication.objects.get_or_404(pk=communication_id)


class CommunicationsMutation(graphene.ObjectType):
    """Communication writes."""

    update_communication = UpdateCommunication.Field()
