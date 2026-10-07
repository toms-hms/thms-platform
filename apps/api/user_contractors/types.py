"""GraphQL types for the user's contractor rolodex."""

import graphene
from graphene_django import DjangoObjectType

from contractors.types import ContractorType
from user_contractors.models import UserContractor


class UserContractorType(DjangoObjectType):
    """A contractor saved to a user's rolodex, with the contractor attached."""

    contractor = graphene.Field(ContractorType, required=True)

    class Meta:
        model = UserContractor
        fields = ("id", "note", "created_at", "updated_at")
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the saved contractor."""
        return self.contractor
