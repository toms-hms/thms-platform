"""Test factory for job rows."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from contractors.models import TradeCategory
from homes.factories import HomeFactory
from jobs.models import Job, JobIntent, JobStatus


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
