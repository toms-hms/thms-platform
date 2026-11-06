"""Test factory for job contractor rows."""

import factory
from factory.django import DjangoModelFactory

from contractors.factories import ContractorFactory
from jobs.factories.job_factory import JobFactory
from jobs.models import JobContractor, JobContractorStatus


class JobContractorFactory(DjangoModelFactory):
    """Builds a contractor assignment against a job."""

    class Meta:
        model = JobContractor

    job = factory.SubFactory(JobFactory)
    contractor = factory.SubFactory(ContractorFactory)
    status = JobContractorStatus.NOT_CONTACTED
