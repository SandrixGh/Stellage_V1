import uvicorn
from fastapi import FastAPI

app = FastAPI()

def start():
    uvicorn.run("stellage.main:app", reload=True)