"""Test factory for ai generation rows."""

import factory
from factory.django import DjangoModelFactory

from accounts.factories import UserFactory
from ai.models import AIGeneration, AIGenerationStatus
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
