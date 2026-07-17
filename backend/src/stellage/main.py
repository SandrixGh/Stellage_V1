import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from stellage.apps import apps_router
from stellage.core.core_dependencies.db_dependency import dispose_engine
from stellage.core.core_dependencies.redis_dependency import dispose_pool
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

origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://172.18.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(
    router=apps_router,
)

def start():
    uvicorn.run("stellage.main:app", reload=False)