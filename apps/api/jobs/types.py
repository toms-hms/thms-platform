"""GraphQL types for jobs and contractor assignments.

A job exposes its related images, quotes, communications and generations as
nested fields — the composite payload the REST endpoint used to assemble by hand.
"""

import graphene
from graphene_django import DjangoObjectType

from contractors.types import ContractorType
from jobs.models import Job, JobContractor


class JobContractorType(DjangoObjectType):
    """A contractor's involvement in a job."""

    contractor = graphene.Field(ContractorType, required=True)
    job_id = graphene.ID(required=True)
    contractor_id = graphene.ID(required=True)

    class Meta:
        model = JobContractor
        fields = (
            "id",
            "job",
            "status",
            "last_contacted_at",
            "last_response_at",
            "notes",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_contractor(self, info):
        """Returns the assigned contractor."""
        return self.contractor

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job, without requiring the client to select the job itself."""
        return self.job_id

    def resolve_contractor_id(self, info) -> str:
        """Returns the id of the contractor, without requiring a nested selection."""
        return self.contractor_id


class JobType(DjangoObjectType):
    """A piece of work on a home, with everything hanging off it."""

    ai_session = graphene.JSONString()
    home_id = graphene.ID(required=True)
    created_by_user_id = graphene.ID(required=True)
    contractors = graphene.List(graphene.NonNull(JobContractorType), required=True)
    images = graphene.List(graphene.NonNull("ai.types.JobImageType"), required=True)
    quotes = graphene.List(graphene.NonNull("quotes.types.QuoteType"), required=True)
    communications = graphene.List(graphene.NonNull("communications.types.CommunicationType"), required=True)
    ai_generations = graphene.List(graphene.NonNull("ai.types.AIGenerationType"), required=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "home",
            "title",
            "intent",
            "category",
            "description",
            "notes",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_home_id(self, info) -> str:
        """Returns the id of the home this job belongs to."""
        return self.home_id

    def resolve_created_by_user_id(self, info) -> str:
        """Returns the id of the user who created this job."""
        return self.created_by_id

    def resolve_contractors(self, info):
        """Returns the contractors assigned to this job."""
        return JobContractor.objects.list_for_job(self.pk)

    def resolve_images(self, info):
        """Returns the images attached to this job."""
        from ai.models import JobImage

        return JobImage.objects.list_for_job(self.pk)

    def resolve_quotes(self, info):
        """Returns the quotes recorded against this job."""
        from quotes.models import Quote

        return Quote.objects.list_for_job(self.pk)

    def resolve_communications(self, info):
        """Returns the messages exchanged about this job."""
        from communications.models import Communication

        return Communication.objects.list_for_job(self.pk)

    def resolve_ai_generations(self, info):
        """Returns the AI generations recorded against this job."""
        from ai.models import AIGeneration

        return AIGeneration.objects.list_for_job(self.pk)
