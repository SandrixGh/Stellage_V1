import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from stellage.apps import apps_router
from stellage.core.settings import settings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    router=apps_router,
)

def start():
    uvicorn.run("stellage.main:app", reload=True)