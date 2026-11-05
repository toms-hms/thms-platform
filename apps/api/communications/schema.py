"""GraphQL surface for communications."""

import graphene

from communications.models import Communication
from communications.services.communication_service import CommunicationService
from communications.types import CommunicationType
from core.enums import CommunicationDirectionEnum
from core.graphql import authorize, current_user, login_required
from core.services.permission_service import Permission


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
        return UpdateCommunication(
            communication=CommunicationService().update(communication_id=communication_id, **data)
        )


class CommunicationsQuery(graphene.ObjectType):
    """Communication reads."""

    communications = graphene.List(
        graphene.NonNull(CommunicationType),
        job_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        contractor_ids=graphene.List(graphene.NonNull(graphene.ID)),
        needs_review=graphene.Boolean(),
        directions=graphene.List(graphene.NonNull(CommunicationDirectionEnum)),
        required=True,
    )
    communication = graphene.Field(CommunicationType, communication_id=graphene.ID(required=True))

    @login_required
    def resolve_communications(
        self, info, job_ids: list[str], contractor_ids=None, needs_review=None, directions=None
    ):
        """Returns the messages on the jobs the caller can see, narrowed by the given filters."""
        return (
            Communication.objects.filter_communications(
                job_ids=job_ids,
                contractor_ids=contractor_ids,
                needs_review=needs_review,
                directions=directions,
            )
            .select_related("contractor")
            .visible_to(current_user(info), Permission.COMMUNICATIONS_VIEW)
        )

    @authorize(Permission.COMMUNICATIONS_VIEW, resource=Communication, arg="communication_id")
    def resolve_communication(self, info, communication_id: str):
        """Returns one message."""
        return Communication.objects.get_or_404(pk=communication_id)


class CommunicationsMutation(graphene.ObjectType):
    """Communication writes."""

    update_communication = UpdateCommunication.Field()
