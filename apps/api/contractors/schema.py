"""GraphQL surface for the contractor directory.

Reads are open to any authenticated user; every write is admin-only, matching
the role gates the REST routes applied.
"""

import graphene

from contractors.models import Contractor
from contractors.services.contractor_service import ContractorService
from contractors.types import ContractorJobHistoryType, ContractorType
from core.enums import TradeCategoryEnum
from core.graphql import admin_required, login_required


class CreateContractor(graphene.Mutation):
    """Adds a contractor to the global directory. Admin only."""

    class Arguments:
        name = graphene.String(required=True)
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum), required=True)
        company_name = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        zip_codes = graphene.List(graphene.NonNull(graphene.String))
        notes = graphene.String()

    contractor = graphene.Field(ContractorType)

    @admin_required
    def mutate(self, info, **data):
        """Creates the global contractor."""
        return CreateContractor(contractor=ContractorService().create(is_global=True, **data))


class UpdateContractor(graphene.Mutation):
    """Updates a contractor. Admin only."""

    class Arguments:
        contractor_id = graphene.ID(required=True)
        name = graphene.String()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        company_name = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        zip_codes = graphene.List(graphene.NonNull(graphene.String))
        notes = graphene.String()

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


class ContractorsQuery(graphene.ObjectType):
    """Contractor reads."""

    contractors = graphene.List(
        graphene.NonNull(ContractorType),
        search=graphene.String(),
        trade_categories=graphene.List(graphene.NonNull(TradeCategoryEnum)),
        zip_codes=graphene.List(graphene.NonNull(graphene.String)),
        required=True,
    )
    contractor = graphene.Field(ContractorType, contractor_id=graphene.ID(required=True))
    contractor_job_history = graphene.List(
        graphene.NonNull(ContractorJobHistoryType), contractor_id=graphene.ID(required=True), required=True
    )

    @login_required
    def resolve_contractors(self, info, search=None, trade_categories=None, zip_codes=None):
        """Returns global contractors narrowed by search text, trade categories and ZIP codes."""
        return Contractor.objects.filter_contractors(
            search=search, trade_categories=trade_categories, zip_codes=zip_codes, is_global=True
        ).prefetch_related("zip_code_rows")

    @login_required
    def resolve_contractor(self, info, contractor_id: str):
        """Returns one contractor by id."""
        return Contractor.objects.get_or_404(pk=contractor_id)

    @login_required
    def resolve_contractor_job_history(self, info, contractor_id: str):
        """Returns the contractor's job history, most recent first."""
        return [
            ContractorJobHistoryType(**row)
            for row in Contractor.objects.list_job_history(contractor_id=contractor_id)
        ]


class ContractorsMutation(graphene.ObjectType):
    """Contractor writes."""

    create_contractor = CreateContractor.Field()
    update_contractor = UpdateContractor.Field()
    promote_contractor = PromoteContractor.Field()
    delete_contractor = DeleteContractor.Field()
