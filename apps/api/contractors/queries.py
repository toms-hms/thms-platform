"""GraphQL reads for the contractor directory. Open to any authenticated user."""

import graphene

from contractors.models import Contractor
from contractors.types import ContractorJobHistoryType, ContractorType
from core.enums import TradeCategoryEnum
from core.errors import NotFoundError
from core.graphql import login_required


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
        graphene.NonNull(ContractorJobHistoryType),
        contractor_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )

    @login_required
    def resolve_contractors(self, info, search=None, trade_categories=None, zip_codes=None):
        """Returns global contractors narrowed by search text, trade categories and ZIP codes."""
        return Contractor.objects.filter_contractors(
            is_global=True, search=search, trade_categories=trade_categories, zip_codes=zip_codes
        ).prefetch_related("zip_code_rows")

    @login_required
    def resolve_contractor(self, info, contractor_id: str):
        """Returns one contractor by id."""
        contractor = Contractor.objects.find(pk=contractor_id)
        if contractor is None:
            raise NotFoundError("Contractor")
        return contractor

    @login_required
    def resolve_contractor_job_history(self, info, contractor_ids: list[str]):
        """Returns the contractors' job history, most recent first."""
        return [
            ContractorJobHistoryType(**row)
            for row in Contractor.objects.list_job_history(contractor_ids=contractor_ids)
        ]
