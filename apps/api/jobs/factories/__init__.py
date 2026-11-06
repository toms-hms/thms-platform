"""Test factories for the jobs app, one module per model."""

from jobs.factories.job_contractor_factory import JobContractorFactory
from jobs.factories.job_factory import JobFactory

__all__ = [
    "JobFactory",
    "JobContractorFactory",
]
