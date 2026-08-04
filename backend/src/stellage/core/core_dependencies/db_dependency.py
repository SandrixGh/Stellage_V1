from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from stellage.core.settings import settings

# Engine и фабрика сессий — процессные синглтоны, создаются один раз при импорте
# модуля. Раньше они жили в DBDependency.__init__, а FastAPI инстанцирует
# зависимость на КАЖДЫЙ запрос (Depends(DBDependency)) — это плодило новый
# engine и пул на каждый запрос без dispose, быстро исчерпывая соединения БД.
# Теперь конструктор зависимости дешёвый и лишь ссылается на общий пул.
_connect_args = {}
if "pooler" in settings.db_settings.db_host or "neon.tech" in settings.db_settings.db_host:
    _connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }

_engine = create_async_engine(
    url=settings.db_settings.db_url,
    echo=settings.db_settings.db_echo,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

_session_factory = async_sessionmaker(
    bind=_engine,
    autocommit=False,
    expire_on_commit=False,
)


class DBDependency:
    """Тонкая обёртка над процессным engine/session_factory. Безопасно
    инстанцируется на каждый запрос: тяжёлые ресурсы — модульные синглтоны."""

    def __init__(self):
        self._engine = _engine
        self._session_factory = _session_factory

    @property
    def db_session(self) -> async_sessionmaker[AsyncSession]:
        return self._session_factory


async def dispose_engine() -> None:
    """Корректно закрыть пул соединений (FastAPI shutdown / завершение воркера)."""
    await _engine.dispose()
