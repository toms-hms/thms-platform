"""Object storage for the platform: where files live and how clients reach them.

Objects are private. Clients upload with a presigned PUT and read with a
presigned GET, so the bucket is never public.
"""

from uuid import uuid4

from django.conf import settings

from core.clients.s3_client import S3Client


class StorageService:
    """Stores and serves files through S3-compatible storage."""

    def __init__(self, *, s3: S3Client | None = None) -> None:
        self.s3 = s3 or S3Client()

    def job_file_key(self, *, job_id: str, folder: str, extension: str) -> str:
        """Returns a fresh, collision-free key for a file belonging to a job."""
        return f"jobs/{job_id}/{folder.lower()}/{uuid4()}.{extension}"

    def upload_url(self, *, key: str, content_type: str) -> str:
        """Returns a presigned PUT URL for writing the object at key."""
        return self.s3.presigned_put(
            key=key, content_type=content_type, expires_in=settings.UPLOAD_URL_EXPIRES_IN
        )

    def download_url(self, *, key: str) -> str:
        """Returns a presigned GET URL for reading the object at key."""
        return self.s3.presigned_get(key=key, expires_in=settings.DOWNLOAD_URL_EXPIRES_IN)

    def put(self, *, key: str, body: bytes, content_type: str) -> None:
        """Writes bytes to storage under key."""
        self.s3.put_object(key=key, body=body, content_type=content_type)

    def delete(self, *, key: str) -> None:
        """Removes the object at key."""
        self.s3.delete_object(key=key)
