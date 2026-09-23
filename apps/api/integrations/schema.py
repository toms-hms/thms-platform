"""GraphQL surface for connected accounts and sending mail through them.

Tokens never leave the server: the type exposes only the connection's metadata.
"""

import graphene
from graphene_django import DjangoObjectType

from communications.schema import CommunicationType
from core import permissions
from core.graphql import current_user, login_required
from integrations import services
from integrations.models import Integration
from jobs.models import Job


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


class SaveAiIntegration(graphene.Mutation):
    """Stores an AI provider API key for the caller."""

    class Arguments:
        provider = graphene.String(required=True)
        api_key = graphene.String(required=True)

    integration = graphene.Field(IntegrationType)

    @login_required
    def mutate(self, info, provider: str, api_key: str):
        """Encrypts and stores the API key."""
        integration = services.save_ai_integration(current_user(info).pk, provider, api_key)
        return SaveAiIntegration(integration=integration)


class DisconnectIntegration(graphene.Mutation):
    """Removes one of the caller's connected accounts."""

    class Arguments:
        integration_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, integration_id: str):
        """Deletes the integration after checking the caller owns it."""
        services.disconnect_integration(integration_id, current_user(info).pk)
        return DisconnectIntegration(success=True)


class SendEmail(graphene.Mutation):
    """Sends an email through the caller's Gmail connection and records it against the job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        integration_id = graphene.ID(required=True)
        to = graphene.String(required=True)
        subject = graphene.String(required=True)
        body_text = graphene.String(required=True)
        body_html = graphene.String()
        contractor_id = graphene.ID()

    communication = graphene.Field(CommunicationType)

    @login_required
    def mutate(self, info, job_id: str, **data):
        """Sends the message after checking the caller's access to the job."""
        user = current_user(info)
        permissions.require(Job.objects, user.pk, job_id)
        result = services.send_via_gmail(user_id=user.pk, job_id=job_id, **data)
        return SendEmail(communication=result["communication"])


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
        return Integration.objects.list_for_user(current_user(info).pk)

    @login_required
    def resolve_google_auth_url(self, info) -> str:
        """Returns the Google consent URL for the caller."""
        return services.get_google_auth_url(current_user(info).pk)

    @login_required
    def resolve_microsoft_auth_url(self, info) -> str:
        """Returns the Microsoft consent URL for the caller."""
        return services.get_microsoft_auth_url(current_user(info).pk)


class IntegrationsMutation(graphene.ObjectType):
    """Integration writes."""

    save_ai_integration = SaveAiIntegration.Field()
    disconnect_integration = DisconnectIntegration.Field()
    send_email = SendEmail.Field()
