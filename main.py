import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.api_clients import APIEmbedder, APIReranker
from api.routes import router
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- SERVER STARTUP: Loading Machine Learning Models ---")
    
    print("Loading Bi-Encoder Embedding Model...")
    app.state.embedder = APIEmbedder(model=os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small"))
    
    print("Loading Cross-Encoder Reranking Model...")
    app.state.reranker = APIReranker(model=os.getenv("RERANKER_MODEL", "cohere/rerank-v3.5"))
    
    print("--- Models Loaded Successfully! ---")
    yield # The application runs and handles requests here
    
    print("--- SERVER SHUTDOWN: Cleaning up resources ---")
    app.state.embedder = None
    app.state.reranker = None


app = FastAPI(title="RAGner API", description="Multi-Strategy RAG backend for resume project", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ragner.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "Online", 
        "message": "RAG API is running."
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))