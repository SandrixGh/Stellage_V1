import uvicorn
from fastapi import FastAPI

from stellage.apps import apps_router

app = FastAPI()
app.include_router(
    router=apps_router,
)

def start():
    uvicorn.run("stellage.main:app", reload=True)