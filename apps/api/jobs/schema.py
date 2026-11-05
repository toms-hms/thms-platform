"""GraphQL surface for jobs and contractor assignments."""

import graphene

from core.enums import JobContractorStatusEnum, JobIntentEnum, JobStatusEnum, TradeCategoryEnum
from core.errors import NotFoundError
from core.graphql import authorize, current_user, login_required
from core.services.permission_service import Permission
from homes.models import Home
from jobs.models import Job, JobContractor
from jobs.services.job_contractor_service import JobContractorService
from jobs.services.job_service import JobService
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
        return CreateJob(job=JobService().create(home_id=home_id, user_id=current_user(info).pk, **data))


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
        return UpdateJob(job=JobService().update(job_id=job_id, **data))


class DeleteJob(graphene.Mutation):
    """Deletes a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str):
        """Deletes the job."""
        JobService().delete(job_id=job_id)
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
        return AssignContractor(
            job_contractor=JobContractorService().assign(
                job_id=job_id, contractor_id=contractor_id, notes=notes
            )
        )


class UpdateJobContractor(graphene.Mutation):
    """Moves a contractor assignment to a new status."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)
        status = JobContractorStatusEnum(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @authorize(Permission.JOBS_EDIT, resource=JobContractor, arg="job_contractor_id")
    def mutate(self, info, job_contractor_id: str, status: str, **extra):
        """Applies the status change. Omitting notes leaves them unchanged."""
        return UpdateJobContractor(
            job_contractor=JobContractorService().update_status(
                job_contractor_id=job_contractor_id, status=status, **extra
            )
        )


class RemoveJobContractor(graphene.Mutation):
    """Removes a contractor from a job."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, resource=JobContractor, arg="job_contractor_id")
    def mutate(self, info, job_contractor_id: str):
        """Removes the assignment."""
        JobContractorService().remove(job_contractor_id=job_contractor_id)
        return RemoveJobContractor(success=True)


class JobsQuery(graphene.ObjectType):
    """Job reads."""

    jobs = graphene.List(
        graphene.NonNull(JobType),
        home_ids=graphene.List(graphene.NonNull(graphene.ID)),
        statuses=graphene.List(graphene.NonNull(JobStatusEnum)),
        trade_categories=graphene.List(graphene.NonNull(TradeCategoryEnum)),
        required=True,
    )
    job = graphene.Field(JobType, job_id=graphene.ID(required=True))
    job_contractors = graphene.List(
        graphene.NonNull(JobContractorType),
        job_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )

    @login_required
    def resolve_jobs(self, info, home_ids=None, statuses=None, trade_categories=None):
        """Returns the jobs the caller can see, narrowed by homes, statuses and trade categories."""
        return (
            Job.objects.visible_to(current_user(info), Permission.JOBS_VIEW)
            .filter_home_ids(home_ids)
            .filter_statuses(statuses)
            .filter_trade_categories(trade_categories)
        )

    @authorize(Permission.JOBS_VIEW, resource=Job, arg="job_id")
    def resolve_job(self, info, job_id: str):
        """Returns one job."""
        job = Job.objects.find(pk=job_id)
        if job is None:
            raise NotFoundError("Job")
        return job

    @login_required
    def resolve_job_contractors(self, info, job_ids: list[str]):
        """Returns the contractor assignments on the jobs the caller can see."""
        return (
            JobContractor.objects.filter_job_ids(job_ids)
            .select_related("contractor")
            .visible_to(current_user(info), Permission.JOBS_VIEW)
        )


class JobsMutation(graphene.ObjectType):
    """Job writes."""

    create_job = CreateJob.Field()
    update_job = UpdateJob.Field()
    delete_job = DeleteJob.Field()
    assign_contractor = AssignContractor.Field()
    update_job_contractor = UpdateJobContractor.Field()
    remove_job_contractor = RemoveJobContractor.Field()
