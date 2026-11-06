"""GraphQL reads for accounts: `me`."""

import graphene

from accounts.types import UserType
from core.graphql import current_user, login_required


class AccountsQuery(graphene.ObjectType):
    """Account reads."""

    me = graphene.Field(UserType, description="The authenticated user.")

    @login_required
    def resolve_me(self, info):
        """Returns the authenticated user's own record."""
        return current_user(info)
