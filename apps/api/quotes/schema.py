"""GraphQL surface for quotes."""

import graphene

from core.enums import QuoteStatusEnum
from core.graphql import authorize
from core.services.permission_service import Permission
from jobs.models import Job
from quotes.models import Quote
from quotes.services.quote_service import QuoteService
from quotes.types import QuoteType


class CreateQuote(graphene.Mutation):
    """Records a quote against a job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        contractor_id = graphene.ID(required=True)
        amount = graphene.Float(required=True)
        description = graphene.String()
        status = QuoteStatusEnum()
        source_communication_id = graphene.ID()

    quote = graphene.Field(QuoteType)

    @authorize(Permission.QUOTES_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, **data):
        """Records the quote against the job."""
        return CreateQuote(quote=QuoteService().create(job_id=job_id, **data))


class UpdateQuote(graphene.Mutation):
    """Updates a quote."""

    class Arguments:
        quote_id = graphene.ID(required=True)
        amount = graphene.Float()
        description = graphene.String()
        status = QuoteStatusEnum()

    quote = graphene.Field(QuoteType)

    @authorize(Permission.QUOTES_EDIT, resource=Quote, arg="quote_id")
    def mutate(self, info, quote_id: str, **data):
        """Applies the update to the quote."""
        return UpdateQuote(quote=QuoteService().update(quote_id=quote_id, **data))


class DeleteQuote(graphene.Mutation):
    """Deletes a quote."""

    class Arguments:
        quote_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.QUOTES_EDIT, resource=Quote, arg="quote_id")
    def mutate(self, info, quote_id: str):
        """Deletes the quote."""
        QuoteService().delete(quote_id=quote_id)
        return DeleteQuote(success=True)


class QuotesQuery(graphene.ObjectType):
    """Quote reads."""

    quotes = graphene.List(graphene.NonNull(QuoteType), job_id=graphene.ID(required=True), required=True)

    @authorize(Permission.QUOTES_VIEW, resource=Job, arg="job_id")
    def resolve_quotes(self, info, job_id: str):
        """Returns the quotes on a job."""
        return Quote.objects.list_for_job(job_id)


class QuotesMutation(graphene.ObjectType):
    """Quote writes."""

    create_quote = CreateQuote.Field()
    update_quote = UpdateQuote.Field()
    delete_quote = DeleteQuote.Field()
