"""GraphQL surface for connected accounts and sending mail through them.

Tokens never leave the server: the type exposes only the connection's metadata.
"""

import graphene

from communications.types import CommunicationType
from core.graphql import authorize, current_user, login_required, owner_required
from core.services.permission_service import Permission
from integrations.models import Integration
from integrations.services.email_service import EmailService
from integrations.services.integration_service import IntegrationService
from integrations.types import IntegrationType
from jobs.models import Job


class SaveAiIntegration(graphene.Mutation):
    """Stores an AI provider API key for the caller."""

    class Arguments:
        provider = graphene.String(required=True)
        api_key = graphene.String(required=True)

    integration = graphene.Field(IntegrationType)

    @login_required
    def mutate(self, info, provider: str, api_key: str):
        """Encrypts and stores the API key."""
        integration = IntegrationService().save_ai_key(
            user_id=current_user(info).pk, provider=provider, api_key=api_key
        )
        return SaveAiIntegration(integration=integration)


class DisconnectIntegration(graphene.Mutation):
    """Removes one of the caller's connected accounts."""

    class Arguments:
        integration_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @owner_required(resource=Integration, arg="integration_id")
    def mutate(self, info, integration_id: str):
        """Deletes the integration."""
        IntegrationService().disconnect(integration_id=integration_id)
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

    @authorize(Permission.COMMUNICATIONS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, **data):
        """Sends the message and records it against the job."""
        communication = EmailService().send(user_id=current_user(info).pk, job_id=job_id, **data)
        return SendEmail(communication=communication)


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


class IntegrationsMutation(graphene.ObjectType):
    """Integration writes."""

    save_ai_integration = SaveAiIntegration.Field()
    disconnect_integration = DisconnectIntegration.Field()
    send_email = SendEmail.Field()
