"""The image and generation GraphQL surface."""

from unittest.mock import patch

from accounts.factories import UserFactory
from ai.factories import JobImageFactory
from ai.models import JobImage
from core.testing import GraphQLTestCase
from homes.factories import HomeFactory
from jobs.factories import JobFactory
from uploads import services as uploads

IMAGES = "query($jobId: ID!) { jobImages(jobId: $jobId) { id kind url } }"
UPLOAD_URL = """
mutation($jobId: ID!, $fileName: String!, $contentType: String!, $kind: String!) {
  requestUploadUrl(jobId: $jobId, fileName: $fileName, contentType: $contentType, kind: $kind) {
    upload { uploadUrl key kind }
  }
}
"""
CONFIRM = """
mutation($jobId: ID!, $key: String!, $kind: String) {
  confirmUpload(jobId: $jobId, key: $key, kind: $kind) { image { id storageKey kind } }
}
"""


class JobImagesTests(GraphQLTestCase):
    """query jobImages / mutation requestUploadUrl / confirmUpload"""

    def setUp(self):
        """Creates a job with one image, owned by one user."""
        super().setUp()
        self.user = UserFactory()
        self.other = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)
        self.image = JobImageFactory(job=self.job, uploaded_by=self.user)

    def test_lists_images_with_a_presigned_url(self):
        """Each image comes back with a URL the client can read it from."""
        with patch.object(uploads, "get_download_url", return_value="https://signed.test/image.png"):
            data = self.assert_ok(
                self.execute(IMAGES, {"jobId": self.job.pk}, token=self.token_for(self.user))
            )
        self.assertEqual(data["jobImages"][0]["url"], "https://signed.test/image.png")

    def test_is_forbidden_for_a_stranger(self):
        """Someone outside the home cannot list the job's images."""
        body = self.execute(IMAGES, {"jobId": self.job.pk}, token=self.token_for(self.other))
        self.assert_error_code(body, "FORBIDDEN")

    def test_issues_an_upload_url_for_a_visible_job(self):
        """The owner gets a presigned PUT target keyed under the job."""
        with patch.object(
            uploads,
            "get_upload_url",
            return_value={"upload_url": "https://put.test", "key": "jobs/k.png", "kind": "SOURCE"},
        ):
            body = self.execute(
                UPLOAD_URL,
                {"jobId": self.job.pk, "fileName": "photo.png", "contentType": "image/png", "kind": "SOURCE"},
                token=self.token_for(self.user),
            )
        upload = self.assert_ok(body)["requestUploadUrl"]["upload"]
        self.assertEqual(upload["uploadUrl"], "https://put.test")

    def test_stranger_cannot_request_an_upload_url(self):
        """Uploading to someone else's job is FORBIDDEN."""
        body = self.execute(
            UPLOAD_URL,
            {"jobId": self.job.pk, "fileName": "photo.png", "contentType": "image/png", "kind": "SOURCE"},
            token=self.token_for(self.other),
        )
        self.assert_error_code(body, "FORBIDDEN")

    def test_confirming_an_upload_writes_the_image_row(self):
        """Confirmation records the uploaded object against the job."""
        body = self.execute(
            CONFIRM,
            {"jobId": self.job.pk, "key": "jobs/x/source/new.png", "kind": "SOURCE"},
            token=self.token_for(self.user),
        )
        image = self.assert_ok(body)["confirmUpload"]["image"]
        self.assertTrue(JobImage.objects.filter(pk=image["id"], storage_key="jobs/x/source/new.png").exists())
