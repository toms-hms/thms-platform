"""GraphQL types for the user's contractor rolodex."""

from graphene_django import DjangoObjectType

from user_contractors.models import UserContractor


class UserContractorType(DjangoObjectType):
    """A contractor saved to a user's rolodex, with the contractor attached."""

    class Meta:
        model = UserContractor
        fields = ("id", "contractor", "note", "created_at", "updated_at")
        convert_choices_to_enum = False
