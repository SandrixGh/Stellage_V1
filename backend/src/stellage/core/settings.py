from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE_PATH = Path(__file__).parent.parent.parent.parent / ".env"
TEMPLATES_DIR = str(Path(__file__).parent.parent.parent.parent / "templates")

class BaseAppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

class DbSettings(BaseAppSettings):
    db_name: str
    db_user: str
    db_password: SecretStr
    db_host: str
    db_port: int
    db_echo: bool

    @property
    def db_url(self):
        return \
            f"postgresql+asyncpg://{self.db_user}:{self.db_password.get_secret_value()}@{self.db_host}:{self.db_port}/{self.db_name}"


class EmailSettings(BaseAppSettings):
    email_host: str
    email_port: int
    email_username: str
    email_password: SecretStr


class RedisSettings(BaseAppSettings):
    redis_host: str
    redis_port: int
    redis_db: int

    @property
    def redis_url(self):
        return (
            f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
        )


class S3Settings(BaseAppSettings):
    s3_endpoint_url: str
    s3_region: str
    s3_access_key_id: str
    s3_secret_access_key: SecretStr
    s3_bucket_name: str

    # Браузерный endpoint для presigned-ссылок. SigV4 подписывает заголовок Host,
    # поэтому подпись обязана делаться под адрес, по которому пойдёт браузер:
    # в Docker backend видит MinIO как http://minio:9000, а браузер —
    # http://localhost:9000. None = совпадает с s3_endpoint_url (Selectel, прод).
    s3_public_endpoint_url: str | None = None

    # "path" (https://endpoint/bucket/key) работает и у MinIO, и у Selectel;
    # "virtual" (https://bucket.endpoint/key) — на случай смены провайдера.
    s3_addressing_style: str = "path"

    upload_url_expire_seconds: int = 600
    download_url_expire_seconds: int = 300

    @property
    def browser_endpoint_url(self) -> str:
        return self.s3_public_endpoint_url or self.s3_endpoint_url


class AppSettings(BaseAppSettings):
    db_settings: DbSettings = DbSettings()

    secret_key: SecretStr

    email_settings: EmailSettings = EmailSettings()
    redis_settings: RedisSettings = RedisSettings()
    s3_settings: S3Settings = S3Settings()

    templates_dir: str = TEMPLATES_DIR
    frontend_url: str

    access_token_expire: int
    # Долгоживущий refresh-токен: пока он жив, короткий access молча
    # перевыпускается через POST /auth/refresh, поэтому пользователя не
    # выкидывает по истечении часа. По умолчанию 30 дней.
    refresh_token_expire: int = 60 * 60 * 24 * 30

    confirmation_code_length: int

    # "development" | "production"
    environment: str = "development"

    # Set to True in production (HTTPS) so the auth cookie is only sent
    # over secure connections. Kept False by default for local http dev.
    cookie_secure: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

settings = AppSettings()