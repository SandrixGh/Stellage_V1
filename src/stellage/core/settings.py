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


class AppSettings(BaseAppSettings):
    db_settings: DbSettings = DbSettings()

    secret_key: SecretStr

    email_settings: EmailSettings = EmailSettings()
    redis_settings: RedisSettings = RedisSettings()

    templates_dir: str = TAMPLATES_DIR
    frontend_url: str

settings = AppSettings()