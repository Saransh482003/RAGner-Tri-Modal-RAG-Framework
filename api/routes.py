from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form, BackgroundTasks
from pydantic import BaseModel
import os
import shutil
import tempfile

from services.ingesting import parse_pdf_document
from services.chunking import advanced_chunking
from services.builder_raptor import build_raptor_tree
from db.qdrant_embedder import get_qdrant_client, init_collection, upsert_chunks
from services.retrieval_vector import retrieve_vector_context
from services.generation import initialize_llm_client, generate_answer
from services.query_router import route_query

router = APIRouter()
q_client = get_qdrant_client()
llm_client = initialize_llm_client()
COLLECTION_NAME = "targaryen_collection"
MODEL_NAME = "llama-3.1-8b-instant"

try:
    init_collection(q_client, COLLECTION_NAME)
except Exception as e:
    print(f"Warning: Could not connect to Qdrant on startup. {e}")


class QueryRequest(BaseModel):
    query: str
    strategy: str = "auto"

def run_advanced_pipeline_background(base_chunks, embedder, llm_client, q_client, collection_name):
    """
    Executes the heavy RAPTOR and GraphRAG operations in a background thread.
    """
    try:
        print("Starting RAPTOR and GraphRAG processing in the background...")

        collapsed_tree = build_raptor_tree(base_chunks, embedder, llm_client)
        summary_chunks = [
            chunk for chunk in collapsed_tree 
            if chunk["metadata"].get("chunk_type") in ["raptor_summary", "raptor_root_summary"]
        ]
        if summary_chunks:
            print(f"[Background Task] Upserting {len(summary_chunks)} summary chunks to Qdrant...")
            upsert_chunks(q_client, collection_name, collapsed_tree, embedder)
            print(f"[Background Task] Building Knowledge Graph with {len(summary_chunks)} summary chunks...")
            build_knowledge_graph(summary_chunks, llm_client)
    except Exception as e:
        print(f"[Background Task] Error during RAPTOR and GraphRAG processing: {e}")

@router.post("/upload")
async def upload_document(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...), use_advanced: bool = Form(False)):
    """
    Receives a PDF, saves it temporarily, parses, chunks, and stores it in Qdrant.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as f:
        f.write(await file.read())

    try:
        # PDF Parsing, Chunking, and Upserting to Qdrant
        elements = parse_pdf_document(temp_file_path, strategy="hi_res")
        base_chunks = advanced_chunking(elements)
        embedder = request.app.state.embedder

        init_collection(q_client, COLLECTION_NAME)
        upsert_chunks(q_client, COLLECTION_NAME, base_chunks, embedder)

        if use_advanced:
            background_tasks.add_task(
                run_advanced_pipeline_background, 
                base_chunks, embedder, llm_client, q_client, COLLECTION_NAME
            )
            
            return {
                "message": "Upload successful! Base chunks ready for Vanilla RAG.",
                "status": "Background processing started for RAPTOR and GraphRAG.",
                "base_chunks": len(base_chunks)
            }
        return {
            "message": "Upload successful!",
            "status": "Vanilla RAG only. No advanced pipeline triggered.",
            "base_chunks": len(base_chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.post("/query")
async def query_documents(request: Request, body: QueryRequest):
    """
    Takes a user query, retrieves relevant chunks, and generates an LLM response.
    """
    if not llm_client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized. Check GROQ_API_KEY.")

    try:
        embedder = request.app.state.embedder
        reranker = request.app.state.reranker

        active_strategy = body.strategy
        if active_strategy == "auto":
            active_strategy = route_query(llm_client, body.query) 

        retrieved_chunks = retrieve_vector_context(
            client=q_client, 
            collection_name=COLLECTION_NAME, 
            query=body.query,
            embedder=embedder,
            reranker=reranker,
            strategy=body.strategy,
            bi_encoder_top_k=15, 
            cross_encoder_top_k=5
        )
        answer = generate_answer(llm_client, body.query, retrieved_chunks, model_name=MODEL_NAME)
        return {
            "query": body.query,
            "answer": answer,
            "sources": retrieved_chunks,
            "strategy_used": active_strategy 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))