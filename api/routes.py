import hashlib
import hmac
import json
import os
import sqlite3
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from utils.validators import DB_PATH, validate_and_save_uploads, cleanup_temp_files, check_sandbox_limits
from db.users import is_admin_email, sync_or_create_user, get_user_by_email, record_user_activity, upgrade_user_tier, ADMIN_EMAILS
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
    user_id: Optional[str] = None

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
    user_id: Optional[str] = None
    
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
    user_id: Optional[str] = Form(None)
):   
    embedder = request.app.state.embedder
    init_collection(q_client, MASTER_COLLECTION_NAME, vector_size=1536)

    # Sandbox Validation with Admin Bypass
    client_ip = get_client_ip(request)
    saved_temp_files, total_pages = validate_and_save_uploads(files, project_name, client_ip, user_id=user_id)

    if user_id:
        allowed, message = record_user_activity(user_id, new_pages=total_pages, new_workspace=project_name)
        if not allowed:
            cleanup_temp_files(saved_temp_files)
            raise HTTPException(status_code=403, detail=message)
        
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

@router.get("/auth/user/{user_id}")
async def get_user_status(user_id: str):
    """Retrieves user profile and tier limits from database by Clerk ID."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
            
        data = dict(row)
        try:
            data["workspaces"] = json.loads(data.get("workspaces") or "[]")
        except Exception:
            data["workspaces"] = []
            
        data["is_admin"] = data.get("role") == "admin"
        return data

@router.post("/auth/webhook/lemonsqueezy")
async def lemonsqueezy_webhook(request: Request):
    """
    Webhook endpoint for Lemon Squeezy to automatically upgrade user tiers.
    Handles 'order_created' and 'subscription_created' events.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Signature")
    secret = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET")

    if not signature or not secret:
        raise HTTPException(status_code=401, detail="Missing signature or secret")

    expected_signature = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    is_test_mode = payload.get("meta", {}).get("test_mode", False)
    if is_test_mode and os.getenv("ENVIRONMENT") == "production":
        return {"status": "ignored", "reason": "Test mode webhook ignored in production."}
    
    event_name = payload.get("meta", {}).get("event_name", "")
    custom_data = payload.get("meta", {}).get("custom_data", {})
    user_id = custom_data.get("user_id")

    if not user_id:
        return {"status": "ignored", "reason": "No Clerk user_id found in custom_data"}

    product_name = payload.get("data", {}).get("attributes", {}).get("product_name", "").lower()

    try:
        if event_name in ["subscription_created", "subscription_updated"]:
            new_tier = "pro" if "pro" in product_name else "starter"
            upgrade_user_tier(user_id=user_id, tier=new_tier)
            print(f"✅ Upgraded Clerk ID {user_id} to {new_tier.upper()}")

        # Handle Cancellations (Downgrade back to Sandbox)
        elif event_name in ["subscription_cancelled", "subscription_expired"]:
            upgrade_user_tier(user_id=user_id, tier="sandbox")
            print(f"❌ Downgraded Clerk ID {user_id} to SANDBOX")

        # Handle $8 Data Export (Single Purchase)
        elif event_name == "order_created" and "export" in product_name:
            upgrade_user_tier(user_id=user_id, tier="", unlock_export=True)
            print(f"📦 Unlocked Data Export for Clerk ID {user_id}")

        return {"status": "success"}
    except Exception as e:
        print(f"Error processing webhook for user {user_id}: {e}")
        return {"status": "error", "reason": str(e)}

@router.post("/query")
async def query_documents(request: Request, body: QueryRequest):
    if not llm_client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized.")

    if body.user_id:
        allowed, message = record_user_activity(body.user_id, new_queries=1)
        if not allowed:
            raise HTTPException(status_code=403, detail=message)
    else:
        client_ip = get_client_ip(request)
        allowed, message = check_sandbox_limits(client_ip, new_queries=1)
        if not allowed:
            raise HTTPException(status_code=403, detail=f"Sandbox Limit: {message} Please log in or upgrade to Pro.")
    
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
        
    return {
        "query": body.query,
        "answer": generate_answer(llm_client, body.query, retrieved_chunks, model_name=MODEL_NAME),
        "sources": retrieved_chunks,
        "strategy_used": active_strategy 
    }

@router.get("/export/{project_name}")
async def export_project(project_name: str, user_id: str):
    """Exports the specified project as a ZIP file. Requires the user ID for activity recording."""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT tier, workspaces, export_unlocked, role FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    is_admin = user["role"] == "admin"
    can_export = is_admin or user["tier"] == "pro" or user["export_unlocked"]

    if not can_export:
        raise HTTPException(status_code=403, detail="Data export requires the Pro tier or the $8 Data Export pass.")
    
    zip_buffer, point_count, triplet_count = build_export_zip(q_client, MASTER_COLLECTION_NAME, project_name)
    if point_count == 0 and triplet_count == 0:
        raise HTTPException(status_code=404, detail=f"No data found for project '{project_name}'.")

    return StreamingResponse(
        zip_buffer, media_type="application/zip", 
        headers={"Content-Disposition": f'attachment; filename="{project_name}_export.zip"'}
    )
