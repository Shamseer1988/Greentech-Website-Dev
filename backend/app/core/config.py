from pathlib import Path
from typing import Literal

from pydantic import EmailStr, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Reads the .env file in the project root; real environment variables win."""

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    app_env: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5433
    postgres_db: str
    postgres_user: str
    postgres_password: SecretStr

    s3_endpoint: str = "http://127.0.0.1:9000"
    s3_bucket: str = "greentech-media"
    minio_root_user: str
    minio_root_password: SecretStr
    # Public address of the bucket, as seen by a visitor's browser.
    media_public_url: str = "http://127.0.0.1:9000/greentech-media"

    # Signs admin logins.
    jwt_secret: SecretStr = Field(min_length=32)
    login_hours: int = Field(default=8, ge=1, le=72)

    enquiry_limit: int = 5
    enquiry_window_seconds: int = 600

    # The website's public address, for links in emails and posts.
    site_url: str = "http://localhost:3000"

    # Everything below is optional: an empty value switches that feature off.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_security: Literal["starttls", "ssl", "none"] = "starttls"
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    mail_from: str = ""
    enquiry_email_to: list[EmailStr] = []

    turnstile_secret: SecretStr = SecretStr("")

    meta_access_token: SecretStr = SecretStr("")
    meta_page_id: str = ""
    meta_instagram_id: str = ""
    meta_graph_version: str = "v26.0"

    @property
    def mail_enabled(self) -> bool:
        return bool(self.smtp_host and self.mail_from and self.enquiry_email_to)

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


settings = Settings()
