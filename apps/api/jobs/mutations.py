"""GraphQL writes for jobs and contractor assignments."""

import graphene

from core.enums import JobContractorStatusEnum, JobIntentEnum, JobStatusEnum, TradeCategoryEnum
from core.graphql import authorize, current_user
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
        category = TradeCategoryEnum(required=True)
        title = graphene.String(required=True)
        ai_session = graphene.JSONString()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        description = graphene.String()
        intent = JobIntentEnum()
        notes = graphene.String()
        status = JobStatusEnum()

    job = graphene.Field(JobType)

    @authorize(Permission.JOBS_EDIT, arg="home_id", resource=Home)
    def mutate(self, info, home_id: str, **data):
        """Creates the job on the home."""
        return CreateJob(job=JobService().create(home_id=home_id, user_id=current_user(info).pk, **data))


class UpdateJob(graphene.Mutation):
    """Updates a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)
        ai_session = graphene.JSONString()
        categories = graphene.List(graphene.NonNull(TradeCategoryEnum))
        category = TradeCategoryEnum()
        description = graphene.String()
        intent = JobIntentEnum()
        notes = graphene.String()
        status = JobStatusEnum()
        title = graphene.String()

    job = graphene.Field(JobType)

    @authorize(Permission.JOBS_EDIT, arg="job_id", resource=Job)
    def mutate(self, info, job_id: str, **data):
        """Applies the update to the job."""
        return UpdateJob(job=JobService().update(job_id=job_id, **data))


class DeleteJob(graphene.Mutation):
    """Deletes a job the caller can access."""

    class Arguments:
        job_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, arg="job_id", resource=Job)
    def mutate(self, info, job_id: str):
        """Deletes the job."""
        JobService().delete(job_id=job_id)
        return DeleteJob(success=True)


class CreateJobContractor(graphene.Mutation):
    """Assigns a contractor to a job."""

    class Arguments:
        contractor_id = graphene.ID(required=True)
        job_id = graphene.ID(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @authorize(Permission.JOBS_EDIT, arg="job_id", resource=Job)
    def mutate(self, info, job_id: str, contractor_id: str, notes: str | None = None):
        """Creates or updates the assignment."""
        return CreateJobContractor(
            job_contractor=JobContractorService().create(
                contractor_id=contractor_id, job_id=job_id, notes=notes
            )
        )


class UpdateJobContractor(graphene.Mutation):
    """Moves a contractor assignment to a new status."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)
        status = JobContractorStatusEnum(required=True)
        notes = graphene.String()

    job_contractor = graphene.Field(JobContractorType)

    @authorize(Permission.JOBS_EDIT, arg="job_contractor_id", resource=JobContractor)
    def mutate(self, info, job_contractor_id: str, status: str, **extra):
        """Applies the status change. Omitting notes leaves them unchanged."""
        return UpdateJobContractor(
            job_contractor=JobContractorService().update(
                job_contractor_id=job_contractor_id, status=status, **extra
            )
        )


class DeleteJobContractor(graphene.Mutation):
    """Removes a contractor from a job."""

    class Arguments:
        job_contractor_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, arg="job_contractor_id", resource=JobContractor)
    def mutate(self, info, job_contractor_id: str):
        """Removes the assignment."""
        JobContractorService().delete(job_contractor_id=job_contractor_id)
        return DeleteJobContractor(success=True)


class JobsMutation(graphene.ObjectType):
    """Job writes."""

    create_job = CreateJob.Field()
    update_job = UpdateJob.Field()
    delete_job = DeleteJob.Field()
    create_job_contractor = CreateJobContractor.Field()
    update_job_contractor = UpdateJobContractor.Field()
    delete_job_contractor = DeleteJobContractor.Field()
