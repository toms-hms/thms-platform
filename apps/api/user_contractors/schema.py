"""GraphQL surface for the user's contractor rolodex."""

import graphene

from core.enums import TradeCategoryEnum
from core.graphql import current_user, login_required, owner_required
from user_contractors.models import UserContractor
from user_contractors.services.user_contractor_service import UserContractorService
from user_contractors.types import UserContractorType


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
        entry = UserContractorService().add(user_id=current_user(info).pk, **data)
        return CreateUserContractor(user_contractor=entry)


class DeleteUserContractor(graphene.Mutation):
    """Removes a contractor from the caller's rolodex."""

    class Arguments:
        user_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @owner_required(resource=UserContractor, arg="user_contractor_id")
    def mutate(self, info, user_contractor_id: str):
        """Deletes the rolodex entry."""
        UserContractorService().remove(user_contractor_id=user_contractor_id)
        return DeleteUserContractor(success=True)


class UserContractorsQuery(graphene.ObjectType):
    """Rolodex reads."""

    user_contractors = graphene.List(
        graphene.NonNull(UserContractorType), required=True, description="The caller's saved contractors."
    )

    @login_required
    def resolve_user_contractors(self, info):
        """Returns the caller's rolodex entries."""
        return UserContractor.objects.list_owned_by(current_user(info))


class UserContractorsMutation(graphene.ObjectType):
    """Rolodex writes."""

    create_user_contractor = CreateUserContractor.Field()
    delete_user_contractor = DeleteUserContractor.Field()
