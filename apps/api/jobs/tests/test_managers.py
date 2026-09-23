"""Job visibility and assignment status transitions."""

from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from accounts.models import UserRole
from core.errors import NotFoundError
from homes.factories import HomeFactory
from jobs.factories import JobContractorFactory, JobFactory
from jobs.models import Job, JobContractor, JobContractorStatus


class JobPermissionTests(TestCase):
    """JobManager.has_permission()"""

    def test_true_for_a_member_of_the_jobs_home(self):
        """Membership of the home grants access to its jobs."""
        user = UserFactory()
        job = JobFactory(home=HomeFactory(owner=user))
        self.assertTrue(Job.objects.has_permission(user.pk, job.pk))

    def test_false_for_a_stranger(self):
        """Someone outside the home cannot access the job."""
        job = JobFactory(home=HomeFactory(owner=UserFactory()))
        self.assertFalse(Job.objects.has_permission(UserFactory().pk, job.pk))

    def test_false_for_an_unknown_job(self):
        """An id that does not exist is not accessible."""
        self.assertFalse(Job.objects.has_permission(UserFactory().pk, "missing"))


class ListForUserTests(TestCase):
    """JobManager.list_for_user()"""

    def setUp(self):
        """Creates a user with one home and job, plus an unrelated home and job."""
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)
        self.job = JobFactory(home=self.home, created_by=self.user)
        self.other_job = JobFactory(home=HomeFactory(owner=UserFactory()))

    def test_returns_only_visible_jobs(self):
        """A user sees jobs on their own homes only."""
        ids = [j.pk for j in Job.objects.list_for_user(self.user.pk, UserRole.USER)]
        self.assertIn(self.job.pk, ids)
        self.assertNotIn(self.other_job.pk, ids)

    def test_filters_by_home(self):
        """Passing a home narrows the list to that home."""
        ids = [j.pk for j in Job.objects.list_for_user(self.user.pk, UserRole.USER, home_id=self.home.pk)]
        self.assertEqual(ids, [self.job.pk])

    def test_rejects_a_home_the_user_cannot_see(self):
        """Filtering by someone else's home raises NotFoundError rather than returning nothing."""
        with self.assertRaises(NotFoundError):
            Job.objects.list_for_user(self.user.pk, UserRole.USER, home_id=self.other_job.home_id)

    def test_admin_sees_every_job(self):
        """An ADMIN's list spans homes they do not belong to."""
        admin = AdminFactory()
        ids = [j.pk for j in Job.objects.list_for_user(admin.pk, UserRole.ADMIN)]
        self.assertIn(self.other_job.pk, ids)


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
