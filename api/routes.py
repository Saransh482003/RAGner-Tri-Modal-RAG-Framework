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
MODEL_NAME = os.getenv("GENERATION_MODEL", "openrouter/free")

MASTER_COLLECTION_NAME = "ragner_master_collection"


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
    project_name: str, 
    doc_name: Optional[str] = None, 
    chunk_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves already stored chunks from Qdrant without re-reading PDFs."""

    filter_conditions = [
        FieldCondition(key="project_name", match=MatchValue(value=project_name))
    ]
    if doc_name:
        filter_conditions.append(FieldCondition(key="source", match=MatchValue(value=doc_name)))
    if chunk_type:
        filter_conditions.append(FieldCondition(key="chunk_type", match=MatchValue(value=chunk_type)))

    q_filter = Filter(must=filter_conditions) if filter_conditions else None

    points, _ = q_client.scroll(
        collection_name=MASTER_COLLECTION_NAME,
        scroll_filter=q_filter,
        limit=1000,
        with_payload=True,
        with_vectors=False
    )
    return [{"text": p.payload.get("text", ""), "metadata": p.payload} for p in points]


def execute_pipeline_stages(
    doc_chunks_map: Dict[str, List[Dict[str, Any]]],
    embedder,
    llm_client,
    q_client,
    project_name: str,
    build_raptor: bool = True,
    build_graph: bool = True
):
    """
    Executes RAPTOR and/or GraphRAG independently.
    If RAPTOR is skipped, GraphRAG automatically falls back to existing Qdrant summaries or base chunks.
    """
    for doc_name, base_chunks in doc_chunks_map.items():
        summary_chunks = []

        # --- STAGE 1: RAPTOR TREE CONSTRUCTION ---
        if build_raptor:
            try:
                print(f"[Stage: RAPTOR] Building tree for: {doc_name}")
                collapsed_tree = build_raptor_tree(base_chunks, embedder, llm_client)
                summary_chunks = [
                    chunk for chunk in collapsed_tree
                    if chunk["metadata"].get("chunk_type") in ["raptor_summary", "raptor_root_summary"]
                ]
                if summary_chunks:
                    print(f"[Stage: RAPTOR] Upserting {len(summary_chunks)} summaries to Qdrant...")
                    upsert_chunks(q_client, MASTER_COLLECTION_NAME, project_name, summary_chunks, embedder)
            except Exception as e:
                print(f"[Stage: RAPTOR Failed] Error on {doc_name}: {e}")
                
        # --- STAGE 2: KNOWLEDGE GRAPH CONSTRUCTION ---
        if build_graph:
            try:
                # If RAPTOR didn't run in this pass, look for existing summaries in Qdrant
                if not summary_chunks:
                    print(f"[Stage: GraphRAG] Checking Qdrant for existing summaries for {doc_name}...")
                    existing_summaries = get_existing_chunks_from_qdrant(
                        q_client, collection_name=project_name, doc_name=doc_name, chunk_type="raptor_summary"
                    )
                    summary_chunks = existing_summaries if existing_summaries else base_chunks

                print(f"[Stage: GraphRAG] Building Knowledge Graph with {len(summary_chunks)} chunks...")
                build_knowledge_graph(
                    summary_chunks, 
                    llm_client, 
                    document_name=doc_name, 
                    project_name=project_name
                )
                print(f"[Stage: GraphRAG Complete] Successfully built graph for: {doc_name}")
            except Exception as e:
                print(f"[Stage: GraphRAG Failed] Error building graph for {doc_name}: {e}")


@router.post("/upload")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    build_raptor: bool = Form(True),
    build_graph: bool = Form(True),
    project_name: str = Form("default_project")
):   
    """
    Synchronously parses and upserts base chunks for instant Vanilla RAG.
    Asynchronously builds the RAPTOR Tree and Knowledge Graph.
    """
    embedder = request.app.state.embedder
    total_base_chunks = 0
    doc_chunks_map = {}

    init_collection(q_client, project_name, vector_size=1536)
    
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
                upsert_chunks(q_client, MASTER_COLLECTION_NAME, project_name, base_chunks, embedder)
                total_base_chunks += len(base_chunks)
                doc_chunks_map[file.filename] = base_chunks

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing {file.filename}: {str(e)}")
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    if (build_raptor or build_graph) and doc_chunks_map:
        background_tasks.add_task(
            execute_pipeline_stages, 
            doc_chunks_map, embedder, llm_client, q_client,
            project_name, build_raptor, build_graph
        )

    return {
        "message": f"Processed {len(files)} document(s). Base chunks stored in project '{project_name}'.",
        "stages_queued": {
            "raptor": build_raptor,
            "graph": build_graph
        },
        "total_base_chunks": total_base_chunks,
        "documents": list(doc_chunks_map.keys())
    }


@router.post("/pipeline/rebuild")
async def rebuild_pipeline_stage(
    request: Request,
    background_tasks: BackgroundTasks,
    body: RebuildRequest
):
    """
    RECOVERY ENDPOINT: Re-runs RAPTOR or GraphRAG directly from existing 
    Qdrant chunks without re-uploading or re-parsing PDFs.
    """
    embedder = request.app.state.embedder
    
    # Retrieve base chunks already saved in Qdrant
    base_chunks = get_existing_chunks_from_qdrant(
        q_client, 
        collection_name=body.project_name, 
        doc_name=body.document_name, 
        chunk_type="text"
    )
    if not base_chunks:
        raise HTTPException(
            status_code=404, 
            detail=f"No base chunks found for project '{body.project_name}'. Run upload first."
        )

    doc_chunks_map = {}
    for c in base_chunks:
        src = c["metadata"].get("source", body.document_name or "document")
        doc_chunks_map.setdefault(src, []).append(c)

    background_tasks.add_task(
        execute_pipeline_stages,
        doc_chunks_map, embedder, llm_client, q_client,
        body.project_name, body.build_raptor, body.build_graph
    )
    return {
        "status": "Rebuild task initiated in background.",
        "project": body.project_name,
        "document_targeted": body.document_name or "All documents in project",
        "stages_triggered": {
            "raptor": body.build_raptor,
            "graph": body.build_graph
        }
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

        active_collection = MASTER_COLLECTION_NAME
        project_filter = body.project_name

        active_strategy = body.strategy
        if active_strategy == "auto":
            active_strategy = route_query(llm_client, body.query)

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
                    project_name=project_filter,
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
                project_name=project_filter,
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