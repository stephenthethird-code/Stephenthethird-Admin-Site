"""
db.py — SQLite database initialization and helpers for S3 Hub
Place this in ~/music-hub/backend/ and import where needed.

Usage:
  from db import get_db, init_db, query, execute

  # Initialize (run once):
  python3 -c "from db import init_db; init_db()"
"""

import sqlite3
import json
import os
from pathlib import Path

# ── Config ───────────────────────────────────────────────────────────────────
DB_PATH    = Path(__file__).parent / "s3hub.db"
SCHEMA_SQL = Path(__file__).parent / "schema.sql"


def get_db():
    """Return a database connection with row_factory set."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist, then seed from beats_metadata.json."""
    conn = get_db()
    # Run schema
    schema_path = Path(__file__).parent / "schema.sql"
    if schema_path.exists():
        with open(schema_path) as f:
            conn.executescript(f.read())
        conn.commit()
        print(f"[DB] Schema applied → {DB_PATH}")
    else:
        print("[DB] schema.sql not found — create it first")
        return

    # Seed tracks from beats_metadata.json if table is empty
    count = conn.execute("SELECT COUNT(*) FROM tracks").fetchone()[0]
    if count == 0:
        meta_path = Path(__file__).parent / "beats_metadata.json"
        if meta_path.exists():
            with open(meta_path) as f:
                beats = json.load(f)
            rows = []
            for b in beats:
                folder = b.get("folder") or _infer_folder(b.get("path",""))
                rows.append((
                    b.get("filename",""),
                    b.get("name") or b.get("filename",""),
                    b.get("path",""),
                    folder,
                    b.get("bpm"),
                    b.get("key"),
                    b.get("duration"),
                    b.get("genre",""),
                    json.dumps(b.get("tags", [])),
                    b.get("collaborators") or b.get("artists",""),
                    b.get("notes",""),
                    b.get("coverArt") or b.get("cover",""),
                    b.get("spotifyUrl",""),
                    0,  # inner_circle
                    0,  # featured
                    b.get("date",""),
                ))
            conn.executemany("""
                INSERT INTO tracks
                  (filename,name,path,folder,bpm,key_sig,duration_sec,genre,tags,
                   collaborators,notes,cover_art,spotify_url,inner_circle,featured,date_recorded)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, rows)
            conn.commit()
            print(f"[DB] Seeded {len(rows)} tracks from beats_metadata.json")
        else:
            print("[DB] beats_metadata.json not found — tracks table is empty")

    conn.close()


def _infer_folder(path: str) -> str:
    p = path.lower()
    if "1beats" in p:           return "1BEATS"
    if "new songs" in p:        return "NEW SONGS & RECORDS"
    if "records" in p:          return "NEW SONGS & RECORDS"
    if "demos" in p:            return "DEMOS"
    return "ROOT"


def query(sql: str, params=()) -> list[dict]:
    """Run a SELECT and return list of dicts."""
    conn = get_db()
    try:
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def execute(sql: str, params=()) -> int:
    """Run INSERT/UPDATE/DELETE, return lastrowid."""
    conn = get_db()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_site_config() -> dict:
    """Return all site config as a flat dict."""
    rows = query("SELECT key, value FROM site_config")
    return {r["key"]: json.loads(r["value"]) for r in rows}


def set_site_config(key: str, value, updated_by: str = "system"):
    """Upsert a config value."""
    execute("""
        INSERT INTO site_config (key, value, updated_by, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value=excluded.value,
          updated_by=excluded.updated_by,
          updated_at=excluded.updated_at
    """, (key, json.dumps(value), updated_by))
