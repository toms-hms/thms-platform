"""GraphQL reads for the user's contractor rolodex."""

import graphene

from core.graphql import current_user, login_required
from user_contractors.models import UserContractor
from user_contractors.types import UserContractorType


class UserContractorsQuery(graphene.ObjectType):
    """Rolodex reads."""

    user_contractors = graphene.List(
        graphene.NonNull(UserContractorType), required=True, description="The caller's saved contractors."
    )

    @login_required
    def resolve_user_contractors(self, info):
        """Returns the caller's rolodex entries."""
        return UserContractor.objects.list_owned_by(current_user(info))
