import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from stellage.apps import apps_router

app = FastAPI()

origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://172.18.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(
    router=apps_router,
)

def start():
    uvicorn.run("stellage.main:app", reload=False)