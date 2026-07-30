from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import shutil

from services.ingestion import parse_pdf_document
from services.chunking import advanced_chunking
from db.qdrant_client import get_qdrant_client, init_collection, upsert_chunks
from services.retrieval import retrieve_context
from services.generation import initialize_llm_client, generate_answer