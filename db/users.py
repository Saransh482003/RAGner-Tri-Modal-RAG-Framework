import os
import json
import sqlite3
from typing import Optional, Dict, Any, List, Tuple

DB_DIR = "/data" if os.path.exists("/data") else "."
DB_PATH = os.path.join(DB_DIR, "sandbox_usage.db")

ADMIN_EMAILS = {
    "saini.saransh03@gmail.com",
    "saransh.saini.ai@gmail.com",
}

# Tier limits definitions
TIER_LIMITS = {
    "sandbox": {"max_pages": 50, "max_queries": 30, "max_workspaces": 1},
    "starter": {"max_pages": 500, "max_queries": 500, "max_workspaces": 1},
    "pro": {"max_pages": 2000, "max_queries": 100000, "max_workspaces": 5},
    "admin_unrestricted": {"max_pages": 999999999, "max_queries": 999999999, "max_workspaces": 999999},
}

def init_users_table():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                provider TEXT DEFAULT 'google',
                role TEXT DEFAULT 'user',
                tier TEXT DEFAULT 'starter',
                workspaces_allowed INTEGER DEFAULT 1,
                pages_processed INTEGER DEFAULT 0,
                queries_made INTEGER DEFAULT 0,
                workspaces TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Add columns dynamically if table already existed without them
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = {row[1] for row in cursor.fetchall()}

        if "pages_processed" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN pages_processed INTEGER DEFAULT 0")
        if "queries_made" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN queries_made INTEGER DEFAULT 0")
        if "workspaces" not in existing_cols:
            conn.execute("ALTER TABLE users ADD COLUMN workspaces TEXT DEFAULT '[]'")

        # Seed or ensure admin accounts exist with unrestricted superuser tier
        for admin_email in ADMIN_EMAILS:
            conn.execute("""
                INSERT INTO users (id, email, name, role, tier, workspaces_allowed, pages_processed, queries_made, workspaces)
                VALUES (?, ?, 'Saransh Saini (Admin)', 'admin', 'admin_unrestricted', 999999, 0, 0, '["global-master", "nvidia", "scaler", "master"]')
                ON CONFLICT(email) DO UPDATE SET
                    role = 'admin',
                    tier = 'admin_unrestricted',
                    workspaces_allowed = 999999,
                    updated_at = CURRENT_TIMESTAMP
            """, (f"admin_{admin_email.replace('@', '_').replace('.', '_')}", admin_email))
        conn.commit()

init_users_table()

def is_admin_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.strip().lower() in ADMIN_EMAILS

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
        row = c.fetchone()
        if not row:
            return None
        data = dict(row)
        try:
            data["workspaces"] = json.loads(data.get("workspaces") or "[]")
        except Exception:
            data["workspaces"] = []
        return data

def sync_or_create_user(
    user_id: str,
    email: str,
    name: Optional[str] = None,
    provider: str = "google"
) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    is_admin = is_admin_email(norm_email)
    role = "admin" if is_admin else "user"
    tier = "admin_unrestricted" if is_admin else "starter"
    workspaces_cap = 999999 if is_admin else 1

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT workspaces FROM users WHERE email = ?", (norm_email,))
        existing = c.fetchone()
        
        default_workspaces = json.dumps(["global-master", "nvidia", "scaler"] if is_admin else ["default"])
        initial_workspaces = existing[0] if existing else default_workspaces

        c.execute("""
            INSERT INTO users (id, email, name, provider, role, tier, workspaces_allowed, pages_processed, queries_made, workspaces)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = COALESCE(excluded.name, users.name),
                provider = excluded.provider,
                role = CASE WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END,
                tier = CASE WHEN users.role = 'admin' THEN 'admin_unrestricted' ELSE users.tier END,
                workspaces_allowed = CASE WHEN users.role = 'admin' THEN 999999 ELSE users.workspaces_allowed END,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, norm_email, name, provider, role, tier, workspaces_cap, initial_workspaces))
        conn.commit()

        c.execute("SELECT * FROM users WHERE email = ?", (norm_email,))
        data = dict(c.fetchone())
        try:
            data["workspaces"] = json.loads(data.get("workspaces") or "[]")
        except Exception:
            data["workspaces"] = []
        return data

def record_user_activity(email: str, new_pages: int = 0, new_queries: int = 0, new_workspace: Optional[str] = None) -> Tuple[bool, str]:
    """Records pages, queries, and registered workspaces under the user account with limit checking."""
    norm_email = email.strip().lower()
    is_admin = is_admin_email(norm_email)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (norm_email,))
        user = c.fetchone()

        if not user:
            # If user not synced yet, create a baseline record
            sync_or_create_user(f"usr_{norm_email.replace('@', '_').replace('.', '_')}", norm_email)
            c.execute("SELECT * FROM users WHERE email = ?", (norm_email,))
            user = c.fetchone()

        current_pages = user["pages_processed"] or 0
        current_queries = user["queries_made"] or 0
        tier = user["tier"] or "starter"
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["starter"])

        try:
            workspaces_list = json.loads(user["workspaces"] or "[]")
        except Exception:
            workspaces_list = []

        if new_workspace and new_workspace not in workspaces_list:
            if not is_admin and len(workspaces_list) >= user["workspaces_allowed"]:
                return False, f"Workspace limit reached ({len(workspaces_list)}/{user['workspaces_allowed']}). Upgrade to Pro."
            workspaces_list.append(new_workspace)

        if not is_admin:
            if new_pages > 0 and (current_pages + new_pages > limits["max_pages"]):
                return False, f"Monthly page limit exceeded. You have {limits['max_pages'] - current_pages} pages remaining."
            if new_queries > 0 and (current_queries + new_queries > limits["max_queries"]):
                return False, f"Query quota exceeded ({current_queries}/{limits['max_queries']}). Upgrade to Pro."

        c.execute("""
            UPDATE users
            SET pages_processed = pages_processed + ?,
                queries_made = queries_made + ?,
                workspaces = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
        """, (new_pages, new_queries, json.dumps(workspaces_list), norm_email))
        conn.commit()

        return True, "Success"

def upgrade_user_tier(email: str, tier: str) -> bool:
    """Updates user tier upon payment confirmation."""
    norm_email = email.strip().lower()
    is_admin = is_admin_email(norm_email)
    assigned_tier = "admin_unrestricted" if is_admin else tier
    workspaces = 999999 if is_admin else (5 if tier == "pro" else 1)

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE email = ?", (norm_email,))
        if not c.fetchone():
            sync_or_create_user(f"usr_{norm_email.replace('@', '_').replace('.', '_')}", norm_email)
        
        c.execute("""
            UPDATE users
            SET tier = ?,
                workspaces_allowed = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
        """, (assigned_tier, workspaces, norm_email))
        conn.commit()
        return True

