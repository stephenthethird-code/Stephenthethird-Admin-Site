"""
S3 Studio OS — Flask Backend  (app.py)
Run:  pip install flask flask-cors mutagen dropbox google-auth google-auth-oauthlib
      python app.py
Serves on http://localhost:5050
"""

from dotenv import load_dotenv; load_dotenv()
import os, sqlite3, json, uuid, smtplib, threading
from datetime import datetime, date
from email.mime.text       import MIMEText
from email.mime.multipart  import MIMEMultipart
from functools             import wraps

from flask      import Flask, request, jsonify, send_file, g, redirect, url_for, abort
from flask_cors import CORS

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DB_PATH      = os.getenv("DB_PATH") or os.path.join(BASE_DIR, "studioos.db")
UPLOAD_DIR   = os.path.join(BASE_DIR, "uploads")
COVER_DIR    = os.path.join(UPLOAD_DIR, "covers")
AUDIO_DIR    = os.path.join(UPLOAD_DIR, "audio")

SMTP_HOST    = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT    = int(os.getenv("SMTP_PORT", 587))
SMTP_USER    = os.getenv("SMTP_USER", "")          # set in environment
SMTP_PASS    = os.getenv("SMTP_PASS", "")          # App Password recommended

PUBLIC_URL   = os.getenv("PUBLIC_URL", "http://localhost:5050")  # for tracking pixel

DROPBOX_KEY    = os.getenv("DROPBOX_APP_KEY", "")
DROPBOX_SECRET = os.getenv("DROPBOX_APP_SECRET", "")
GDRIVE_CREDS   = os.getenv("GDRIVE_CREDENTIALS_JSON", "")  # path to credentials.json

os.makedirs(COVER_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")}})

# ── Database helpers ──────────────────────────────────────────────────────────
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def query(sql, args=(), one=False):
    cur = get_db().execute(sql, args)
    rows = cur.fetchall()
    return (rows[0] if rows else None) if one else rows

def execute(sql, args=()):
    db  = get_db()
    cur = db.execute(sql, args)
    db.commit()
    return cur

def row2dict(row):
    return dict(row) if row else None

def init_db():
    schema = os.path.join(BASE_DIR, "schema.sql")
    with sqlite3.connect(DB_PATH) as con:
        con.row_factory = sqlite3.Row
        with open(schema) as f:
            con.executescript(f.read())
    print("✓ Database initialised")

# ── Auth ─────────────────────────────────────────────────────────────────────
# Real login lives in auth.py (users table, signed tokens, global /api gate).
from auth import init_auth, require_superadmin as require_admin   # noqa: E402

# ══════════════════════════════════════════════════════════════════════════════
#  CONTACTS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/contacts", methods=["GET"])
def get_contacts():
    tier   = request.args.get("tier")
    status = request.args.get("status")
    role   = request.args.get("role")
    q      = request.args.get("q","").strip()

    sql  = "SELECT * FROM contacts WHERE 1=1"
    args = []
    if tier:   sql += " AND tier=?";   args.append(int(tier))
    if status: sql += " AND status=?"; args.append(status)
    if role:   sql += " AND role=?";   args.append(role)
    if q:
        sql += " AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR notes LIKE ?)"
        args += [f"%{q}%"]*4
    sql += " ORDER BY tier, name"
    rows = query(sql, args)
    return jsonify([row2dict(r) for r in rows])

@app.route("/api/contacts/<int:cid>", methods=["GET"])
def get_contact(cid):
    row = query("SELECT * FROM contacts WHERE id=?", (cid,), one=True)
    return jsonify(row2dict(row)) if row else ("Not found", 404)

@app.route("/api/contacts", methods=["POST"])
def create_contact():
    d = request.json or {}
    cur = execute(
        """INSERT INTO contacts
           (name,role,tier,location,company,email,phone,instagram,notes,status)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (d.get("name",""), d.get("role","Artist"), d.get("tier",3),
         d.get("location",""), d.get("company",""), d.get("email",""),
         d.get("phone",""), d.get("instagram",""), d.get("notes",""),
         d.get("status","Active"))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/contacts/<int:cid>", methods=["PATCH"])
def update_contact(cid):
    d     = request.json or {}
    cols  = [k for k in d if k in
             ("name","role","tier","location","company","email","phone",
              "instagram","notes","status","last_contact","health_score")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql  = "UPDATE contacts SET " + ",".join(f"{c}=?" for c in cols)
    sql += ",updated_at=CURRENT_TIMESTAMP WHERE id=?"
    execute(sql, [d[c] for c in cols] + [cid])
    return jsonify({"ok": True})

@app.route("/api/contacts/<int:cid>", methods=["DELETE"])
def delete_contact(cid):
    execute("DELETE FROM contacts WHERE id=?", (cid,))
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════════
#  TRACKS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/tracks", methods=["GET"])
def get_tracks():
    q     = request.args.get("q","")
    genre = request.args.get("genre")
    sql   = "SELECT * FROM tracks WHERE 1=1"
    args  = []
    if q:
        sql += " AND (title LIKE ? OR collaborators LIKE ? OR genre LIKE ?)"
        args += [f"%{q}%"]*3
    if genre:
        sql += " AND genre=?"; args.append(genre)
    sql += " ORDER BY created_at DESC"
    rows = query(sql, args)
    return jsonify([row2dict(r) for r in rows])

@app.route("/api/tracks", methods=["POST"])
def create_track():
    d   = request.json or {}
    cur = execute(
        """INSERT INTO tracks
           (filename,title,bpm,key,genre,collaborators,cover_url,source,file_path,is_ic,tags)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get("filename",""), d.get("title",""), d.get("bpm"),
         d.get("key",""), d.get("genre",""), d.get("collaborators",""),
         d.get("cover_url",""), d.get("source","local"), d.get("file_path",""),
         int(d.get("is_ic", False)), json.dumps(d.get("tags",[])))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/tracks/<int:tid>", methods=["PATCH"])
def update_track(tid):
    d    = request.json or {}
    cols = [k for k in d if k in
            ("title","bpm","key","genre","collaborators","cover_url","is_ic","tags")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE tracks SET " + ",".join(f"{c}=?" for c in cols) + " WHERE id=?"
    execute(sql, [json.dumps(d[c]) if c == "tags" else d[c] for c in cols] + [tid])
    return jsonify({"ok": True})

@app.route("/api/tracks/<int:tid>", methods=["DELETE"])
def delete_track(tid):
    execute("DELETE FROM tracks WHERE id=?", (tid,))
    return jsonify({"ok": True})

# ── Cover image upload ────────────────────────────────────────────────────────
@app.route("/api/upload/image", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    f    = request.files["file"]
    ext  = os.path.splitext(f.filename)[1].lower() or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(COVER_DIR, name)
    f.save(path)
    return jsonify({"url": f"{PUBLIC_URL}/covers/{name}"})

@app.route("/covers/<filename>")
def serve_cover(filename):
    return send_file(os.path.join(COVER_DIR, filename))

# ── Batch audio upload ────────────────────────────────────────────────────────
@app.route("/api/upload/audio", methods=["POST"])
def upload_audio():
    """Accepts multiple audio files; auto-indexes BPM/Key via mutagen if available."""
    if "files" not in request.files:
        return jsonify({"error": "no files"}), 400
    saved = []
    for f in request.files.getlist("files"):
        ext  = os.path.splitext(f.filename)[1].lower()
        name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(AUDIO_DIR, name)
        f.save(path)
        meta = _extract_audio_meta(path, f.filename)
        cur  = execute(
            """INSERT INTO tracks (filename,title,bpm,key,genre,source,file_path)
               VALUES (?,?,?,?,?,?,?)""",
            (f.filename, meta["title"], meta["bpm"], meta["key"],
             meta["genre"], "local", path)
        )
        saved.append({"id": cur.lastrowid, "filename": f.filename, **meta})
    return jsonify(saved), 201

def _extract_audio_meta(path, original_name):
    """Try to pull BPM/Key from ID3 tags via mutagen."""
    meta = {"title": os.path.splitext(original_name)[0],
            "bpm": None, "key": None, "genre": None}
    try:
        from mutagen import File
        audio = File(path, easy=True)
        if audio:
            meta["bpm"]   = int(audio.get("bpm", [None])[0] or 0) or None
            meta["key"]   = (audio.get("initialkey") or audio.get("key") or [None])[0]
            meta["genre"] = (audio.get("genre") or [None])[0]
    except Exception:
        pass
    return meta

# ══════════════════════════════════════════════════════════════════════════════
#  PROJECTS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/projects", methods=["GET"])
def get_projects():
    rows = query("SELECT * FROM projects ORDER BY deadline ASC")
    return jsonify([row2dict(r) for r in rows])

@app.route("/api/projects", methods=["POST"])
def create_project():
    d   = request.json or {}
    cur = execute(
        "INSERT INTO projects (title,type,col,deadline,color,notes) VALUES (?,?,?,?,?,?)",
        (d.get("title","Untitled"), d.get("type","Session"),
         d.get("col","upcoming"), d.get("deadline"), d.get("color","#f59e0b"),
         d.get("notes",""))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/projects/<int:pid>", methods=["PATCH"])
def update_project(pid):
    d    = request.json or {}
    cols = [k for k in d if k in ("title","type","col","deadline","color","notes")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE projects SET " + ",".join(f"{c}=?" for c in cols)
    sql += ",updated_at=CURRENT_TIMESTAMP WHERE id=?"
    execute(sql, [d[c] for c in cols] + [pid])
    return jsonify({"ok": True})

@app.route("/api/projects/<int:pid>", methods=["DELETE"])
def delete_project(pid):
    execute("DELETE FROM projects WHERE id=?", (pid,))
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════════
#  EMAIL — Mass send + open tracking
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/email/send", methods=["POST"])
def send_email():
    """
    Body: { to: ["email"|contact_id, ...], subject, body, template_name? }
    Sends individually per recipient with unique tracking pixel.
    """
    d = request.json or {}
    subject   = d.get("subject","")
    body_text = d.get("body","")
    recipients = d.get("to", [])

    if not subject or not body_text or not recipients:
        return jsonify({"error": "subject, body, and to are required"}), 400

    # Create campaign record
    cur = execute(
        "INSERT INTO email_campaigns (subject,body,template_name,recipient_count) VALUES (?,?,?,?)",
        (subject, body_text, d.get("template_name",""), len(recipients))
    )
    campaign_id = cur.lastrowid

    results = []
    for r in recipients:
        # r can be an email string or a contact_id int
        if isinstance(r, int):
            contact = query("SELECT * FROM contacts WHERE id=?", (r,), one=True)
            email   = row2dict(contact)["email"] if contact else None
            cid     = r
        else:
            email   = r
            cid     = None

        if not email:
            results.append({"email": r, "status": "skipped"})
            continue

        token = uuid.uuid4().hex
        pixel = f"{PUBLIC_URL}/api/email/track/{token}"

        # Substitute [Name] placeholder
        contact_name = ""
        if cid:
            c = query("SELECT name FROM contacts WHERE id=?", (cid,), one=True)
            contact_name = c["name"].split()[0] if c else ""
        personalised = body_text.replace("[Name]", contact_name) if contact_name else body_text

        html_body = f"""<html><body>
{personalised.replace(chr(10), '<br>')}
<img src="{pixel}" width="1" height="1" style="display:none" />
</body></html>"""

        execute(
            "INSERT INTO email_sends (campaign_id,contact_id,email,tracking_token) VALUES (?,?,?,?)",
            (campaign_id, cid, email, token)
        )

        # Send in background thread so API returns quickly
        threading.Thread(
            target=_send_smtp,
            args=(email, subject, html_body, token, campaign_id),
            daemon=True
        ).start()

        results.append({"email": email, "status": "queued", "token": token})

    return jsonify({"campaign_id": campaign_id, "results": results})


def _send_smtp(to_email, subject, html_body, token, campaign_id):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_USER
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, to_email, msg.as_string())

        # Mark send success
        with sqlite3.connect(DB_PATH) as con:
            con.execute(
                "UPDATE email_sends SET sent_at=CURRENT_TIMESTAMP WHERE tracking_token=?",
                (token,)
            )
    except Exception as e:
        with sqlite3.connect(DB_PATH) as con:
            con.execute(
                "UPDATE email_sends SET error=? WHERE tracking_token=?",
                (str(e), token)
            )


@app.route("/api/email/track/<token>")
def track_open(token):
    """1×1 tracking pixel endpoint."""
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """UPDATE email_sends
               SET opened_at=COALESCE(opened_at,CURRENT_TIMESTAMP),
                   opened_count=opened_count+1
               WHERE tracking_token=?""",
            (token,)
        )
    # Return a transparent 1×1 GIF
    gif = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
    from flask import Response
    return Response(gif, mimetype="image/gif")


@app.route("/api/email/campaigns", methods=["GET"])
def get_campaigns():
    rows = query(
        """SELECT c.*, COUNT(s.id) total, SUM(s.opened_count>0) opened
           FROM email_campaigns c
           LEFT JOIN email_sends s ON s.campaign_id=c.id
           GROUP BY c.id ORDER BY c.sent_at DESC"""
    )
    return jsonify([row2dict(r) for r in rows])


@app.route("/api/email/campaigns/<int:cid>/sends", methods=["GET"])
def get_campaign_sends(cid):
    rows = query(
        """SELECT s.*, c.name contact_name
           FROM email_sends s
           LEFT JOIN contacts c ON c.id=s.contact_id
           WHERE s.campaign_id=?""", (cid,)
    )
    return jsonify([row2dict(r) for r in rows])

# ══════════════════════════════════════════════════════════════════════════════
#  FOLLOW-UPS
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/followups", methods=["GET"])
def get_followups():
    status = request.args.get("status")
    sql    = "SELECT f.*, c.name contact_name FROM followups f LEFT JOIN contacts c ON c.id=f.contact_id WHERE 1=1"
    args   = []
    if status:
        sql += " AND f.status=?"; args.append(status)
    sql += " ORDER BY f.due_date ASC, f.created_at ASC"
    rows = query(sql, args)
    return jsonify([row2dict(r) for r in rows])

@app.route("/api/followups", methods=["POST"])
def create_followup():
    d   = request.json or {}
    cur = execute(
        "INSERT INTO followups (contact_id,title,type,status,due_date,notes) VALUES (?,?,?,?,?,?)",
        (d.get("contact_id"), d.get("title",""), d.get("type","general"),
         d.get("status","pending"), d.get("due_date"), d.get("notes",""))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/followups/<int:fid>", methods=["PATCH"])
def update_followup(fid):
    d    = request.json or {}
    cols = [k for k in d if k in ("title","type","status","due_date","notes","contact_id")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE followups SET " + ",".join(f"{c}=?" for c in cols)
    sql += ",updated_at=CURRENT_TIMESTAMP WHERE id=?"
    execute(sql, [d[c] for c in cols] + [fid])
    return jsonify({"ok": True})

@app.route("/api/followups/<int:fid>", methods=["DELETE"])
def delete_followup(fid):
    execute("DELETE FROM followups WHERE id=?", (fid,))
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════════
#  WHITEBOARD NODES
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/whiteboard", methods=["GET"])
def get_whiteboard():
    nodes = query("SELECT * FROM whiteboard_nodes ORDER BY zindex")
    conns = query("SELECT * FROM whiteboard_connectors")
    return jsonify({"nodes": [row2dict(r) for r in nodes],
                   "connectors": [row2dict(r) for r in conns]})

@app.route("/api/whiteboard/nodes", methods=["POST"])
def create_node():
    d   = request.json or {}
    cur = execute(
        "INSERT INTO whiteboard_nodes (type,x,y,w,h,content,color,project_id,zindex) VALUES (?,?,?,?,?,?,?,?,?)",
        (d.get("type","card"), d.get("x",100), d.get("y",100),
         d.get("w",240), d.get("h",160), d.get("content",""),
         d.get("color","#1c1c1c"), d.get("project_id"), d.get("zindex",0))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/whiteboard/nodes/<int:nid>", methods=["PATCH"])
def update_node(nid):
    d    = request.json or {}
    cols = [k for k in d if k in ("x","y","w","h","content","color","zindex","project_id")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE whiteboard_nodes SET " + ",".join(f"{c}=?" for c in cols) + " WHERE id=?"
    execute(sql, [d[c] for c in cols] + [nid])
    return jsonify({"ok": True})

@app.route("/api/whiteboard/nodes/<int:nid>", methods=["DELETE"])
def delete_node(nid):
    execute("DELETE FROM whiteboard_nodes WHERE id=?", (nid,))
    return jsonify({"ok": True})

# ── Bulk position save (called on drag-end) ───────────────────────────────────
@app.route("/api/whiteboard/nodes/bulk", methods=["PATCH"])
def bulk_update_nodes():
    """Body: [{ id, x, y }, ...]"""
    updates = request.json or []
    db = get_db()
    for u in updates:
        db.execute("UPDATE whiteboard_nodes SET x=?,y=? WHERE id=?",
                   (u["x"], u["y"], u["id"]))
    db.commit()
    return jsonify({"ok": True, "count": len(updates)})

# ══════════════════════════════════════════════════════════════════════════════
#  THEME
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/theme", methods=["GET"])
def get_theme():
    row = query("SELECT * FROM theme_settings WHERE id=1", one=True)
    return jsonify(row2dict(row))

@app.route("/api/theme", methods=["PATCH"])
def save_theme():
    d = request.json or {}
    fields = {k: v for k, v in d.items() if k in ("layout","colors","fonts","section_order")}
    for k in ("colors","fonts","section_order"):
        if k in fields and not isinstance(fields[k], str):
            fields[k] = json.dumps(fields[k])
    cols = list(fields.keys())
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE theme_settings SET " + ",".join(f"{c}=?" for c in cols)
    sql += ",updated_at=CURRENT_TIMESTAMP WHERE id=1"
    execute(sql, list(fields.values()))
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════════
#  MESSAGES (contact form inbox)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/messages", methods=["GET"])
def get_messages():
    rows = query("SELECT * FROM messages ORDER BY created_at DESC") if _table_exists("messages") else []
    return jsonify([row2dict(r) for r in rows] if rows else [])

@app.route("/api/messages", methods=["POST"])
def post_message():
    d = request.json or {}
    _ensure_messages_table()
    cur = execute(
        "INSERT INTO messages (from_name,from_email,subject,body) VALUES (?,?,?,?)",
        (d.get("from_name",""), d.get("from_email",""),
         d.get("subject",""), d.get("body",""))
    )
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/messages/<int:mid>/read", methods=["PATCH"])
def mark_read(mid):
    _ensure_messages_table()
    execute("UPDATE messages SET read=1 WHERE id=?", (mid,))
    return jsonify({"ok": True})

@app.route("/api/messages/<int:mid>", methods=["DELETE"])
def delete_message(mid):
    _ensure_messages_table()
    execute("DELETE FROM messages WHERE id=?", (mid,))
    return jsonify({"ok": True})

def _table_exists(name):
    r = query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,), one=True)
    return bool(r)

def _ensure_messages_table():
    execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_name TEXT, from_email TEXT, subject TEXT, body TEXT,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

# ══════════════════════════════════════════════════════════════════════════════
#  CLOUD INTEGRATION — Dropbox
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/cloud/dropbox/auth")
def dropbox_auth():
    """Redirect user to Dropbox OAuth consent screen."""
    from dropbox import DropboxOAuth2Flow
    _dbx_session = {}
    flow = DropboxOAuth2Flow(
        consumer_key=DROPBOX_KEY,
        redirect_uri=f"{PUBLIC_URL}/api/cloud/dropbox/callback",
        session=_dbx_session,
        csrf_token_session_key="dropbox_csrf",
        consumer_secret=DROPBOX_SECRET,
    )
    url, _ = flow.start()
    # Stash csrf token so callback can verify (in-memory, single-process only)
    app.config["_dbx_csrf"] = _dbx_session.get("dropbox_csrf","")
    return redirect(url)

@app.route("/api/cloud/dropbox/callback")
def dropbox_callback():
    """Exchange code for token and cache it."""
    from dropbox import DropboxOAuth2Flow
    state = request.args.get("state", "")
    _dbx_session = {"dropbox_csrf": app.config.get("_dbx_csrf", state)}
    try:
        flow = DropboxOAuth2Flow(
            consumer_key=DROPBOX_KEY,
            redirect_uri=f"{PUBLIC_URL}/api/cloud/dropbox/callback",
            session=_dbx_session,
            csrf_token_session_key="dropbox_csrf",
            consumer_secret=DROPBOX_SECRET,
        )
        result = flow.finish(request.args)
        os.environ["DROPBOX_TOKEN"] = result.access_token
        return "<html><body><h2>✅ Dropbox connected! You can close this tab.</h2></body></html>"
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/cloud/dropbox/browse")
def dropbox_browse():
    """List files in a Dropbox folder (path param)."""
    token = os.getenv("DROPBOX_TOKEN","")
    if not token:
        return jsonify({"error": "not_connected", "auth_url": f"{PUBLIC_URL}/api/cloud/dropbox/auth"}), 401
    try:
        import dropbox
        dbx    = dropbox.Dropbox(token)
        path   = request.args.get("path","")
        result = dbx.files_list_folder(path)
        files  = []
        for e in result.entries:
            files.append({
                "name":   e.name,
                "id":     e.id,
                "type":   "folder" if isinstance(e, dropbox.files.FolderMetadata) else "file",
                "size":   getattr(e, "size", 0),
                "modified": str(getattr(e, "server_modified", "")),
            })
        return jsonify(files)
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500

SHARED_FOLDER_URL = "https://www.dropbox.com/scl/fo/9h0hc2f9w5l0t9rjzcu4o/AMq2HTos-r_ViVYak8QAnJI?rlkey=2wtggsdwffa34jcnyjazurk2e&dl=0"
AUDIO_EXTENSIONS  = {".mp3",".wav",".aif",".aiff",".flac",".m4a",".ogg",".wma",".aac"}

@app.route("/api/cloud/dropbox/status")
def dropbox_status():
    """Check if Dropbox is connected (token present)."""
    token = os.getenv("DROPBOX_TOKEN","")
    return jsonify({"connected": bool(token)})

@app.route("/api/cloud/dropbox/shared-folder")
def dropbox_shared_folder():
    """List audio files from the pinned shared folder using OAuth token."""
    import dropbox as dbx_module
    token = os.getenv("DROPBOX_TOKEN","")
    path  = request.args.get("path","")   # sub-path within the shared folder
    try:
        if token:
            # Authenticated path: use shared link with user token
            dbx = dbx_module.Dropbox(token)
            sl  = dbx_module.files.SharedLink(url=SHARED_FOLDER_URL)
            result = dbx.files_list_folder(path, shared_link=sl)
        else:
            # Unauthenticated: try app-only access (works for public links)
            if not (DROPBOX_KEY and DROPBOX_SECRET):
                return jsonify({"error": "not_connected",
                                "auth_url": f"{PUBLIC_URL}/api/cloud/dropbox/auth"}), 401
            dbx = dbx_module.Dropbox(app_key=DROPBOX_KEY, app_secret=DROPBOX_SECRET)
            sl  = dbx_module.files.SharedLink(url=SHARED_FOLDER_URL)
            result = dbx.files_list_folder(path, shared_link=sl)

        entries = []
        while True:
            for e in result.entries:
                ext  = os.path.splitext(e.name)[1].lower()
                kind = "folder" if isinstance(e, dbx_module.files.FolderMetadata) else "file"
                if kind == "folder" or ext in AUDIO_EXTENSIONS:
                    entries.append({
                        "name":     e.name,
                        "id":       e.id if hasattr(e,"id") else e.name,
                        "type":     kind,
                        "size":     getattr(e,"size",0),
                        "modified": str(getattr(e,"server_modified","")),
                        "path":     getattr(e,"path_display", path + "/" + e.name),
                    })
            if not result.has_more:
                break
            result = dbx.files_list_folder_continue(result.cursor) if token else \
                     dbx.files_list_folder_continue(result.cursor)
        return jsonify(entries)
    except Exception as ex:
        err = str(ex)
        if "not_connected" in err or "auth" in err.lower():
            return jsonify({"error": "not_connected",
                            "auth_url": f"{PUBLIC_URL}/api/cloud/dropbox/auth"}), 401
        return jsonify({"error": err}), 500

@app.route("/api/cloud/dropbox/temp-link")
def dropbox_temp_link():
    """Get a temporary direct-download link for a Dropbox file path."""
    token = os.getenv("DROPBOX_TOKEN","")
    if not token:
        return jsonify({"error": "not_connected"}), 401
    path = request.args.get("path","")
    try:
        import dropbox as dbx_module
        dbx    = dbx_module.Dropbox(token)
        result = dbx.files_get_temporary_link(path)
        return jsonify({"url": result.link})
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  CLOUD INTEGRATION — Google Drive
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/cloud/gdrive/auth")
def gdrive_auth():
    """Redirect to Google OAuth consent screen."""
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_secrets_file(
        GDRIVE_CREDS,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
        redirect_uri=f"{PUBLIC_URL}/api/cloud/gdrive/callback"
    )
    auth_url, _ = flow.authorization_url(prompt="consent")
    return redirect(auth_url)

@app.route("/api/cloud/gdrive/callback")
def gdrive_callback():
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_secrets_file(
        GDRIVE_CREDS,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
        redirect_uri=f"{PUBLIC_URL}/api/cloud/gdrive/callback"
    )
    flow.fetch_token(authorization_response=request.url)
    creds = flow.credentials
    # Persist token (write to file or env in production)
    with open(os.path.join(BASE_DIR, "gdrive_token.json"), "w") as f:
        f.write(creds.to_json())
    return jsonify({"ok": True, "message": "Google Drive connected!"})

@app.route("/api/cloud/gdrive/browse")
def gdrive_browse():
    """List files in Google Drive (optional folderId param)."""
    token_path = os.path.join(BASE_DIR, "gdrive_token.json")
    if not os.path.exists(token_path):
        return jsonify({"error": "not_connected", "auth_url": f"{PUBLIC_URL}/api/cloud/gdrive/auth"}), 401
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery  import build
        creds    = Credentials.from_authorized_user_file(token_path)
        service  = build("drive", "v3", credentials=creds)
        folder   = request.args.get("folderId","root")
        q        = f"'{folder}' in parents and trashed=false"
        result   = service.files().list(
            q=q, fields="files(id,name,mimeType,size,modifiedTime)",
            pageSize=100
        ).execute()
        files    = result.get("files", [])
        return jsonify([{
            "id": f["id"], "name": f["name"],
            "type": "folder" if "folder" in f["mimeType"] else "file",
            "size": f.get("size", 0),
            "modified": f.get("modifiedTime",""),
        } for f in files])
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  STATS DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/stats")
def get_stats():
    total_contacts  = query("SELECT COUNT(*) n FROM contacts", one=True)["n"]
    ic_contacts     = query("SELECT COUNT(*) n FROM contacts WHERE tier=1", one=True)["n"]
    total_tracks    = query("SELECT COUNT(*) n FROM tracks", one=True)["n"]
    active_projects = query("SELECT COUNT(*) n FROM projects WHERE col IN ('current','upcoming')", one=True)["n"]
    pending_fu      = query("SELECT COUNT(*) n FROM followups WHERE status='pending'", one=True)["n"] if _table_exists("followups") else 0
    emails_sent     = query("SELECT COUNT(*) n FROM email_sends", one=True)["n"] if _table_exists("email_sends") else 0
    emails_opened   = query("SELECT COUNT(*) n FROM email_sends WHERE opened_count>0", one=True)["n"] if _table_exists("email_sends") else 0
    return jsonify({
        "total_contacts": total_contacts,
        "ic_contacts":    ic_contacts,
        "total_tracks":   total_tracks,
        "active_projects":active_projects,
        "pending_followups": pending_fu,
        "emails_sent":    emails_sent,
        "emails_opened":  emails_opened,
        "open_rate": round(emails_opened/emails_sent*100,1) if emails_sent else 0,
    })

# ══════════════════════════════════════════════════════════════════════════════
app.config["DB_PATH"] = DB_PATH
init_auth(app)
from extensions import register_extensions
register_extensions(app)

if __name__ == "__main__":
    init_db()
    print("🎛  S3 Studio OS backend running on http://localhost:5050")
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", 5050)),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
