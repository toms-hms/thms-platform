"""Test factories for communications."""

import factory
from factory.django import DjangoModelFactory

from communications.models import Communication, CommunicationChannel, CommunicationDirection
from contractors.factories import ContractorFactory
from jobs.factories import JobFactory


class CommunicationFactory(DjangoModelFactory):
    """Builds a message against a job."""

    class Meta:
        model = Communication

    job = factory.SubFactory(JobFactory)
    contractor = factory.SubFactory(ContractorFactory)
    channel = CommunicationChannel.EMAIL
    direction = CommunicationDirection.SENT
    subject = factory.Sequence(lambda n: f"Test subject {n}")
    body_text = "Test body"
    needs_review = False
