"""Job assignment status transitions."""

from django.test import TestCase

from jobs.factories import JobContractorFactory
from jobs.models import JobContractor, JobContractorStatus


class UpdateStatusTests(TestCase):
    """JobContractorManager.update_status()"""

    def test_stamps_first_contact(self):
        """Moving to CONTACTED records when contact was first made."""
        assignment = JobContractorFactory()
        updated = JobContractor.objects.update_status(assignment.pk, JobContractorStatus.CONTACTED)
        self.assertIsNotNone(updated.last_contacted_at)
        self.assertIsNone(updated.last_response_at)

    def test_stamps_first_response(self):
        """Moving to RESPONDED records both first contact and first response."""
        assignment = JobContractorFactory()
        updated = JobContractor.objects.update_status(assignment.pk, JobContractorStatus.RESPONDED)
        self.assertIsNotNone(updated.last_contacted_at)
        self.assertIsNotNone(updated.last_response_at)

    def test_does_not_overwrite_an_existing_stamp(self):
        """A later status change leaves the original first-contact time alone."""
        assignment = JobContractorFactory()
        JobContractor.objects.update_status(assignment.pk, JobContractorStatus.CONTACTED)
        first_contact = JobContractor.objects.get(pk=assignment.pk).last_contacted_at
        JobContractor.objects.update_status(assignment.pk, JobContractorStatus.QUOTE_RECEIVED)
        self.assertEqual(JobContractor.objects.get(pk=assignment.pk).last_contacted_at, first_contact)

    def test_declined_does_not_count_as_contact(self):
        """DECLINED is outside the contacted set and stamps nothing."""
        assignment = JobContractorFactory()
        updated = JobContractor.objects.update_status(assignment.pk, JobContractorStatus.DECLINED)
        self.assertIsNone(updated.last_contacted_at)

    def test_upsert_updates_notes_instead_of_duplicating(self):
        """Assigning the same contractor twice updates the existing row."""
        assignment = JobContractorFactory()
        again = JobContractor.objects.upsert(assignment.job_id, assignment.contractor_id, "second note")
        self.assertEqual(again.pk, assignment.pk)
        self.assertEqual(again.notes, "second note")
        self.assertEqual(JobContractor.objects.filter(job_id=assignment.job_id).count(), 1)
