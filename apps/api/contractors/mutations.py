"""GraphQL writes for the contractor directory. Every write is admin-only."""

import graphene

from contractors.services.contractor_service import ContractorService
from contractors.types import ContractorType
from core.enums import TradeCategoryEnum
from core.graphql import admin_required


class CreateContractor(graphene.Mutation):
    """Adds a contractor to the global directory. Admin only."""

    class Arguments:
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum), required=True)
        name = graphene.String(required=True)
        company_name = graphene.String()
        email = graphene.String()
        notes = graphene.String()
        phone = graphene.String()
        zip_codes = graphene.List(graphene.NonNull(graphene.String))

    contractor = graphene.Field(ContractorType)

    @admin_required
    def mutate(self, info, **data):
        """Creates the global contractor."""
        return CreateContractor(contractor=ContractorService().create(is_global=True, **data))


class UpdateContractor(graphene.Mutation):
    """Updates a contractor. Admin only."""

    class Arguments:
        contractor_id = graphene.ID(required=True)
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        company_name = graphene.String()
        email = graphene.String()
        name = graphene.String()
        notes = graphene.String()
        phone = graphene.String()
        zip_codes = graphene.List(graphene.NonNull(graphene.String))

    contractor = graphene.Field(ContractorType)

    @admin_required
    def mutate(self, info, contractor_id: str, **data):
        """Applies the update to the contractor."""
        return UpdateContractor(contractor=ContractorService().update(contractor_id=contractor_id, **data))


class PromoteContractor(graphene.Mutation):
    """Promotes a private contractor into the global directory. Admin only."""

    class Arguments:
        contractor_id = graphene.ID(required=True)

    contractor = graphene.Field(ContractorType)

    @admin_required
    def mutate(self, info, contractor_id: str):
        """Marks the contractor as global."""
        return PromoteContractor(contractor=ContractorService().promote(contractor_id=contractor_id))


class DeleteContractor(graphene.Mutation):
    """Deletes a contractor. Admin only."""

    class Arguments:
        contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @admin_required
    def mutate(self, info, contractor_id: str):
        """Deletes the contractor."""
        ContractorService().delete(contractor_id=contractor_id)
        return DeleteContractor(success=True)


class ContractorsMutation(graphene.ObjectType):
    """Contractor writes."""

    create_contractor = CreateContractor.Field()
    update_contractor = UpdateContractor.Field()
    promote_contractor = PromoteContractor.Field()
    delete_contractor = DeleteContractor.Field()
