"""Job images: the three-step upload (presign, PUT, confirm) and deletion."""

from ai.models import JobImage, JobImageKind
from ai.models.job_image.manager import JobImageManager
from core.errors import NotFoundError
from core.services.storage_service import StorageService


class JobImageService:
    """Uploads and removes the images attached to a job."""

    def __init__(
        self,
        *,
        job_image_manager: JobImageManager | None = None,
        storage_service: StorageService | None = None,
    ) -> None:
        self._job_image_manager = job_image_manager or JobImage.objects
        self._storage_service = storage_service or StorageService()

    def request_upload(self, *, job_id: str, content_type: str, file_name: str, kind: str) -> dict[str, str]:
        """Returns a presigned upload URL and the key the client must confirm with."""
        extension = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
        key = self._storage_service.job_file_key(job_id=job_id, extension=extension, folder=kind)
        return {
            "upload_url": self._storage_service.upload_url(content_type=content_type, key=key),
            "key": key,
            "kind": kind,
        }

    def create(
        self, *, job_id: str, user_id: str, key: str, kind: str | None = None, label: str | None = None
    ) -> JobImage:
        """Records an uploaded object as a job image."""
        return self._job_image_manager.create(
            job_id=job_id,
            uploaded_by_id=user_id,
            kind=kind or JobImageKind.SOURCE,
            label=label,
            storage_key=key,
        )

    def delete(self, *, image_id: str) -> None:
        """Deletes the image row and its stored object. The caller has already checked access."""
        image = self._job_image_manager.find(pk=image_id)
        if image is None:
            raise NotFoundError("JobImage")
        self._storage_service.delete(key=image.storage_key)
        self._job_image_manager.delete(image)
