"""Job visibility and filters."""

from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from core.services.permission_service import Permission
from homes.factories import HomeFactory
from jobs.factories import JobContractorFactory, JobFactory
from jobs.models import Job, JobContractor, JobStatus


class HomeIdForTests(TestCase):
    """JobQuerySet.home_id_for() and JobContractorQuerySet.home_id_for()"""

    def test_a_job_resolves_to_its_home(self):
        """A job is scoped by the home it sits under."""
        job = JobFactory(home=HomeFactory(owner=UserFactory()))
        self.assertEqual(Job.objects.home_id_for(job.pk), job.home_id)

    def test_an_assignment_resolves_through_its_job(self):
        """An assignment is scoped by its job's home."""
        assignment = JobContractorFactory()
        self.assertEqual(JobContractor.objects.home_id_for(assignment.pk), assignment.job.home_id)

    def test_none_for_an_unknown_job(self):
        """An id that does not exist resolves to no home."""
        self.assertIsNone(Job.objects.home_id_for("missing"))


class VisibleToTests(TestCase):
    """JobQuerySet.visible_to() chained with filters"""

    def setUp(self):
        """Creates a user with one home and job, plus an unrelated home and job."""
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)
        self.job = JobFactory(home=self.home, created_by=self.user)
        self.other_job = JobFactory(home=HomeFactory(owner=UserFactory()))

    def test_returns_only_visible_jobs(self):
        """A user sees jobs on their own homes only."""
        ids = list(Job.objects.visible_to(self.user, Permission.JOBS_VIEW).values_list("pk", flat=True))
        self.assertIn(self.job.pk, ids)
        self.assertNotIn(self.other_job.pk, ids)

    def test_filtering_by_someone_elses_home_returns_nothing(self):
        """Visibility and the home filter compose: another home's jobs stay hidden."""
        jobs = Job.objects.visible_to(self.user, Permission.JOBS_VIEW).filter_home_ids(
            [self.other_job.home_id]
        )
        self.assertFalse(jobs.exists())

    def test_admin_sees_every_job(self):
        """An ADMIN's list spans homes they do not belong to."""
        ids = Job.objects.visible_to(AdminFactory(), Permission.JOBS_VIEW).values_list("pk", flat=True)
        self.assertIn(self.other_job.pk, ids)

    def test_filters_chain(self):
        """Home and status filters narrow together; None leaves a filter off."""
        JobFactory(home=self.home, created_by=self.user, status=JobStatus.COMPLETED)
        jobs = (
            Job.objects.visible_to(self.user, Permission.JOBS_VIEW)
            .filter_home_ids([self.home.pk])
            .filter_statuses([self.job.status])
            .filter_trade_categories(None)
        )
        self.assertEqual(list(jobs.values_list("pk", flat=True)), [self.job.pk])
