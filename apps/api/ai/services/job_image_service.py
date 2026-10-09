"""Job images: the three-step upload (presign, PUT, confirm) and deletion."""

from ai.models import JobImage, JobImageKind
from core.services.storage_service import StorageService


class JobImageService:
    """Uploads and removes the images attached to a job."""

    def __init__(self, *, storage: StorageService | None = None) -> None:
        self.storage = storage or StorageService()

    def request_upload(self, *, job_id: str, file_name: str, content_type: str, kind: str) -> dict[str, str]:
        """Returns a presigned upload URL and the key the client must confirm with."""
        extension = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
        key = self.storage.job_file_key(job_id=job_id, folder=kind, extension=extension)
        return {
            "upload_url": self.storage.upload_url(key=key, content_type=content_type),
            "key": key,
            "kind": kind,
        }

    def confirm_upload(
        self, *, job_id: str, user_id: str, key: str, kind: str | None = None, label: str | None = None
    ) -> JobImage:
        """Records an uploaded object as a job image."""
        return JobImage.objects.create(
            job_id=job_id,
            storage_key=key,
            kind=kind or JobImageKind.SOURCE,
            label=label,
            uploaded_by_id=user_id,
        )

    def delete(self, *, image_id: str) -> None:
        """Deletes the image row and its stored object. The caller has already checked access."""
        image = JobImage.objects.get_or_404(pk=image_id)
        self.storage.delete(key=image.storage_key)
        image.delete()
