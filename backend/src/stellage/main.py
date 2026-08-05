import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

# Монтируем фронтенд статику (директорию frontend/dist), если она собрана
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist")
if not os.path.exists(frontend_dist_path):
    frontend_dist_path = "frontend/dist"

if os.path.exists(frontend_dist_path):
    assets_path = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api.v1") or full_path == "health":
            raise HTTPException(status_code=404)
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))


def start():
    uvicorn.run("stellage.main:app", reload=False)