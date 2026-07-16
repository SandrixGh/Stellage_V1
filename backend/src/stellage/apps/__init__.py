from fastapi import APIRouter

from stellage.apps.auth.routes import auth_router
from stellage.apps.profile.routes import profile_router
from stellage.apps.social.routes import social_router
from stellage.apps.notifications.routes import notifications_router
from stellage.apps.messaging.routes import messaging_router
from stellage.apps.shelves.routes import router as shelf_router
from stellage.apps.boxes.routes import router as box_router
from stellage.apps.boxes.assets.routes import router as box_assets_router

apps_router = APIRouter(
    prefix="/api.v1",
)
apps_router.include_router(
    router=auth_router,
)
apps_router.include_router(
    router=profile_router
)
apps_router.include_router(
    router=social_router
)
apps_router.include_router(
    router=notifications_router
)
apps_router.include_router(
    router=messaging_router
)
apps_router.include_router(
    router=shelf_router
)

apps_router.include_router(
    router=box_router
)

apps_router.include_router(
    router=box_assets_router
)