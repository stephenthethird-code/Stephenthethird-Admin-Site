-- ============================================================
-- S3 Hub — SQLite Database Schema
-- Run once: python3 -c "import db; db.init_db()"
-- ============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─── TRACKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT    NOT NULL,
  name          TEXT,                        -- display name (cleaned)
  path          TEXT,                        -- full path on disk
  folder        TEXT DEFAULT 'ROOT',         -- 1BEATS / NEW SONGS & RECORDS / DEMOS / ROOT
  bpm           REAL,
  key_sig       TEXT,                        -- e.g. "F# minor"
  duration_sec  REAL,
  genre         TEXT,
  tags          TEXT,                        -- JSON array: ["trap","rnb"]
  collaborators TEXT,                        -- comma-separated names
  notes         TEXT,
  cover_art     TEXT,                        -- relative path to uploaded image
  spotify_url   TEXT,
  inner_circle  INTEGER DEFAULT 0,           -- boolean 0/1
  featured      INTEGER DEFAULT 0,
  date_recorded TEXT,                        -- ISO date
  date_added    TEXT DEFAULT (date('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_folder    ON tracks(folder);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm       ON tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_genre     ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_featured  ON tracks(featured);

-- ─── CONTACTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  role        TEXT,                          -- Artist / Exec / Producer / Engineer / Writer / Creative
  tier        INTEGER DEFAULT 3,             -- 1=Inner Circle 2=Collab 3=Network 4=Target 5=Blacklist
  location    TEXT,
  company     TEXT,
  email       TEXT,
  phone       TEXT,
  instagram   TEXT,
  notes       TEXT,
  status      TEXT DEFAULT 'Active',         -- Active / Inactive / Reach Out
  lat         REAL,                          -- for contact map
  lng         REAL,
  last_contact TEXT,                         -- ISO date
  date_added  TEXT DEFAULT (date('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_tier   ON contacts(tier);
CREATE INDEX IF NOT EXISTS idx_contacts_role   ON contacts(role);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- ─── PROJECTS / WORKING ON ──────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  artist      TEXT,
  status      TEXT DEFAULT 'In Progress',    -- In Progress / Submitted / Released / On Hold
  priority    INTEGER DEFAULT 3,             -- 1=High 2=Med 3=Low
  deadline    TEXT,                          -- ISO date
  notes       TEXT,
  track_ids   TEXT,                          -- JSON array of track IDs
  contact_ids TEXT,                          -- JSON array of contact IDs
  cover_art   TEXT,
  date_added  TEXT DEFAULT (date('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ─── INBOX / MESSAGES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id  INTEGER REFERENCES contacts(id),
  direction   TEXT DEFAULT 'inbound',        -- inbound / outbound
  subject     TEXT,
  body        TEXT    NOT NULL,
  channel     TEXT DEFAULT 'email',          -- email / sms / ig
  status      TEXT DEFAULT 'unread',         -- unread / read / archived
  sent_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_status  ON messages(status);

-- ─── UPLOADED MEDIA ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT    NOT NULL,
  original_name TEXT,
  mime_type   TEXT,
  size_bytes  INTEGER,
  url_path    TEXT,                          -- /uploads/filename
  entity_type TEXT,                          -- track / contact / project / site
  entity_id   INTEGER,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- ─── SITE CONFIGURATION (Design tokens) ─────────────────────
CREATE TABLE IF NOT EXISTS site_config (
  key         TEXT PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  TEXT DEFAULT (datetime('now')),
  updated_by  TEXT
);

-- Default site config values
INSERT OR IGNORE INTO site_config (key, value) VALUES
  ('theme.layout',           '"untitled"'),
  ('theme.colors.background','"#050505"'),
  ('theme.colors.surface',   '"#0d0d0d"'),
  ('theme.colors.accent',    '"#fbbf24"'),
  ('theme.fonts.heading',    '"Inter"'),
  ('theme.fonts.body',       '"Inter"'),
  ('site.title',             '"stephenthethird"'),
  ('site.tagline',           '"Producer · Multi-Instrumentalist · Songwriter"'),
  ('site.location',          '"New York City"'),
  ('site.email',             '"contact@stephenthethird.com"'),
  ('site.instagram',         '"@stephenthethird"');

-- ─── THEME DRAFTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS theme_drafts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  config_json TEXT    NOT NULL,              -- full theme JSON blob
  status      TEXT DEFAULT 'draft',          -- draft / pending / published
  author      TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  published_at TEXT
);
