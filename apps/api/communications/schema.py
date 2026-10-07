"""GraphQL surface for communications."""

import graphene

from communications import services
from communications.models import Communication
from communications.types import CommunicationType
from core.enums import CommunicationDirectionEnum
from core.graphql import authorize
from core.permissions import Permission
from jobs.models import Job


class UpdateCommunication(graphene.Mutation):
    """Updates the review flag or parsed summary on a message."""

    class Arguments:
        communication_id = graphene.ID(required=True)
        needs_review = graphene.Boolean()
        parsed_summary = graphene.String()

    communication = graphene.Field(CommunicationType)

    @authorize(Permission.COMMUNICATIONS_EDIT, resource=Communication, arg="communication_id")
    def mutate(self, info, communication_id: str, **data):
        """Applies the update to the message."""
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

    @authorize(Permission.COMMUNICATIONS_VIEW, resource=Job, arg="job_id")
    def resolve_communications(
        self, info, job_id: str, contractor_id=None, needs_review=None, direction=None
    ):
        """Returns the messages on a job, narrowed by the given filters."""
        return Communication.objects.list_for_job(
            job_id,
            contractor_ids=[contractor_id] if contractor_id else None,
            needs_review=needs_review,
            directions=[direction] if direction else None,
        )

    @authorize(Permission.COMMUNICATIONS_VIEW, resource=Communication, arg="communication_id")
    def resolve_communication(self, info, communication_id: str):
        """Returns one message."""
        return Communication.objects.get_or_404(pk=communication_id)


class CommunicationsMutation(graphene.ObjectType):
    """Communication writes."""

    update_communication = UpdateCommunication.Field()
