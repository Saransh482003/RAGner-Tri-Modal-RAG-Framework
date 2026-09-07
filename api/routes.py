import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form, BackgroundTasks
from pydantic import BaseModel
from qdrant_client.models import Filter, FieldCondition, MatchValue

from services.ingesting import parse_pdf_document
from services.chunking import advanced_chunking
from services.builder_raptor import build_raptor_tree
from services.retrieval_vector import retrieve_vector_context
from services.builder_graph import build_knowledge_graph
from services.retrieval_graph import retrieve_graph_context
from db.qdrant_embedder import get_qdrant_client, init_collection, upsert_chunks
from services.generation import initialize_llm_client, generate_answer
from services.query_router import route_query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
q_client = get_qdrant_client()
llm_client = initialize_llm_client()
DEFAULT_PROJECT = os.getenv("DEFAULT_PROJECT", "ragner_collection")
MODEL_NAME = os.getenv("GENERATION_MODEL", "openrouter/free")

try:
    init_collection(q_client, DEFAULT_PROJECT, vector_size=1536)
except Exception as e:
    print(f"Warning: Could not connect to Qdrant on startup. {e}")


class QueryRequest(BaseModel):
    query: str
    strategy: str = "auto"
    document_name: Optional[str] = None
    project_name: str = "default_project"

class RebuildRequest(BaseModel):
    project_name: str = "default_project"
    document_name: Optional[str] = None
    build_raptor: bool = False
    build_graph: bool = True
    

def get_existing_chunks_from_qdrant(
    q_client, 
    collection_name: str, 
    doc_name: Optional[str] = None, 
    chunk_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves already stored chunks from Qdrant without re-reading PDFs."""
    filter_conditions = []
    if doc_name:
        filter_conditions.append(FieldCondition(key="source", match=MatchValue(value=doc_name)))
    if chunk_type:
        filter_conditions.append(FieldCondition(key="chunk_type", match=MatchValue(value=chunk_type)))

    q_filter = Filter(must=filter_conditions) if filter_conditions else None

    points, _ = q_client.scroll(
        collection_name=collection_name,
        scroll_filter=q_filter,
        limit=1000,
        with_payload=True,
        with_vectors=False
    )
    return [{"text": p.payload.get("text", ""), "metadata": p.payload} for p in points]


def run_advanced_pipeline_background(doc_chunks_map, embedder, llm_client, q_client, project_name):
    """
    Executes the heavy RAPTOR and GraphRAG operations in a background thread.
    """
    try:
        print("Starting RAPTOR and GraphRAG processing in the background...")

        for doc_name, base_chunks in doc_chunks_map.items():
            print(f"[Background Task] Building RAPTOR tree for document: {doc_name}")
            collapsed_tree = build_raptor_tree(base_chunks, embedder, llm_client)
            summary_chunks = [
                chunk for chunk in collapsed_tree 
                if chunk["metadata"].get("chunk_type") in ["raptor_summary", "raptor_root_summary"]
            ]
            if summary_chunks:
                try:
                    # Upsert only newly synthesized summary nodes to avoid re-embedding base leaves
                    print(f"[Background Task] Upserting {len(summary_chunks)} summary chunks to Qdrant...")
                    upsert_chunks(q_client, project_name, summary_chunks, embedder)
                except Exception as e:
                    print(f"[Background Task] Error upserting summary chunks to Qdrant: {e}")
                try:
                    print(f"[Background Task] Building Knowledge Graph with {len(summary_chunks)} summary chunks...")
                    build_knowledge_graph(summary_chunks, llm_client, document_name=doc_name, project_name=project_name)
                except Exception as e:
                    print(f"[Background Task] Error building knowledge graph: {e}")
    except Exception as e:
        print(f"[Background Task] Error during RAPTOR and GraphRAG processing: {e}")


@router.post("/upload")
async def upload_document(request: Request, background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), use_advanced: bool = Form(False), project_name: str = Form(...)):
    """
    Synchronously parses and upserts base chunks for instant Vanilla RAG.
    Asynchronously builds the RAPTOR Tree and Knowledge Graph.
    """
    embedder = request.app.state.embedder
    total_base_chunks = 0
    doc_chunks_map = {}

    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())

        try:
            # PDF Parsing, Chunking, and Upserting to Qdrant
            elements = parse_pdf_document(temp_file_path, strategy="hi_res")
            for el in elements:
                if "metadata" in el:
                    el["metadata"]["filename"] = file.filename

            base_chunks = advanced_chunking(elements)
            if base_chunks:
                init_collection(q_client, project_name, vector_size=1536)
                upsert_chunks(q_client, project_name, base_chunks, embedder)
                total_base_chunks += len(base_chunks)
                doc_chunks_map[file.filename] = base_chunks

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing {file.filename}: {str(e)}")
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    if use_advanced and doc_chunks_map:
        background_tasks.add_task(
            run_advanced_pipeline_background, 
            doc_chunks_map, embedder, llm_client, q_client, project_name
        )
        return {
            "message": f"Successfully processed {len(files)} document(s). Base chunks ready for Vanilla RAG.",
            "status": "Background processing started for RAPTOR and GraphRAG.",
            "total_base_chunks": total_base_chunks,
            "documents": list(doc_chunks_map.keys())
        }

    return {
        "message": f"Successfully processed {len(files)} document(s).",
        "status": "Vanilla RAG only. No advanced pipeline triggered.",
        "total_base_chunks": total_base_chunks,
        "documents": list(doc_chunks_map.keys())
    }


@router.post("/query")
async def query_documents(request: Request, body: QueryRequest):
    """
    Routes the query to the correct strategy (Vector, Tree, or Graph) and generates an answer.
    """
    if not llm_client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized. Check OPEN_ROUTER_API_KEY.")

    try:
        embedder = request.app.state.embedder
        reranker = request.app.state.reranker

        active_strategy = body.strategy
        if active_strategy == "auto":
            routing_decision = route_query(llm_client, body.query)
            # active_strategy = routing_decision.get("strategy", "vanilla") 
            active_strategy = routing_decision

        active_collection = body.project_name
        if active_strategy == "graph":
            retrieved_chunks = retrieve_graph_context(body.query, llm_client, project_name=active_collection)

            if not retrieved_chunks:
                retrieved_chunks = retrieve_vector_context(
                    client=q_client, 
                    collection_name=active_collection, 
                    query=body.query,
                    embedder=embedder,
                    reranker=reranker,
                    strategy="vanilla",
                    document_source=body.document_name,
                    bi_encoder_top_k=15, 
                    cross_encoder_top_k=5
                )
        else:
            retrieved_chunks = retrieve_vector_context(
                client=q_client, 
                collection_name=active_collection, 
                query=body.query,
                embedder=embedder,
                reranker=reranker,
                strategy=active_strategy,
                document_source=body.document_name,
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