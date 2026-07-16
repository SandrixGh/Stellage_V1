import enum


class AssetStatusEnum(str, enum.Enum):
    # PENDING — строка создана, файл ещё не подтверждён (initiate → complete);
    # READY — объект проверен и доступен; DELETING — помечен на удаление,
    # объект в S3 будет убран Celery-задачей/sweeper'ом.
    PENDING = "pending"
    READY = "ready"
    DELETING = "deleting"
