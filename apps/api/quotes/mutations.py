"""GraphQL writes for quotes."""

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
        contractor_id = graphene.ID(required=True)
        job_id = graphene.ID(required=True)
        amount = graphene.Float(required=True)
        source_communication_id = graphene.ID()
        description = graphene.String()
        status = QuoteStatusEnum()

    quote = graphene.Field(QuoteType)

    @authorize(Permission.QUOTES_EDIT, arg="job_id", resource=Job)
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

    @authorize(Permission.QUOTES_EDIT, arg="quote_id", resource=Quote)
    def mutate(self, info, quote_id: str, **data):
        """Applies the update to the quote."""
        return UpdateQuote(quote=QuoteService().update(quote_id=quote_id, **data))


class DeleteQuote(graphene.Mutation):
    """Deletes a quote."""

    class Arguments:
        quote_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.QUOTES_EDIT, arg="quote_id", resource=Quote)
    def mutate(self, info, quote_id: str):
        """Deletes the quote."""
        QuoteService().delete(quote_id=quote_id)
        return DeleteQuote(success=True)


class QuotesMutation(graphene.ObjectType):
    """Quote writes."""

    create_quote = CreateQuote.Field()
    update_quote = UpdateQuote.Field()
    delete_quote = DeleteQuote.Field()
