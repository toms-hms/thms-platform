"""GraphQL types for communications."""

from graphene_django import DjangoObjectType

from communications.models import Communication


class CommunicationType(DjangoObjectType):
    """One message sent to, or received from, a contractor."""

    class Meta:
        model = Communication
        fields = (
            "id",
            "job",
            "contractor",
            "channel",
            "direction",
            "subject",
            "body_text",
            "body_html",
            "external_thread_id",
            "external_message_id",
            "sent_at",
            "received_at",
            "parsed_summary",
            "needs_review",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False
