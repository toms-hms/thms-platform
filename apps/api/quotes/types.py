"""GraphQL types for quotes."""

from graphene_django import DjangoObjectType

from quotes.models import Quote


class QuoteType(DjangoObjectType):
    """A price a contractor gave for a job."""

    class Meta:
        model = Quote
        fields = (
            "id",
            "job",
            "contractor",
            "amount",
            "description",
            "status",
            "source_communication",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False
