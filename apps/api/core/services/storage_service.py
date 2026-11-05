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
        self._s3 = s3 or S3Client()

    def job_file_key(self, *, job_id: str, extension: str, folder: str) -> str:
        """Returns a fresh, collision-free key for a file belonging to a job."""
        return f"jobs/{job_id}/{folder.lower()}/{uuid4()}.{extension}"

    def upload_url(self, *, content_type: str, key: str) -> str:
        """Returns a presigned PUT URL for writing the object at key."""
        return self._s3.presigned_put(
            content_type=content_type, expires_in=settings.UPLOAD_URL_EXPIRES_IN, key=key
        )

    def download_url(self, *, key: str) -> str:
        """Returns a presigned GET URL for reading the object at key."""
        return self._s3.presigned_get(expires_in=settings.DOWNLOAD_URL_EXPIRES_IN, key=key)

    def put(self, *, body: bytes, content_type: str, key: str) -> None:
        """Writes bytes to storage under key."""
        self._s3.put_object(body=body, content_type=content_type, key=key)

    def delete(self, *, key: str) -> None:
        """Removes the object at key."""
        self._s3.delete_object(key=key)
