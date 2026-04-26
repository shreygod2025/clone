"""
Cloudflare R2 storage client (S3-compatible).

Used for file uploads that need to go to R2 instead of Cloudinary.
The existing upload endpoint uses Cloudinary -- this module is available
for new features or for migrating away from Cloudinary in the future.
"""
import boto3
from botocore.config import Config
from config import (
    R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT,
    R2_BUCKET, R2_PUBLIC_URL,
)

_client = None


def get_r2_client():
    global _client
    if _client is None:
        if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY or not R2_ENDPOINT:
            raise RuntimeError("R2 storage not configured -- set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT")
        _client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
        )
    return _client


def upload_file(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file to R2 and return its public URL."""
    client = get_r2_client()
    key = f"uploads/{filename}"
    client.put_object(Bucket=R2_BUCKET, Key=key, Body=file_bytes, ContentType=content_type)
    return f"{R2_PUBLIC_URL}/{key}"


def get_file_url(filename: str) -> str:
    """Get the public URL for a file in R2."""
    return f"{R2_PUBLIC_URL}/uploads/{filename}"
