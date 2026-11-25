import json
import logging
from functools import lru_cache
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class Storage:
    """Files in MinIO. boto3 is the standard S3 client, so any S3 service works."""

    def __init__(self) -> None:
        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.minio_root_user,
            aws_secret_access_key=settings.minio_root_password.get_secret_value(),
            region_name="us-east-1",
            config=Config(
                s3={"addressing_style": "path"},
                connect_timeout=3,
                read_timeout=60,
                retries={"max_attempts": 2},
            ),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as exc:
            if exc.response["Error"]["Code"] not in ("404", "NoSuchBucket"):
                raise
            self.client.create_bucket(Bucket=self.bucket)
        # Visitors may open a file by its URL, but not list or change files.
        self.client.put_bucket_policy(
            Bucket=self.bucket,
            Policy=json.dumps(
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": ["*"]},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                        }
                    ],
                }
            ),
        )

    def save(self, key: str, file: BinaryIO, content_type: str) -> None:
        self.client.upload_fileobj(
            file,
            self.bucket,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )

    def read(self, key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)


@lru_cache
def get_storage() -> Storage:
    return Storage()


def delete_file(storage: Storage, key: str) -> None:
    """Remove a file that is no longer used. A failure only leaves a spare file behind."""
    try:
        storage.delete(key)
    except Exception:
        logger.exception("Could not remove file %s", key)
