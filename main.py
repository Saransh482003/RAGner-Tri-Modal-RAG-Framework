import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from langchain_huggingface import HuggingFaceEmbeddings
from sentence_transformers import CrossEncoder

from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- SERVER STARTUP: Loading Machine Learning Models ---")
    
    print("Loading Bi-Encoder Embedding Model...")
    app.state.embedder = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    
    print("Loading Cross-Encoder Reranking Model...")
    app.state.reranker = CrossEncoder("BAAI/bge-reranker-base")
    
    print("--- Models Loaded Successfully! ---")
    
    yield # The application runs and handles requests here
    
    print("--- SERVER SHUTDOWN: Cleaning up resources ---")
    app.state.embedder = None
    app.state.reranker = None


app = FastAPI(title="RAGner API", description="Multi-Strategy RAG backend for resume project", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TODO: During production, restrict this to the frontend URL
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
    print("Starting FastAPI Server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)