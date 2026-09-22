import os
import uuid
import os
import pypdf
import sqlite3
from fastapi import HTTPException, UploadFile
from typing import List, Tuple, Optional
from db.users import is_admin_email

# Initialize SQLite IP Tracker
DB_DIR = "/data" if os.path.exists("/data") else "."
DB_PATH = os.path.join(DB_DIR, "sandbox_usage.db")

def init_sandbox_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usage (
                ip_address TEXT PRIMARY KEY,
                pages_processed INTEGER DEFAULT 0,
                queries_made INTEGER DEFAULT 0
            )
        """)
        conn.commit()

init_sandbox_db()

def check_sandbox_limits(ip: str, new_pages: int = 0, new_queries: int = 0):
    """Checks and updates the user's IP limits in SQLite."""
    MAX_PAGES = 50
    MAX_QUERIES = 30

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT pages_processed, queries_made FROM usage WHERE ip_address = ?", (ip,))
        row = c.fetchone()
        
        current_pages = row[0] if row else 0
        current_queries = row[1] if row else 0

        if new_pages > 0 and (current_pages + new_pages > MAX_PAGES):
            return False, f"Total page limit exceeded. You have {MAX_PAGES - current_pages} pages remaining."
        if new_queries > 0 and (current_queries + new_queries > MAX_QUERIES):
            return False, f"Query limit exceeded. You have used {current_queries}/{MAX_QUERIES} queries."

        if not row:
            c.execute("INSERT INTO usage (ip_address, pages_processed, queries_made) VALUES (?, ?, ?)", (ip, new_pages, new_queries))
        else:
            c.execute("UPDATE usage SET pages_processed = pages_processed + ?, queries_made = queries_made + ? WHERE ip_address = ?", (new_pages, new_queries, ip))
        conn.commit()
        
        return True, "Allowed"

def validate_and_save_uploads(
    files: List[UploadFile],
    project_name: str,
    client_ip: str,
    user_email: Optional[str] = None
) -> Tuple[List[Tuple[str, str]], int]:
    """Validates file count, parses PDF pages, and enforces IP limits before processing."""
    # Admins have zero restrictions
    if is_admin_email(user_email):
        saved_temp_files = []
        total_upload_pages = 0
        try:
            for file in files:
                if not file.filename.endswith('.pdf'):
                    raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF.")
                temp_path = f"temp_{uuid.uuid4().hex[:8]}_{file.filename}"
                with open(temp_path, "wb") as f:
                    f.write(file.file.read())
                saved_temp_files.append((file.filename, temp_path))
                reader = pypdf.PdfReader(temp_path)
                total_upload_pages += len(reader.pages)
        except Exception as e:
            cleanup_temp_files(saved_temp_files)
            raise HTTPException(status_code=400, detail=str(e))
        return saved_temp_files, total_upload_pages

    is_sandbox = project_name.startswith("user_") or project_name in ("default_project", "")
    
    if is_sandbox and len(files) > 3:
        raise HTTPException(status_code=403, detail="Sandbox tier allows a maximum of 3 files per upload.")
    
    total_upload_pages = 0
    saved_temp_files = []

    try:
        for file in files:
            if not file.filename.endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF.")
            
            temp_path = f"temp_{uuid.uuid4().hex[:8]}_{file.filename}"
            with open(temp_path, "wb") as f:
                f.write(file.file.read())
            saved_temp_files.append((file.filename, temp_path))

            reader = pypdf.PdfReader(temp_path)
            total_upload_pages += len(reader.pages)
    except Exception as e:
        cleanup_temp_files(saved_temp_files)
        raise HTTPException(status_code=400, detail=str(e))

    # CRITICAL: Enforce SQLite IP Limit
    if is_sandbox:
        allowed, message = check_sandbox_limits(client_ip, new_pages=total_upload_pages)
        if not allowed:
            cleanup_temp_files(saved_temp_files)
            raise HTTPException(status_code=403, detail=f"Sandbox Limit: {message}")
    
    return saved_temp_files, total_upload_pages

def cleanup_temp_files(saved_files: List[Tuple[str, str]]):
    for _, path in saved_files:
        if os.path.exists(path):
            os.remove(path)