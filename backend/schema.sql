-- ═══════════════════════════════════════════════════════
--  S3 Studio OS · SQLite Schema
--  Covers: Contacts, Tracks, Projects, Email Campaigns,
--          Whiteboard, Follow-Ups, Theme, Cloud Metadata
-- ═══════════════════════════════════════════════════════
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── CONTACTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  role          TEXT    DEFAULT 'Artist',       -- Artist | Exec | Producer | Engineer | DJ | Creative | A&R
  tier          INTEGER DEFAULT 3,              -- 1 Inner Circle … 5 Blacklist
  location      TEXT    DEFAULT '',
  company       TEXT    DEFAULT '',
  email         TEXT    DEFAULT '',
  phone         TEXT    DEFAULT '',
  instagram     TEXT    DEFAULT '',
  notes         TEXT    DEFAULT '',
  status        TEXT    DEFAULT 'Active',       -- Active | Inactive | Reach Out
  last_contact  DATE,
  health_score  INTEGER DEFAULT 50,             -- 0-100 relationship health
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contacts_tier    ON contacts(tier);
CREATE INDEX IF NOT EXISTS idx_contacts_status  ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_role    ON contacts(role);

-- ── TRACKS / AUDIO ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT    NOT NULL,
  title         TEXT,
  bpm           INTEGER,
  key           TEXT,
  genre         TEXT,
  collaborators TEXT,                           -- comma-separated names
  cover_url     TEXT,
  source        TEXT    DEFAULT 'local',        -- local | dropbox | gdrive | offtop
  file_path     TEXT,
  duration_sec  INTEGER,
  is_ic         INTEGER DEFAULT 0,             -- inner circle only flag
  tags          TEXT,                           -- JSON array
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_genre  ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_bpm    ON tracks(bpm);
CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source);

-- ── PROJECTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  type          TEXT    DEFAULT 'Session',      -- Session | Release | Sync | Collab | Mix | Commitment
  col           TEXT    DEFAULT 'upcoming',     -- past | current | upcoming | hold
  deadline      DATE,
  color         TEXT    DEFAULT '#f59e0b',
  notes         TEXT    DEFAULT '',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── PROJECT ↔ CONTACT LINKS ───────────────────────────
CREATE TABLE IF NOT EXISTS project_contacts (
  project_id    INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  contact_id    INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
  role_in_proj  TEXT,
  PRIMARY KEY (project_id, contact_id)
);

-- ── PROJECT ↔ TRACK LINKS ─────────────────────────────
CREATE TABLE IF NOT EXISTS project_tracks (
  project_id    INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  track_id      INTEGER REFERENCES tracks(id)   ON DELETE CASCADE,
  PRIMARY KEY (project_id, track_id)
);

-- ── EMAIL CAMPAIGNS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subject         TEXT    NOT NULL,
  body            TEXT    NOT NULL,
  template_name   TEXT,
  recipient_count INTEGER DEFAULT 0,
  sent_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── EMAIL SENDS (per-recipient, for open tracking) ────
CREATE TABLE IF NOT EXISTS email_sends (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id     INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id      INTEGER REFERENCES contacts(id),
  email           TEXT    NOT NULL,
  tracking_token  TEXT    UNIQUE,               -- UUID used in 1×1 pixel URL
  sent_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  opened_at       DATETIME,
  opened_count    INTEGER DEFAULT 0,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_sends_token    ON email_sends(tracking_token);
CREATE INDEX IF NOT EXISTS idx_sends_campaign ON email_sends(campaign_id);

-- ── FOLLOW-UPS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  title       TEXT    NOT NULL,
  type        TEXT    DEFAULT 'demo_sent',      -- demo_sent | meeting | feedback_pending | pitch | general
  status      TEXT    DEFAULT 'pending',        -- pending | done | overdue | snoozed
  due_date    DATE,
  reminder_at DATETIME,
  notes       TEXT    DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_due    ON followups(due_date);

-- ── WHITEBOARD NODES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS whiteboard_nodes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    DEFAULT 'card',           -- card | sticky | image | section
  x           REAL    DEFAULT 100,
  y           REAL    DEFAULT 100,
  w           REAL    DEFAULT 240,
  h           REAL    DEFAULT 160,
  content     TEXT    DEFAULT '',
  color       TEXT    DEFAULT '#1c1c1c',
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  zindex      INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── WHITEBOARD CONNECTORS ─────────────────────────────
CREATE TABLE IF NOT EXISTS whiteboard_connectors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  from_node   INTEGER REFERENCES whiteboard_nodes(id) ON DELETE CASCADE,
  to_node     INTEGER REFERENCES whiteboard_nodes(id) ON DELETE CASCADE,
  label       TEXT    DEFAULT ''
);

-- ── CLOUD FILE METADATA CACHE ─────────────────────────
CREATE TABLE IF NOT EXISTS cloud_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      TEXT    NOT NULL,                 -- dropbox | gdrive | offtop
  remote_id   TEXT    NOT NULL,                 -- provider's file ID
  name        TEXT    NOT NULL,
  path        TEXT,
  size_bytes  INTEGER,
  modified_at DATETIME,
  cached_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, remote_id)
);

-- ── THEME / DESIGN ENGINE ─────────────────────────────
CREATE TABLE IF NOT EXISTS theme_settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  layout        TEXT    DEFAULT 'untitled',     -- untitled | editorial | portfolio
  colors        TEXT    DEFAULT '{}',           -- JSON
  fonts         TEXT    DEFAULT '{}',           -- JSON
  section_order TEXT    DEFAULT '[]',           -- JSON
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO theme_settings (id) VALUES (1);
