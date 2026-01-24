from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from stellage.core.settings import settings


class DBDependency:
    def __init__(self):
        self._engine = create_async_engine(
            url=settings.db_settings.db_url,
            echo=settings.db_settings.db_echo,
        )

        self._session_factory = async_sessionmaker(
            bind=self._engine,
            autocommit=False,
            expire_on_commit=False,
        )

    @property
    def db_session(self) -> async_sessionmaker[AsyncSession]:
        return self._session_factory