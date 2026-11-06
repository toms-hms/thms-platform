"""GraphQL writes for connected accounts and sending mail through them."""

import graphene

from communications.types import CommunicationType
from core.graphql import authorize, current_user, login_required, owner_required
from core.services.permission_service import Permission
from integrations.models import Integration
from integrations.services.email_service import EmailService
from integrations.services.integration_service import IntegrationService
from integrations.types import IntegrationType
from jobs.models import Job


class CreateAiIntegration(graphene.Mutation):
    """Stores an AI provider API key for the caller."""

    class Arguments:
        api_key = graphene.String(required=True)
        provider = graphene.String(required=True)

    integration = graphene.Field(IntegrationType)

    @login_required
    def mutate(self, info, provider: str, api_key: str):
        """Encrypts and stores the API key."""
        integration = IntegrationService().create_ai(
            user_id=current_user(info).pk, api_key=api_key, provider=provider
        )
        return CreateAiIntegration(integration=integration)


class DeleteIntegration(graphene.Mutation):
    """Removes one of the caller's connected accounts."""

    class Arguments:
        integration_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @owner_required(arg="integration_id", resource=Integration)
    def mutate(self, info, integration_id: str):
        """Deletes the integration."""
        IntegrationService().delete(integration_id=integration_id)
        return DeleteIntegration(success=True)


class SendEmail(graphene.Mutation):
    """Sends an email through the caller's Gmail connection and records it against the job."""

    class Arguments:
        integration_id = graphene.ID(required=True)
        job_id = graphene.ID(required=True)
        body_text = graphene.String(required=True)
        subject = graphene.String(required=True)
        to = graphene.String(required=True)
        contractor_id = graphene.ID()
        body_html = graphene.String()

    communication = graphene.Field(CommunicationType)

    @authorize(Permission.COMMUNICATIONS_EDIT, arg="job_id", resource=Job)
    def mutate(self, info, job_id: str, **data):
        """Sends the message and records it against the job."""
        communication = EmailService().send(user_id=current_user(info).pk, job_id=job_id, **data)
        return SendEmail(communication=communication)


class IntegrationsMutation(graphene.ObjectType):
    """Integration writes."""

    create_ai_integration = CreateAiIntegration.Field()
    delete_integration = DeleteIntegration.Field()
    send_email = SendEmail.Field()
