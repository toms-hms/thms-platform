"""Job creation and updates."""

from django.test import TestCase

from accounts.factories import UserFactory
from contractors.models import TradeCategory
from homes.factories import HomeFactory
from jobs.factories import JobContractorFactory, JobFactory
from jobs.models import JobContractor, JobContractorStatus, JobIntent, JobStatus
from jobs.services.job_contractor_service import JobContractorService
from jobs.services.job_service import JobService


class CreateJobTests(TestCase):
    """JobService.create()"""

    def setUp(self):
        """Creates the acting user and their home."""
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_creates_a_draft_job(self):
        """A job starts in DRAFT unless another status is given."""
        job = JobService().create(
            home_id=self.home.pk, user_id=self.user.pk, title="Leak", category=TradeCategory.PLUMBING
        )
        self.assertEqual(job.status, JobStatus.DRAFT)
        self.assertEqual(job.intent, JobIntent.ISSUE)
        self.assertEqual(job.created_by_id, self.user.pk)

    def test_records_confirmed_categories_in_the_ai_session(self):
        """The categories the user confirmed are stored alongside the transcript."""
        job = JobService().create(
            home_id=self.home.pk,
            user_id=self.user.pk,
            title="Rewire",
            category=TradeCategory.ELECTRICAL,
            categories=[TradeCategory.ELECTRICAL, TradeCategory.CARPENTRY],
        )
        self.assertEqual(
            job.ai_session["confirmedCategories"], [TradeCategory.ELECTRICAL, TradeCategory.CARPENTRY]
        )

    def test_leaves_the_ai_session_empty_when_there_is_nothing_to_record(self):
        """A plain job carries no AI session."""
        job = JobService().create(
            home_id=self.home.pk, user_id=self.user.pk, title="Paint", category=TradeCategory.PAINTING
        )
        self.assertEqual(job.ai_session["confirmedCategories"], [TradeCategory.PAINTING])


class UpdateJobTests(TestCase):
    """JobService.update()"""

    def test_updates_only_the_supplied_fields(self):
        """Fields that are not supplied keep their existing values."""
        job = JobFactory(title="Old", description="Keep me")
        updated = JobService().update(job_id=job.pk, title="New")
        self.assertEqual(updated.title, "New")
        self.assertEqual(updated.description, "Keep me")

    def test_confirmed_categories_drive_the_primary_category(self):
        """The first confirmed category becomes the job's category."""
        job = JobFactory(category=TradeCategory.PLUMBING)
        updated = JobService().update(job_id=job.pk, categories=[TradeCategory.HVAC, TradeCategory.PLUMBING])
        self.assertEqual(updated.category, TradeCategory.HVAC)

    def test_status_is_only_changed_when_asked(self):
        """An update that does not mention status leaves it untouched."""
        job = JobFactory(status=JobStatus.SCHEDULED)
        updated = JobService().update(job_id=job.pk, title="Renamed")
        self.assertEqual(updated.status, JobStatus.SCHEDULED)


class UpdateStatusTests(TestCase):
    """JobContractorService.update_status()"""

    def test_stamps_first_contact(self):
        """Moving to CONTACTED records when contact was first made."""
        assignment = JobContractorFactory()
        updated = JobContractorService().update_status(
            job_contractor_id=assignment.pk, status=JobContractorStatus.CONTACTED
        )
        self.assertIsNotNone(updated.last_contacted_at)
        self.assertIsNone(updated.last_response_at)

    def test_stamps_first_response(self):
        """Moving to RESPONDED records both first contact and first response."""
        assignment = JobContractorFactory()
        updated = JobContractorService().update_status(
            job_contractor_id=assignment.pk, status=JobContractorStatus.RESPONDED
        )
        self.assertIsNotNone(updated.last_contacted_at)
        self.assertIsNotNone(updated.last_response_at)

    def test_does_not_overwrite_an_existing_stamp(self):
        """A later status change leaves the original first-contact time alone."""
        assignment = JobContractorFactory()
        JobContractorService().update_status(
            job_contractor_id=assignment.pk, status=JobContractorStatus.CONTACTED
        )
        first_contact = JobContractor.objects.get(pk=assignment.pk).last_contacted_at
        JobContractorService().update_status(
            job_contractor_id=assignment.pk, status=JobContractorStatus.QUOTE_RECEIVED
        )
        self.assertEqual(JobContractor.objects.get(pk=assignment.pk).last_contacted_at, first_contact)

    def test_declined_does_not_count_as_contact(self):
        """DECLINED is outside the contacted set and stamps nothing."""
        assignment = JobContractorFactory()
        updated = JobContractorService().update_status(
            job_contractor_id=assignment.pk, status=JobContractorStatus.DECLINED
        )
        self.assertIsNone(updated.last_contacted_at)
