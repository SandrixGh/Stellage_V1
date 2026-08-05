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
    db_port: int = 5432
    db_echo: bool = False
    db_ssl: bool = False

    @property
    def db_url(self) -> str:
        base = f"postgresql+asyncpg://{self.db_user}:{self.db_password.get_secret_value()}@{self.db_host}:{self.db_port}/{self.db_name}"
        if self.db_ssl or "neon.tech" in self.db_host:
            return f"{base}?ssl=require"
        return base


class EmailSettings(BaseAppSettings):
    email_host: str = "smtp.gmail.com"
    email_port: int = 465
    email_username: str = ""
    email_password: SecretStr = SecretStr("")


class RedisSettings(BaseAppSettings):
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: SecretStr | None = None

    @property
    def redis_url(self) -> str:
        if self.redis_password and self.redis_password.get_secret_value():
            pwd = self.redis_password.get_secret_value()
            return f"rediss://default:{pwd}@{self.redis_host}:{self.redis_port}/{self.redis_db}?ssl_cert_reqs=none"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


class S3Settings(BaseAppSettings):
    s3_endpoint_url: str = "s3.ru-3.storage.selcloud.ru"
    s3_region: str = "ru-3"
    s3_access_key_id: str = ""
    s3_secret_access_key: SecretStr = SecretStr("")
    s3_bucket_name: str = "box-content-bucket"

    # Браузерный endpoint для presigned-ссылок. SigV4 подписывает заголовок Host,
    # поэтому подпись обязана делаться под адрес, по которому пойдёт браузер:
    # в Docker backend видит MinIO как http://minio:9000, а браузер —
    # http://localhost:9000. None = совпадает с s3_endpoint_url (Selectel, прод).
    s3_public_endpoint_url: str | None = None

    # "virtual" (https://bucket.endpoint/key) — дефолт для vHosted бакетов Selectel;
    # "path" (https://endpoint/bucket/key) — для локального MinIO.
    s3_addressing_style: str = "virtual"

    upload_url_expire_seconds: int = 600
    download_url_expire_seconds: int = 300

    @property
    def browser_endpoint_url(self) -> str:
        return self.s3_public_endpoint_url or self.s3_endpoint_url


class AppSettings(BaseAppSettings):
    db_settings: DbSettings = DbSettings()

    secret_key: SecretStr = SecretStr("default-production-secret-key-change-me")

    email_settings: EmailSettings = EmailSettings()
    redis_settings: RedisSettings = RedisSettings()
    s3_settings: S3Settings = S3Settings()

    templates_dir: str = TEMPLATES_DIR
    frontend_url: str = "http://localhost:5173"

    # Разрешённые CORS-origin'ы. Задаётся в .env как строка через запятую
    # (CORS_ORIGINS=https://app.example.com,https://www.example.com); дефолт —
    # локальные dev-хосты. frontend_url добавляется автоматически (см. property
    # ниже), чтобы прод-домен не забыть.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://stellage.tech,http://stellage.tech,https://www.stellage.tech,http://www.stellage.tech"

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins

    access_token_expire: int = 3600
    # Долгоживущий refresh-токен: пока он жив, короткий access молча
    # перевыпускается через POST /auth/refresh, поэтому пользователя не
    # выкидывает по истечении часа. По умолчанию 30 дней.
    refresh_token_expire: int = 60 * 60 * 24 * 30

    confirmation_code_length: int = 6

    # "development" | "production"
    environment: str = "development"

    # Set to True in production (HTTPS) so the auth cookie is only sent
    # over secure connections. Kept False by default for local http dev.
    cookie_secure: bool = False

    # Доверять ли заголовку X-Forwarded-For при определении IP клиента для
    # rate limit. Включать ТОЛЬКО когда перед приложением стоит доверенный
    # обратный прокси, который сам проставляет заголовок (иначе клиент подделает
    # IP и обойдёт лимит). За прокси без этого флага все клиенты схлопываются в
    # один IP прокси и режут друг друга. По умолчанию False (прямой доступ в dev).
    trust_proxy_headers: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

settings = AppSettings()