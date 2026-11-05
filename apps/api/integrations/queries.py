"""GraphQL reads for connected accounts and OAuth consent URLs.

Tokens never leave the server: the type exposes only the connection's metadata.
"""

import graphene

from core.graphql import current_user, login_required
from integrations.models import Integration
from integrations.services.integration_service import IntegrationService
from integrations.types import IntegrationType


class IntegrationsQuery(graphene.ObjectType):
    """Integration reads."""

    integrations = graphene.List(
        graphene.NonNull(IntegrationType), required=True, description="The caller's connected accounts."
    )
    google_auth_url = graphene.String(required=True, description="Consent URL for connecting Gmail.")
    microsoft_auth_url = graphene.String(required=True, description="Consent URL for connecting Outlook.")

    @login_required
    def resolve_integrations(self, info):
        """Returns the caller's connected accounts."""
        return Integration.objects.owned_by(current_user(info))

    @login_required
    def resolve_google_auth_url(self, info) -> str:
        """Returns the Google consent URL for the caller."""
        return IntegrationService().google_auth_url(user_id=current_user(info).pk)

    @login_required
    def resolve_microsoft_auth_url(self, info) -> str:
        """Returns the Microsoft consent URL for the caller."""
        return IntegrationService().microsoft_auth_url(user_id=current_user(info).pk)
