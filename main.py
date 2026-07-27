from fastapi import FastAPI
from api.routes import router

app = FastAPI(title="RAGner API")

app.include_router(router, prefix="/api/v1")