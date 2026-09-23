"""The audit log: what gets recorded, who it is attributed to, and who can read it."""

from auditlog.models import LogEntry

from accounts.factories import AdminFactory, UserFactory
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from jobs.factories import JobFactory
from jobs.models import Job

AUDIT_LOG = """
query($objectType: String, $objectId: String) {
  auditLog(objectType: $objectType, objectId: $objectId) {
    action objectType objectId actorEmail changes
  }
}
"""
CREATE_HOME = """
mutation($name: String!, $address1: String!, $city: String!, $state: String!, $zipCode: String!) {
  createHome(name: $name, address1: $address1, city: $city, state: $state, zipCode: $zipCode) {
    home { id }
  }
}
"""


class AuditRecordingTests(GraphQLTestCase):
    """What the log records"""

    def test_records_a_create(self):
        """Creating a row writes a CREATE entry against it."""
        job = JobFactory()
        entry = LogEntry.objects.get(object_pk=job.pk, content_type__model="job")
        self.assertEqual(entry.action, LogEntry.Action.CREATE)

    def test_records_field_level_changes_on_update(self):
        """An update records the before and after values of the fields that changed."""
        job = JobFactory(title="Before")
        job.title = "After"
        job.save()
        entry = LogEntry.objects.filter(object_pk=job.pk, action=LogEntry.Action.UPDATE).first()
        self.assertEqual(entry.changes["title"], ["Before", "After"])

    def test_records_a_delete(self):
        """Deleting a row writes a DELETE entry."""
        job = JobFactory()
        job_id = job.pk
        job.delete()
        self.assertTrue(LogEntry.objects.filter(object_pk=job_id, action=LogEntry.Action.DELETE).exists())

    def test_attributes_the_change_to_the_authenticated_caller(self):
        """A change made through the API names the user who made it."""
        user = UserFactory()
        body = self.execute(
            CREATE_HOME,
            {"name": "Audited", "address1": "1 St", "city": "Austin", "state": "TX", "zipCode": "78701"},
            token=self.token_for(user),
        )
        home_id = self.assert_ok(body)["createHome"]["home"]["id"]
        entry = LogEntry.objects.get(object_pk=home_id, content_type__model="home")
        self.assertEqual(entry.actor_id, user.pk)

    def test_does_not_record_password_hashes(self):
        """Credential fields are excluded from the log."""
        user = UserFactory()
        user.password = "$2b$04$changed-hash-value-placeholder"
        user.save()
        entries = LogEntry.objects.filter(object_pk=user.pk, content_type__model="user")
        for entry in entries:
            self.assertNotIn("password", entry.changes)


class AuditLogQueryTests(GraphQLTestCase):
    """query auditLog"""

    def setUp(self):
        """Creates a job so there is at least one entry to read."""
        super().setUp()
        self.job = JobFactory()

    def test_admin_can_read_the_log(self):
        """An admin reads entries, most recent first."""
        data = self.assert_ok(
            self.execute(AUDIT_LOG, {"objectType": "job"}, token=self.token_for(AdminFactory()))
        )
        self.assertTrue(data["auditLog"])
        self.assertEqual(data["auditLog"][0]["objectType"], "job")

    def test_filters_by_object(self):
        """Entries can be narrowed to a single object."""
        other = JobFactory()
        body = self.execute(
            AUDIT_LOG, {"objectType": "job", "objectId": self.job.pk}, token=self.token_for(AdminFactory())
        )
        object_ids = {entry["objectId"] for entry in self.assert_ok(body)["auditLog"]}
        self.assertEqual(object_ids, {self.job.pk})
        self.assertNotIn(other.pk, object_ids)

    def test_regular_users_may_not_read_the_log(self):
        """The audit log is admin-only."""
        self.assert_error_code(self.execute(AUDIT_LOG, token=self.token_for(UserFactory())), "FORBIDDEN")

    def test_requires_a_token(self):
        """Reading the log without a token is UNAUTHORIZED."""
        self.assert_error_code(self.execute(AUDIT_LOG), "UNAUTHORIZED")


class AuditIsolationTests(GraphQLTestCase):
    """Entries are tied to the object they describe"""

    def test_home_and_job_entries_are_separate(self):
        """A job's entries are not attributed to its home."""
        home = HomeFactory(owner=UserFactory())
        job = JobFactory(home=home)
        job_entries = LogEntry.objects.filter(object_pk=job.pk, content_type__model="job")
        home_entries = LogEntry.objects.filter(object_pk=home.pk, content_type__model="home")
        self.assertTrue(job_entries.exists())
        self.assertTrue(home_entries.exists())
        self.assertEqual(Job.objects.filter(pk=job.pk).count(), 1)
