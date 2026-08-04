import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from stellage.apps import apps_router
from stellage.core.core_dependencies.db_dependency import dispose_engine
from stellage.core.core_dependencies.redis_dependency import dispose_pool
from stellage.core.health import health_router
from stellage.core.logging_config import configure_logging
from stellage.core.settings import settings

configure_logging(level=logging.WARNING if settings.is_production else logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Процессные engine/пул Redis живут всё время работы приложения и
    # переиспользуются между запросами; на остановке закрываем их явно, чтобы
    # не оставлять открытых соединений.
    yield
    await dispose_engine()
    await dispose_pool()


app = FastAPI(
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Origin'ы берутся из настроек (CORS_ORIGINS в .env) + frontend_url —
    # чтобы прод-домен не приходилось зашивать в код и не забыть добавить.
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health — вне /api.v1: инфраструктурный контракт для healthcheck'ов, его путь
# не должен ехать вместе с версией продуктового API.
app.include_router(
    router=health_router,
)

app.include_router(
    router=apps_router,
)

def start():
    uvicorn.run("stellage.main:app", reload=False)