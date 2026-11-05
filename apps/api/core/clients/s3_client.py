"""S3-compatible object storage client (MinIO locally, S3 in production).

The only module that imports boto3. No business logic: callers pass full keys.
"""

import boto3
from botocore.client import Config
from django.conf import settings


class S3Client:
    """Thin wrapper over the boto3 S3 client for the configured bucket."""

    def __init__(self, *, bucket: str | None = None) -> None:
        self._bucket = bucket or settings.MINIO_BUCKET
        self._sdk = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def presigned_put(self, *, content_type: str, expires_in: int, key: str) -> str:
        """Returns a presigned URL a client can PUT the object's bytes to."""
        return self._sdk.generate_presigned_url(
            "put_object",
            Params={"Bucket": self._bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )

    def presigned_get(self, *, expires_in: int, key: str) -> str:
        """Returns a presigned URL a client can GET the object from."""
        return self._sdk.generate_presigned_url(
            "get_object", Params={"Bucket": self._bucket, "Key": key}, ExpiresIn=expires_in
        )

    def put_object(self, *, body: bytes, content_type: str, key: str) -> None:
        """Writes bytes to the bucket under key."""
        self._sdk.put_object(Bucket=self._bucket, Key=key, Body=body, ContentType=content_type)

    def delete_object(self, *, key: str) -> None:
        """Removes the object at key."""
        self._sdk.delete_object(Bucket=self._bucket, Key=key)
