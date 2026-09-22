import sqlite3
from typing import Optional, Dict, Any

DB_PATH = "sandbox_usage.db"

ADMIN_EMAILS = {
    "saini.saransh03@gmail.com",
    "saransh.saini.ai@gmail.com",
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Seed or ensure admin accounts exist with unrestricted superuser tier
        for admin_email in ADMIN_EMAILS:
            conn.execute("""
                INSERT INTO users (id, email, name, role, tier, workspaces_allowed)
                VALUES (?, ?, 'Saransh Saini (Admin)', 'admin', 'admin_unrestricted', 999999)
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
        return dict(row) if row else None

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
    workspaces = 999999 if is_admin else 1

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
            INSERT INTO users (id, email, name, provider, role, tier, workspaces_allowed)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = COALESCE(excluded.name, users.name),
                provider = excluded.provider,
                role = CASE WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END,
                tier = CASE WHEN users.role = 'admin' THEN 'admin_unrestricted' ELSE users.tier END,
                workspaces_allowed = CASE WHEN users.role = 'admin' THEN 999999 ELSE users.workspaces_allowed END,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, norm_email, name, provider, role, tier, workspaces))
        conn.commit()

        c.execute("SELECT * FROM users WHERE email = ?", (norm_email,))
        return dict(c.fetchone())
