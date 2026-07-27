# api/routes.py
from fastapi import APIRouter, UploadFile
from models.schemas import QueryRequest, QueryResponse
from services.ingestion import process_and_store_document
from services.retrieval import generate_answer

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile):
    # Pass to service layer
    pass

@router.post("/query", response_model=QueryResponse)
async def query_system(request: QueryRequest):
    # Pass to service layer
    pass