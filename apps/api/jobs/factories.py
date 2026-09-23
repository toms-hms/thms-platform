"""Test factories for jobs and contractor assignments."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from contractors.factories import ContractorFactory
from contractors.models import TradeCategory
from homes.factories import HomeFactory
from jobs.models import Job, JobContractor, JobContractorStatus, JobIntent, JobStatus


class JobFactory(DjangoModelFactory):
    """Builds a job, creating its home and author unless they are supplied."""

    class Meta:
        model = Job

    home = factory.SubFactory(HomeFactory)
    created_by = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Test Job {n}")
    intent = JobIntent.ISSUE
    category = TradeCategory.PLUMBING
    status = JobStatus.DRAFT


class JobContractorFactory(DjangoModelFactory):
    """Builds a contractor assignment against a job."""

    class Meta:
        model = JobContractor

    job = factory.SubFactory(JobFactory)
    contractor = factory.SubFactory(ContractorFactory)
    status = JobContractorStatus.NOT_CONTACTED
