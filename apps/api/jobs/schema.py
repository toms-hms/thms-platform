"""GraphQL surface for jobs and contractor assignments.

A job exposes its related images, quotes, communications and generations as
nested fields — the composite payload the REST endpoint used to assemble by hand.
"""

import graphene
from graphene_django import DjangoObjectType

from contractors.schema import ContractorType
from core import permissions
from core.enums import JobContractorStatusEnum, JobIntentEnum, JobStatusEnum, TradeCategoryEnum
from core.graphql import current_user, login_required
from homes.models import Home
from jobs import services
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
    images = graphene.List(graphene.NonNull("ai.schema.JobImageType"), required=True)
    quotes = graphene.List(graphene.NonNull("quotes.schema.QuoteType"), required=True)
    communications = graphene.List(graphene.NonNull("communications.schema.CommunicationType"), required=True)
    ai_generations = graphene.List(graphene.NonNull("ai.schema.AIGenerationType"), required=True)

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


class CreateJob(graphene.Mutation):
    """Creates a job on a home the caller can access."""

    class Arguments:
        home_id = graphene.ID(required=True)
        title = graphene.String(required=True)
        category = TradeCategoryEnum(required=True)
        intent = JobIntentEnum()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        description = graphene.String()
        notes = graphene.String()
        status = JobStatusEnum()
        ai_session = graphene.JSONString()

    job = graphene.Field(JobType)

    @login_required
    def mutate(self, info, home_id: str, **data):
        """Creates the job after checking the caller's access to the home."""
        user = current_user(info)
        permissions.require(Home.objects, user.pk, home_id)
        return CreateJob(job=services.create_job(home_id, user.pk, data))


class UpdateJob(graphene.Mutation):
    """Updates a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)
        title = graphene.String()
        category = TradeCategoryEnum()
        intent = JobIntentEnum()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        description = graphene.String()
        notes = graphene.String()
        status = JobStatusEnum()
        ai_session = graphene.JSONString()

    job = graphene.Field(JobType)

    @login_required
    def mutate(self, info, job_id: str, **data):
        """Applies the update after checking the caller's access to the job."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return UpdateJob(job=services.update_job(job_id, data))


class DeleteJob(graphene.Mutation):
    """Deletes a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, job_id: str):
        """Deletes the job after checking the caller's access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        services.delete_job(job_id)
        return DeleteJob(success=True)


class AssignContractor(graphene.Mutation):
    """Assigns a contractor to a job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        contractor_id = graphene.ID(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @login_required
    def mutate(self, info, job_id: str, contractor_id: str, notes: str | None = None):
        """Creates or updates the assignment after checking the caller's access to the job."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return AssignContractor(job_contractor=services.assign_contractor(job_id, contractor_id, notes))


class UpdateJobContractor(graphene.Mutation):
    """Moves a contractor assignment to a new status."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)
        status = JobContractorStatusEnum(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @login_required
    def mutate(self, info, job_contractor_id: str, status: str, notes: str | None = None):
        """Applies the status change after checking the caller's access."""
        permissions.require(JobContractor.objects, current_user(info).pk, job_contractor_id)
        return UpdateJobContractor(
            job_contractor=services.update_job_contractor_status(job_contractor_id, status, notes)
        )


class RemoveJobContractor(graphene.Mutation):
    """Removes a contractor from a job."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, job_contractor_id: str):
        """Removes the assignment after checking the caller's access."""
        permissions.require(JobContractor.objects, current_user(info).pk, job_contractor_id)
        services.remove_contractor_from_job(job_contractor_id)
        return RemoveJobContractor(success=True)


class JobsQuery(graphene.ObjectType):
    """Job reads."""

    jobs = graphene.List(
        graphene.NonNull(JobType),
        home_id=graphene.ID(),
        status=JobStatusEnum(),
        category=TradeCategoryEnum(),
        required=True,
    )
    job = graphene.Field(JobType, job_id=graphene.ID(required=True))
    job_contractors = graphene.List(
        graphene.NonNull(JobContractorType), job_id=graphene.ID(required=True), required=True
    )

    @login_required
    def resolve_jobs(self, info, home_id=None, status=None, category=None):
        """Returns the jobs the caller can see, narrowed by home, status and category."""
        user = current_user(info)
        if home_id:
            permissions.require(Home.objects, user.pk, home_id)
        return permissions.list_for_user(
            Job.objects, user.pk, user.role, home_id=home_id, status=status, category=category
        )

    @login_required
    def resolve_job(self, info, job_id: str):
        """Returns one job after checking the caller's access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return Job.objects.get_or_404(pk=job_id)

    @login_required
    def resolve_job_contractors(self, info, job_id: str):
        """Returns the contractor assignments on a job the caller can access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return JobContractor.objects.list_for_job(job_id)


class JobsMutation(graphene.ObjectType):
    """Job writes."""

    create_job = CreateJob.Field()
    update_job = UpdateJob.Field()
    delete_job = DeleteJob.Field()
    assign_contractor = AssignContractor.Field()
    update_job_contractor = UpdateJobContractor.Field()
    remove_job_contractor = RemoveJobContractor.Field()
