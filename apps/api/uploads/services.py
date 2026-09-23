"""Object storage for job images.

Uploads are direct-to-storage: the client asks for a presigned PUT URL, uploads
the bytes itself, then confirms so the image row is written. Downloads are
presigned GETs, so the bucket itself stays private.
"""

from typing import Any
from uuid import uuid4

import boto3
from botocore.client import Config
from django.conf import settings

from core.errors import NotFoundError


def _client():
    """Returns an S3 client pointed at the configured MinIO/S3 endpoint."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        region_name="us-east-1",
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def get_upload_url(*, job_id: str, file_name: str, content_type: str, kind: str = "SOURCE") -> dict[str, str]:
    """Returns a presigned PUT URL and the storage key the client should upload to."""
    extension = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
    key = f"jobs/{job_id}/{kind.lower()}/{uuid4()}.{extension}"
    upload_url = _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.MINIO_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=settings.UPLOAD_URL_EXPIRES_IN,
    )
    return {"upload_url": upload_url, "key": key, "kind": kind}


def get_download_url(key: str) -> str:
    """Returns a presigned GET URL for an object in the bucket."""
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.MINIO_BUCKET, "Key": key},
        ExpiresIn=settings.DOWNLOAD_URL_EXPIRES_IN,
    )


def put_object(key: str, body: bytes, content_type: str) -> None:
    """Writes bytes to the bucket under the given key."""
    _client().put_object(Bucket=settings.MINIO_BUCKET, Key=key, Body=body, ContentType=content_type)


def delete_object(key: str) -> None:
    """Removes an object from the bucket."""
    _client().delete_object(Bucket=settings.MINIO_BUCKET, Key=key)


def confirm_upload(
    *, job_id: str, user_id: str, key: str, kind: str = "SOURCE", label: str | None = None
) -> Any:
    """Records an uploaded object as a job image."""
    from ai.models import JobImage

    return JobImage.objects.create(
        job_id=job_id, storage_key=key, kind=kind, label=label, uploaded_by_id=user_id
    )


def delete_job_image(image_id: str, user_id: str) -> None:
    """Deletes a job image and its stored object, after checking access to the job."""
    from ai.models import JobImage
    from jobs.models import Job

    image = JobImage.objects.filter(pk=image_id).first()
    if not image:
        raise NotFoundError("Image")
    if not Job.objects.has_permission(user_id, image.job_id):
        raise NotFoundError("Job")
    delete_object(image.storage_key)
    image.delete()
