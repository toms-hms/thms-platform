"""Test factories for AI generations and job images."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from jobs.factories import JobFactory


class AIGenerationFactory(DjangoModelFactory):
    """Builds a generation record against a job."""

    class Meta:
        model = AIGeneration

    job = factory.SubFactory(JobFactory)
    prompt = "Make the yard greener"
    provider = "openai"
    status = AIGenerationStatus.COMPLETED
    created_by = factory.SubFactory(UserFactory)


class JobImageFactory(DjangoModelFactory):
    """Builds a job image row."""

    class Meta:
        model = JobImage

    job = factory.SubFactory(JobFactory)
    storage_key = factory.Sequence(lambda n: f"jobs/test/source/{n}.png")
    kind = JobImageKind.SOURCE
    uploaded_by = factory.SubFactory(UserFactory)
