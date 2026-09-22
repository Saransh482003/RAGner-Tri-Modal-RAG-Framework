import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from utils.validators import validate_and_save_uploads, cleanup_temp_files, check_sandbox_limits
from db.users import is_admin_email, sync_or_create_user, get_user_by_email, record_user_activity, ADMIN_EMAILS
from services.pipeline import execute_pipeline_stages, get_existing_chunks_from_qdrant
from services.ingesting import parse_pdf_document
from services.chunking import advanced_chunking
from services.retrieval_vector import retrieve_vector_context
from services.retrieval_graph import retrieve_graph_context
from services.exporter import build_export_zip
from db.qdrant_embedder import get_qdrant_client, init_collection, upsert_chunks
from services.generation import initialize_llm_client, generate_answer
from services.query_router import route_query

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
    project_name: Optional[str] = None
    user_email: Optional[str] = None

class UserSyncRequest(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    provider: str = "google"

class RebuildRequest(BaseModel):
    project_name: Optional[str] = None
    document_name: Optional[str] = None
    build_raptor: bool = False
    build_graph: bool = True
    user_email: Optional[str] = None
    
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else request.client.host

@router.post("/upload")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    build_raptor: bool = Form(True),
    build_graph: bool = Form(True),
    project_name: str = Form("default_project"),
    user_email: Optional[str] = Form(None)
):   
    embedder = request.app.state.embedder
    init_collection(q_client, MASTER_COLLECTION_NAME, vector_size=1536)

    # Sandbox Validation with Admin Bypass
    client_ip = get_client_ip(request)
    saved_temp_files, _ = validate_and_save_uploads(files, project_name, client_ip, user_email=user_email)
    
    total_base_chunks = 0
    doc_chunks_map = {}

    try:
        for filename, temp_file_path in saved_temp_files:
            elements = parse_pdf_document(temp_file_path, strategy="hi_res")
            for el in elements:
                if "metadata" in el:
                    el["metadata"]["filename"] = filename

            base_chunks = advanced_chunking(elements)
            if base_chunks:
                upsert_chunks(q_client, MASTER_COLLECTION_NAME, project_name, base_chunks, embedder)
                total_base_chunks += len(base_chunks)
                doc_chunks_map[filename] = base_chunks
    finally:
        cleanup_temp_files(saved_temp_files)

    if (build_raptor or build_graph) and doc_chunks_map:
        background_tasks.add_task(
            execute_pipeline_stages, 
            doc_chunks_map, embedder, llm_client, q_client, MASTER_COLLECTION_NAME, project_name, build_raptor, build_graph
        )

    # Record usage in users table if authenticated
    if user_email:
        record_user_activity(user_email, new_pages=len(saved_temp_files), new_workspace=project_name)

    return {
        "message": f"Processed {len(files)} document(s). Base chunks stored under master collection with project tag '{project_name}'.",
        "stages_queued": {"raptor": build_raptor, "graph": build_graph},
        "total_base_chunks": total_base_chunks,
        "documents": list(doc_chunks_map.keys())
    }


@router.post("/pipeline/rebuild")
async def rebuild_pipeline_stage(request: Request, background_tasks: BackgroundTasks, body: RebuildRequest):
    embedder = request.app.state.embedder
    base_chunks = get_existing_chunks_from_qdrant(q_client, MASTER_COLLECTION_NAME, body.project_name, body.document_name, "text")
    
    if not base_chunks:
        raise HTTPException(status_code=404, detail=f"No base chunks found for project '{body.project_name}'.")

    doc_chunks_map = {}
    for c in base_chunks:
        src = c["metadata"].get("source", body.document_name or "document")
        doc_chunks_map.setdefault(src, []).append(c)

    background_tasks.add_task(
        execute_pipeline_stages, doc_chunks_map, embedder, llm_client, q_client, MASTER_COLLECTION_NAME, body.project_name, body.build_raptor, body.build_graph
    )
    return {"status": "Rebuild task initiated in background."}


@router.post("/auth/sync-user")
async def sync_user_endpoint(body: UserSyncRequest):
    """
    Syncs Clerk Google/GitHub authenticated users into SQLite users table.
    Admin emails automatically receive unrestricted privileges.
    """
    user_record = sync_or_create_user(
        user_id=body.user_id,
        email=body.email,
        name=body.name,
        provider=body.provider
    )
    return {
        "status": "success",
        "user": user_record
    }

@router.get("/auth/user/{email}")
async def get_user_status(email: str):
    """Retrieves user profile and tier limits from database."""
    user = get_user_by_email(email)
    if not user:
        is_admin = is_admin_email(email)
        return {
            "email": email,
            "role": "admin" if is_admin else "user",
            "tier": "admin_unrestricted" if is_admin else "sandbox",
            "is_admin": is_admin
        }
    user["is_admin"] = user.get("role") == "admin"
    return user

@router.post("/query")
async def query_documents(request: Request, body: QueryRequest):
    is_admin = is_admin_email(body.user_email)
    is_sandbox = not is_admin and ((body.project_name or "").startswith("user_") or body.project_name in ("default_project", "", None))
    
    if is_sandbox:
        client_ip = get_client_ip(request)
        allowed, message = check_sandbox_limits(client_ip, new_queries=1)
        if not allowed:
            raise HTTPException(status_code=403, detail=f"Sandbox Limit: {message} Upgrade to Pro.")

    if not llm_client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized.")
    
    embedder, reranker = request.app.state.embedder, request.app.state.reranker
    active_strategy = route_query(llm_client, body.query) if body.strategy == "auto" else body.strategy

    if active_strategy == "graph":
        retrieved_chunks = retrieve_graph_context(body.query, llm_client, project_name=body.project_name)
        if not retrieved_chunks:
            retrieved_chunks = retrieve_vector_context(
                client=q_client, collection_name=MASTER_COLLECTION_NAME, query=body.query, embedder=embedder,
                reranker=reranker, strategy="vanilla", document_source=body.document_name, project_name=body.project_name
            )
    else:
        retrieved_chunks = retrieve_vector_context(
            client=q_client, collection_name=MASTER_COLLECTION_NAME, query=body.query, embedder=embedder,
            reranker=reranker, strategy=active_strategy, document_source=body.document_name, project_name=body.project_name
        )
        
    if body.user_email:
        record_user_activity(body.user_email, new_queries=1)
        
    return {
        "query": body.query,
        "answer": generate_answer(llm_client, body.query, retrieved_chunks, model_name=MODEL_NAME),
        "sources": retrieved_chunks,
        "strategy_used": active_strategy 
    }

@router.get("/export/{project_name}")
async def export_project(project_name: str):
    zip_buffer, point_count, triplet_count = build_export_zip(q_client, MASTER_COLLECTION_NAME, project_name)
    if point_count == 0 and triplet_count == 0:
        raise HTTPException(status_code=404, detail=f"No data found for project '{project_name}'.")

    return StreamingResponse(
        zip_buffer, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{project_name}_export.zip"'}
    )
