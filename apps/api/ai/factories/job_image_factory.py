"""Test factory for job image rows."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from ai.models import JobImage, JobImageKind
from jobs.factories import JobFactory


class JobImageFactory(DjangoModelFactory):
    """Builds a job image row."""

    class Meta:
        model = JobImage

    job = factory.SubFactory(JobFactory)
    storage_key = factory.Sequence(lambda n: f"jobs/test/source/{n}.png")
    kind = JobImageKind.SOURCE
    uploaded_by = factory.SubFactory(UserFactory)
