"""GraphQL surface for quotes."""

import graphene
from graphene_django import DjangoObjectType

from contractors.schema import ContractorType
from core import permissions
from core.enums import QuoteStatusEnum
from core.graphql import current_user, login_required
from jobs.models import Job
from quotes import services
from quotes.models import Quote


class QuoteType(DjangoObjectType):
    """A price a contractor gave for a job."""

    contractor = graphene.Field(ContractorType, required=True)
    job_id = graphene.ID(required=True)
    contractor_id = graphene.ID(required=True)
    source_communication_id = graphene.ID()

    class Meta:
        model = Quote
        fields = (
            "id",
            "job",
            "amount",
            "description",
            "status",
            "source_communication",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the contractor who gave the quote."""
        return self.contractor

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job this quote is against."""
        return self.job_id

    def resolve_contractor_id(self, info) -> str:
        """Returns the id of the quoting contractor, without requiring a nested selection."""
        return self.contractor_id

    def resolve_source_communication_id(self, info) -> str | None:
        """Returns the id of the message this quote was read from, when there is one."""
        return self.source_communication_id


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

    @login_required
    def mutate(self, info, job_id: str, **data):
        """Creates the quote after checking the caller's access to the job."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return CreateQuote(quote=services.create_quote(job_id, data))


class UpdateQuote(graphene.Mutation):
    """Updates a quote."""

    class Arguments:
        quote_id = graphene.ID(required=True)
        amount = graphene.Float()
        description = graphene.String()
        status = QuoteStatusEnum()

    quote = graphene.Field(QuoteType)

    @login_required
    def mutate(self, info, quote_id: str, **data):
        """Applies the update after checking the caller's access to the quote."""
        permissions.require(Quote.objects, current_user(info).pk, quote_id)
        return UpdateQuote(quote=services.update_quote(quote_id, data))


class DeleteQuote(graphene.Mutation):
    """Deletes a quote."""

    class Arguments:
        quote_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, quote_id: str):
        """Deletes the quote after checking the caller's access."""
        permissions.require(Quote.objects, current_user(info).pk, quote_id)
        services.delete_quote(quote_id)
        return DeleteQuote(success=True)


class QuotesQuery(graphene.ObjectType):
    """Quote reads."""

    quotes = graphene.List(graphene.NonNull(QuoteType), job_id=graphene.ID(required=True), required=True)

    @login_required
    def resolve_quotes(self, info, job_id: str):
        """Returns the quotes on a job the caller can access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return Quote.objects.list_for_job(job_id)


class QuotesMutation(graphene.ObjectType):
    """Quote writes."""

    create_quote = CreateQuote.Field()
    update_quote = UpdateQuote.Field()
    delete_quote = DeleteQuote.Field()
