from fastapi import APIRouter

from stellage.apps.auth.routes import auth_router

apps_router = APIRouter(
    prefix="/api.v1",
)
apps_router.include_router(
    router=auth_router,
)