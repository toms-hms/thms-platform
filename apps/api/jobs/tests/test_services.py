"""Job creation and updates."""

from django.test import TestCase

from accounts.factories import UserFactory
from contractors.models import TradeCategory
from homes.factories import HomeFactory
from jobs import services
from jobs.factories import JobFactory
from jobs.models import JobIntent, JobStatus


class CreateJobTests(TestCase):
    """create_job()"""

    def setUp(self):
        """Creates the acting user and their home."""
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_creates_a_draft_job(self):
        """A job starts in DRAFT unless another status is given."""
        job = services.create_job(
            self.home.pk, self.user.pk, {"title": "Leak", "category": TradeCategory.PLUMBING}
        )
        self.assertEqual(job.status, JobStatus.DRAFT)
        self.assertEqual(job.intent, JobIntent.ISSUE)
        self.assertEqual(job.created_by_id, self.user.pk)

    def test_records_confirmed_categories_in_the_ai_session(self):
        """The categories the user confirmed are stored alongside the transcript."""
        job = services.create_job(
            self.home.pk,
            self.user.pk,
            {
                "title": "Rewire",
                "category": TradeCategory.ELECTRICAL,
                "categories": [TradeCategory.ELECTRICAL, TradeCategory.CARPENTRY],
            },
        )
        self.assertEqual(
            job.ai_session["confirmedCategories"], [TradeCategory.ELECTRICAL, TradeCategory.CARPENTRY]
        )

    def test_leaves_the_ai_session_empty_when_there_is_nothing_to_record(self):
        """A plain job carries no AI session."""
        job = services.create_job(
            self.home.pk, self.user.pk, {"title": "Paint", "category": TradeCategory.PAINTING}
        )
        self.assertEqual(job.ai_session["confirmedCategories"], [TradeCategory.PAINTING])


class UpdateJobTests(TestCase):
    """update_job()"""

    def test_updates_only_the_supplied_fields(self):
        """Fields that are not supplied keep their existing values."""
        job = JobFactory(title="Old", description="Keep me")
        updated = services.update_job(job.pk, {"title": "New"})
        self.assertEqual(updated.title, "New")
        self.assertEqual(updated.description, "Keep me")

    def test_confirmed_categories_drive_the_primary_category(self):
        """The first confirmed category becomes the job's category."""
        job = JobFactory(category=TradeCategory.PLUMBING)
        updated = services.update_job(job.pk, {"categories": [TradeCategory.HVAC, TradeCategory.PLUMBING]})
        self.assertEqual(updated.category, TradeCategory.HVAC)

    def test_status_is_only_changed_when_asked(self):
        """An update that does not mention status leaves it untouched."""
        job = JobFactory(status=JobStatus.SCHEDULED)
        updated = services.update_job(job.pk, {"title": "Renamed"})
        self.assertEqual(updated.status, JobStatus.SCHEDULED)
