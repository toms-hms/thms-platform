"""GraphQL types for homes and their membership."""

import graphene
from graphene_django import DjangoObjectType

from homes.models import Home, UserHome
from homes.utils.address_utils import format_address


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
        return format_address(
            address1=self.address1,
            address2=self.address2,
            city=self.city,
            state=self.state,
            zip_code=self.zip_code,
        )


class HomeMemberType(DjangoObjectType):
    """A user's membership of a home."""

    class Meta:
        model = UserHome
        fields = ("user", "role", "created_at")
        convert_choices_to_enum = False
