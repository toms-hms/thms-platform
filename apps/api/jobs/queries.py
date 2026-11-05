"""GraphQL reads for jobs and contractor assignments."""

import graphene

from core.enums import JobStatusEnum, TradeCategoryEnum
from core.errors import NotFoundError
from core.graphql import authorize, current_user, login_required
from core.services.permission_service import Permission
from jobs.models import Job, JobContractor
from jobs.types import JobContractorType, JobType


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
            Job.objects.filter_home_ids(home_ids)
            .filter_statuses(statuses)
            .filter_trade_categories(trade_categories)
            .visible_to(current_user(info), Permission.JOBS_VIEW)
        )

    @authorize(Permission.JOBS_VIEW, arg="job_id", resource=Job)
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
