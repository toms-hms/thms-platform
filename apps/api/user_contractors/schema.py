"""GraphQL surface for the user's contractor rolodex."""

import graphene
from graphene_django import DjangoObjectType

from contractors.schema import ContractorType
from core import permissions
from core.enums import TradeCategoryEnum
from core.graphql import current_user, login_required
from user_contractors import services
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


class CreateUserContractor(graphene.Mutation):
    """Saves a contractor to the caller's rolodex.

    Either reference an existing contractor with contractorId, or supply `name`
    (and optionally the other fields) to create a private contractor in place.
    """

    class Arguments:
        contractor_id = graphene.ID()
        note = graphene.String()
        name = graphene.String()
        company_name = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        zip_codes = graphene.List(graphene.NonNull(graphene.String))
        notes = graphene.String()

    user_contractor = graphene.Field(UserContractorType)

    @login_required
    def mutate(self, info, **data):
        """Adds the contractor to the caller's rolodex."""
        entry = services.create_user_contractor(current_user(info).pk, data)
        return CreateUserContractor(user_contractor=entry)


class DeleteUserContractor(graphene.Mutation):
    """Removes a contractor from the caller's rolodex."""

    class Arguments:
        user_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, user_contractor_id: str):
        """Deletes the rolodex entry after checking the caller owns it."""
        user = current_user(info)
        permissions.require(UserContractor.objects, user.pk, user_contractor_id)
        services.delete_user_contractor(user.pk, user_contractor_id)
        return DeleteUserContractor(success=True)


class UserContractorsQuery(graphene.ObjectType):
    """Rolodex reads."""

    user_contractors = graphene.List(
        graphene.NonNull(UserContractorType), required=True, description="The caller's saved contractors."
    )

    @login_required
    def resolve_user_contractors(self, info):
        """Returns the caller's rolodex entries."""
        user = current_user(info)
        return permissions.list_for_user(UserContractor.objects, user.pk, user.role)


class UserContractorsMutation(graphene.ObjectType):
    """Rolodex writes."""

    create_user_contractor = CreateUserContractor.Field()
    delete_user_contractor = DeleteUserContractor.Field()
