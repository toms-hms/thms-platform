"""GraphQL types for connected accounts. Tokens never leave the server."""

import graphene
from graphene_django import DjangoObjectType

from integrations.models import Integration


class IntegrationType(DjangoObjectType):
    """A connected third-party account. Encrypted tokens are deliberately not exposed."""

    status = graphene.String(required=True)

    class Meta:
        model = Integration
        fields = ("id", "type", "provider", "email", "scopes", "created_at", "updated_at")
        convert_choices_to_enum = False

    def resolve_status(self, info) -> str:
        """Returns the connection status. A stored integration is by definition connected."""
        return "CONNECTED"
