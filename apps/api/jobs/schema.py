"""GraphQL surface for jobs and contractor assignments."""

import graphene

from core.enums import JobContractorStatusEnum, JobIntentEnum, JobStatusEnum, TradeCategoryEnum
from core.graphql import authorize, current_user
from core.permissions import Permission
from homes.models import Home
from jobs import services
from jobs.models import Job, JobContractor
from jobs.types import JobContractorType, JobType


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

    @authorize(Permission.JOBS_EDIT, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str, **data):
        """Creates the job on the home."""
        return CreateJob(job=services.create_job(home_id, current_user(info).pk, data))


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

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, **data):
        """Applies the update to the job."""
        return UpdateJob(job=services.update_job(job_id, data))


class DeleteJob(graphene.Mutation):
    """Deletes a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str):
        """Deletes the job."""
        services.delete_job(job_id)
        return DeleteJob(success=True)


class AssignContractor(graphene.Mutation):
    """Assigns a contractor to a job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        contractor_id = graphene.ID(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, contractor_id: str, notes: str | None = None):
        """Creates or updates the assignment."""
        return AssignContractor(job_contractor=services.assign_contractor(job_id, contractor_id, notes))


class UpdateJobContractor(graphene.Mutation):
    """Moves a contractor assignment to a new status."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)
        status = JobContractorStatusEnum(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @authorize(Permission.JOBS_EDIT, resource=JobContractor, arg="job_contractor_id")
    def mutate(self, info, job_contractor_id: str, status: str, notes: str | None = None):
        """Applies the status change."""
        return UpdateJobContractor(
            job_contractor=services.update_job_contractor_status(job_contractor_id, status, notes)
        )


class RemoveJobContractor(graphene.Mutation):
    """Removes a contractor from a job."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, resource=JobContractor, arg="job_contractor_id")
    def mutate(self, info, job_contractor_id: str):
        """Removes the assignment."""
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

    @authorize(Permission.JOBS_VIEW, resource=Home, arg="home_id", optional=True)
    def resolve_jobs(self, info, home_id=None, status=None, category=None):
        """Returns the jobs the caller can see, narrowed by home, status and category."""
        return (
            Job.objects.visible_to(current_user(info), Permission.JOBS_VIEW)
            .filter_home_ids([home_id] if home_id else None)
            .filter_statuses([status] if status else None)
            .filter_trade_categories([category] if category else None)
        )

    @authorize(Permission.JOBS_VIEW, resource=Job, arg="job_id")
    def resolve_job(self, info, job_id: str):
        """Returns one job."""
        return Job.objects.get_or_404(pk=job_id)

    @authorize(Permission.JOBS_VIEW, resource=Job, arg="job_id")
    def resolve_job_contractors(self, info, job_id: str):
        """Returns the contractor assignments on a job."""
        return JobContractor.objects.list_for_job(job_id)


class JobsMutation(graphene.ObjectType):
    """Job writes."""

    create_job = CreateJob.Field()
    update_job = UpdateJob.Field()
    delete_job = DeleteJob.Field()
    assign_contractor = AssignContractor.Field()
    update_job_contractor = UpdateJobContractor.Field()
    remove_job_contractor = RemoveJobContractor.Field()
