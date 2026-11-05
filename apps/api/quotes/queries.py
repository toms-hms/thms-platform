"""GraphQL reads for quotes."""

import graphene

from core.graphql import current_user, login_required
from core.services.permission_service import Permission
from quotes.models import Quote
from quotes.types import QuoteType


class QuotesQuery(graphene.ObjectType):
    """Quote reads."""

    quotes = graphene.List(
        graphene.NonNull(QuoteType),
        job_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )

    @login_required
    def resolve_quotes(self, info, job_ids: list[str]):
        """Returns the quotes on the jobs the caller can see."""
        return (
            Quote.objects.filter_job_ids(job_ids)
            .select_related("contractor")
            .visible_to(current_user(info), Permission.QUOTES_VIEW)
        )
