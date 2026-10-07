"""GraphQL types for homes and their membership."""

import graphene
from graphene_django import DjangoObjectType

from accounts.types import UserType
from homes.models import Home, UserHome


class HomeType(DjangoObjectType):
    """A property the user is a member of."""

    full_address = graphene.String(required=True, description="The address rendered as one display line.")

    class Meta:
        model = Home
        fields = (
            "id",
            "name",
            "address1",
            "address2",
            "city",
            "state",
            "zip_code",
            "country",
            "notes",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_full_address(self, info) -> str:
        """Returns the home's single-line address."""
        return self.full_address


class HomeMemberType(DjangoObjectType):
    """A user's membership of a home."""

    class Meta:
        model = UserHome
        fields = ("role", "created_at")
        convert_choices_to_enum = False

    user = graphene.Field(UserType, required=True)

    def resolve_user(self, info):
        """Returns the member's user record."""
        return self.user
