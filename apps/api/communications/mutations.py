"""GraphQL writes for communications."""

import graphene

from communications.models import Communication
from communications.services.communication_service import CommunicationService
from communications.types import CommunicationType
from core.graphql import authorize
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


class CommunicationsMutation(graphene.ObjectType):
    """Communication writes."""

    update_communication = UpdateCommunication.Field()
