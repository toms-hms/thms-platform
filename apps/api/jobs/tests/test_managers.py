"""Job assignment status transitions."""

from django.test import TestCase

from jobs.factories import JobContractorFactory
from jobs.models import JobContractor


class UpsertTests(TestCase):
    """JobContractorManager.upsert()"""

    def test_upsert_updates_notes_instead_of_duplicating(self):
        """Assigning the same contractor twice updates the existing row."""
        assignment = JobContractorFactory()
        again = JobContractor.objects.upsert(
            job_id=assignment.job_id, contractor_id=assignment.contractor_id, notes="second note"
        )
        self.assertEqual(again.pk, assignment.pk)
        self.assertEqual(again.notes, "second note")
        self.assertEqual(JobContractor.objects.filter(job_id=assignment.job_id).count(), 1)
