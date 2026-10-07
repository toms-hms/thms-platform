"""GraphQL types for the contractor directory."""

import graphene
from graphene_django import DjangoObjectType

from contractors.models import Contractor


class ContractorType(DjangoObjectType):
    """A tradesperson or company in the directory."""

    zip_codes = graphene.List(graphene.NonNull(graphene.String), required=True)
    categories = graphene.List(graphene.NonNull(graphene.String), required=True)

    class Meta:
        model = Contractor
        fields = (
            "id",
            "name",
            "company_name",
            "email",
            "phone",
            "notes",
            "is_global",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_zip_codes(self, info) -> list[str]:
        """Returns the ZIP codes the contractor serves."""
        return self.zip_codes

    def resolve_categories(self, info) -> list[str]:
        """Returns the trade categories the contractor works in."""
        return list(self.categories or [])


class ContractorJobHistoryType(graphene.ObjectType):
    """One row of a contractor's job history."""

    job_id = graphene.ID(required=True)
    job_title = graphene.String(required=True)
    job_status = graphene.String(required=True)
    home_id = graphene.ID(required=True)
    home_name = graphene.String(required=True)
    contractor_status = graphene.String(required=True)
