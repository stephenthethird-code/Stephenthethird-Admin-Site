"""
extensions.py — S3 Studio OS Backend Extensions
Import this module in app.py with: from extensions import register_extensions

Adds:
  I.   Audio Analysis  — /api/analyze  (BPM, key, genre, instrument, type)
  II.  Batch Upload    — /api/upload/batch  (multi-file + project folder org)
  III. Dispatch        — /api/dispatch/*   (messages, contact matching)
  IV.  Twilio Webhook  — /api/webhook/twilio
  V.   Meta IG Webhook — /api/webhook/ig
  VI.  Cloud Stream    — /api/cloud/dropbox/stream, /api/cloud/gdrive/stream
  VII. Gmail Timeline  — /api/gmail/auth, /api/gmail/contacts/<id>/emails
"""

import os, json, uuid, sqlite3, hashlib, hmac
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, g, Response, redirect

ext = Blueprint("ext", __name__)

# ── Env / config ──────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DB_PATH      = os.path.join(BASE_DIR, "studioos.db")
UPLOAD_DIR   = os.path.join(BASE_DIR, "uploads")
AUDIO_DIR    = os.path.join(UPLOAD_DIR, "audio")
PROJECT_DIR  = os.path.join(UPLOAD_DIR, "projects")   # organized uploads
PUBLIC_URL   = os.getenv("PUBLIC_URL", "http://localhost:5050")

TWILIO_TOKEN        = os.getenv("TWILIO_AUTH_TOKEN", "")
META_VERIFY_TOKEN   = os.getenv("META_VERIFY_TOKEN", "s3dispatch")
META_APP_SECRET     = os.getenv("META_APP_SECRET", "")
DROPBOX_TOKEN       = lambda: os.getenv("DROPBOX_TOKEN", "")
GDRIVE_TOKEN_PATH   = os.path.join(BASE_DIR, "gdrive_token.json")
GMAIL_TOKEN_PATH    = os.path.join(BASE_DIR, "gmail_token.json")
GDRIVE_CREDS        = os.getenv("GDRIVE_CREDENTIALS_JSON", "")

os.makedirs(PROJECT_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR,   exist_ok=True)

# ── DB helpers (same pattern as app.py) ──────────────────────────────────────
def _db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

def _qone(sql, args=()):
    with _db() as c:
        r = c.execute(sql, args).fetchone()
        return dict(r) if r else None

def _qall(sql, args=()):
    with _db() as c:
        return [dict(r) for r in c.execute(sql, args).fetchall()]

def _run(sql, args=()):
    with _db() as c:
        cur = c.execute(sql, args)
        c.commit()
        return cur.lastrowid


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMA — ensure new tables exist
# ══════════════════════════════════════════════════════════════════════════════
def ensure_schema():
    with _db() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS dispatch_messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source      TEXT NOT NULL DEFAULT 'manual',  -- sms|ig|manual|email
                sender_name TEXT,
                sender_ref  TEXT,   -- phone number or IG handle
                contact_id  INTEGER REFERENCES contacts(id),
                project_id  INTEGER REFERENCES projects(id),
                body        TEXT NOT NULL DEFAULT '',
                media_url   TEXT,
                status      TEXT NOT NULL DEFAULT 'unread',  -- unread|read|linked|handled
                raw_payload TEXT,   -- original webhook JSON for debugging
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_dispatch_contact ON dispatch_messages(contact_id);
            CREATE INDEX IF NOT EXISTS idx_dispatch_project ON dispatch_messages(project_id);
            CREATE INDEX IF NOT EXISTS idx_dispatch_status  ON dispatch_messages(status);

            CREATE TABLE IF NOT EXISTS audio_analysis (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id    INTEGER REFERENCES tracks(id) ON DELETE CASCADE,
                bpm         REAL,
                key_name    TEXT,
                key_conf    REAL,
                genre       TEXT,
                file_type   TEXT,  -- beat|song|sample|loop
                instruments TEXT,  -- JSON array
                duration    REAL,
                analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS gmail_interactions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id  INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
                gmail_id    TEXT UNIQUE,
                subject     TEXT,
                snippet     TEXT,
                direction   TEXT,  -- sent|received
                date_ts     TEXT,
                has_attach  INTEGER DEFAULT 0,
                thread_id   TEXT,
                synced_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_gmail_contact ON gmail_interactions(contact_id);
        """)


# ══════════════════════════════════════════════════════════════════════════════
#  I. AUDIO ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def _detect_key(y, sr):
    """Krumhansl-Schmuckler key-finding algorithm."""
    try:
        import librosa, numpy as np
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = chroma.mean(axis=1)

        # Major and minor profiles (Krumhansl & Schmuckler 1990)
        major = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
        minor = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
        notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

        best_key, best_mode, best_corr = 'C', 'major', -2.0
        for i in range(12):
            shifted = np.roll(chroma_mean, -i)
            # Normalize
            def corr(a, b):
                a = a - a.mean(); b = b - b.mean()
                denom = np.std(a) * np.std(b) * len(a)
                return np.dot(a, b) / denom if denom else 0
            for mode, profile in [('major', major), ('minor', minor)]:
                c = corr(shifted, profile)
                if c > best_corr:
                    best_corr = c
                    best_key  = notes[i]
                    best_mode = mode

        suffix = '' if best_mode == 'major' else 'm'
        return f"{best_key}{suffix}", round(float(best_corr), 3)
    except Exception:
        return None, 0.0


def _classify_type(duration, bpm, onset_density):
    """Classify file as beat | song | sample | loop."""
    if duration < 8:
        return "sample"
    if duration < 30:
        return "loop" if onset_density > 4 else "sample"
    if duration > 120:
        return "song"
    # 30–120s range: if BPM is regular and no long silence → beat
    return "beat"


def _estimate_genre(bpm, spectral_centroid, energy):
    """Heuristic genre estimation from audio features."""
    if bpm is None:
        return "Unknown"
    bpm = float(bpm)
    sc  = float(spectral_centroid or 2000)
    e   = float(energy or 0.5)

    if bpm > 140 and sc > 3000 and e > 0.7:  return "Drill"
    if bpm > 130 and sc > 2500:               return "Trap"
    if 120 < bpm <= 130 and sc < 2000:        return "Hip-Hop"
    if 80 <= bpm <= 100 and sc < 1800:        return "R&B"
    if bpm > 150 and e > 0.8:                 return "Club"
    if bpm < 80  and sc < 1500:               return "Lo-Fi"
    if 100 <= bpm <= 120 and sc > 2000:       return "Pop"
    if 90 <= bpm <= 115:                      return "Afro"
    return "Hip-Hop"


def _detect_instruments(y, sr, bpm):
    """Heuristic instrument detection from spectral features."""
    try:
        import librosa, numpy as np
        instruments = []

        # Sub-bass / 808 detection (< 100 Hz energy)
        stft     = np.abs(librosa.stft(y))
        freqs    = librosa.fft_frequencies(sr=sr)
        sub_mask = freqs < 100
        sub_e    = stft[sub_mask].mean()
        total_e  = stft.mean()
        if total_e > 0 and sub_e / total_e > 0.12:
            instruments.append("808")

        # Hi-hat / percussion (3–8 kHz transients)
        hi_mask  = (freqs > 3000) & (freqs < 8000)
        hi_e     = stft[hi_mask].mean()
        if total_e > 0 and hi_e / total_e > 0.08:
            instruments.append("Hi-Hats")

        # Piano / keys (mid 300–2kHz, harmonic)
        mid_mask = (freqs > 300) & (freqs < 2000)
        mid_e    = stft[mid_mask].mean()
        zcr      = librosa.feature.zero_crossing_rate(y).mean()
        if total_e > 0 and mid_e / total_e > 0.25 and zcr < 0.05:
            instruments.append("Piano / Keys")

        # Strings (200–1200 Hz, sustained)
        str_mask = (freqs > 200) & (freqs < 1200)
        str_e    = stft[str_mask].mean()
        if total_e > 0 and str_e / total_e > 0.3 and zcr < 0.03:
            instruments.append("Strings")

        # Guitar (500–5kHz, percussive or sustained)
        gtr_mask = (freqs > 500) & (freqs < 5000)
        gtr_e    = stft[gtr_mask].mean()
        if total_e > 0 and gtr_e / total_e > 0.35 and 0.03 < zcr < 0.1:
            instruments.append("Guitar")

        # Vocals (800–3kHz, high ZCR)
        if zcr > 0.08:
            instruments.append("Vocals")

        return instruments if instruments else ["Drums"]
    except Exception:
        return []


@ext.route("/api/analyze", methods=["POST"])
def analyze_audio():
    """
    Analyze an audio file for BPM, key, genre, type, instruments.
    Body: multipart file OR JSON { "file_path": "/absolute/path.mp3" }
    Returns: { bpm, key, genre, file_type, instruments, duration }
    """
    file_path = None
    tmp_path  = None

    if "file" in request.files:
        f = request.files["file"]
        ext_str  = os.path.splitext(f.filename)[1].lower() or ".mp3"
        tmp_path = os.path.join(AUDIO_DIR, f"_tmp_{uuid.uuid4().hex}{ext_str}")
        f.save(tmp_path)
        file_path = tmp_path
    elif request.is_json:
        file_path = request.json.get("file_path")

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "No file provided or path not found"}), 400

    try:
        import librosa, numpy as np

        y, sr      = librosa.load(file_path, sr=22050, mono=True, duration=120)
        duration   = librosa.get_duration(y=y, sr=sr)

        # BPM
        tempo, _   = librosa.beat.beat_track(y=y, sr=sr)
        bpm        = round(float(tempo), 1)

        # Key
        key_name, key_conf = _detect_key(y, sr)

        # Spectral features for genre/instrument
        sc    = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
        rms   = float(librosa.feature.rms(y=y).mean())

        # Onset density
        onset_frames  = librosa.onset.onset_detect(y=y, sr=sr)
        onset_density = len(onset_frames) / (duration / 60) if duration else 0

        file_type   = _classify_type(duration, bpm, onset_density)
        genre       = _estimate_genre(bpm, sc, rms)
        instruments = _detect_instruments(y, sr, bpm)

        result = {
            "bpm":         bpm,
            "key":         key_name,
            "key_confidence": key_conf,
            "genre":       genre,
            "file_type":   file_type,
            "instruments": instruments,
            "duration":    round(duration, 1),
            "spectral_centroid": round(sc, 1),
        }

        # If a track_id was provided, persist analysis
        track_id = request.form.get("track_id") or (request.json or {}).get("track_id")
        if track_id:
            _run(
                """INSERT OR REPLACE INTO audio_analysis
                   (track_id,bpm,key_name,key_conf,genre,file_type,instruments,duration)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (int(track_id), bpm, key_name, key_conf, genre, file_type,
                 json.dumps(instruments), duration)
            )
            _run(
                "UPDATE tracks SET bpm=?,key=?,genre=? WHERE id=?",
                (bpm, key_name, genre, int(track_id))
            )

        return jsonify(result)

    except ImportError:
        # librosa not installed — fall back to mutagen only
        try:
            from mutagen import File
            audio = File(file_path, easy=True)
            meta  = {}
            if audio:
                meta["bpm"]   = float((audio.get("bpm") or [0])[0] or 0) or None
                meta["key"]   = (audio.get("initialkey") or audio.get("key") or [None])[0]
                meta["genre"] = (audio.get("genre") or [None])[0]
            return jsonify({**meta, "note": "librosa not installed — ID3 tags only"})
        except Exception as me:
            return jsonify({"error": f"Analysis failed: {me}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ══════════════════════════════════════════════════════════════════════════════
#  II. BATCH UPLOAD — multi-file with project folder organization
# ══════════════════════════════════════════════════════════════════════════════

@ext.route("/api/upload/batch", methods=["POST"])
def batch_upload():
    """
    Accepts: multipart files[] + form fields: project_title, auto_analyze
    Saves files to PROJECT_DIR/<project_title>/ and optionally runs analysis.
    Returns list of created track records.
    """
    if "files" not in request.files:
        return jsonify({"error": "no files field"}), 400

    project_title  = request.form.get("project_title", "Unsorted").strip() or "Unsorted"
    auto_analyze   = request.form.get("auto_analyze", "true").lower() != "false"
    project_folder = os.path.join(PROJECT_DIR, _safe_name(project_title))
    os.makedirs(project_folder, exist_ok=True)

    AUDIO_EXTS = {".mp3",".wav",".aiff",".aif",".flac",".m4a",".ogg",".opus"}
    results    = []

    for f in request.files.getlist("files"):
        ext_str = os.path.splitext(f.filename)[1].lower()
        if ext_str not in AUDIO_EXTS:
            results.append({"filename": f.filename, "status": "skipped", "reason": "not audio"})
            continue

        safe_name = f"{uuid.uuid4().hex}_{_safe_name(f.filename)}"
        dest_path = os.path.join(project_folder, safe_name)
        f.save(dest_path)

        # Basic meta from filename + ID3
        title = os.path.splitext(f.filename)[0]
        bpm, key, genre = None, None, None
        try:
            from mutagen import File as MFile
            audio = MFile(dest_path, easy=True)
            if audio:
                bpm   = int((audio.get("bpm") or [0])[0] or 0) or None
                key   = (audio.get("initialkey") or audio.get("key") or [None])[0]
                genre = (audio.get("genre") or [None])[0]
        except Exception:
            pass

        track_id = _run(
            """INSERT INTO tracks (filename,title,bpm,key,genre,source,file_path,tags)
               VALUES (?,?,?,?,?,'local',?,?)""",
            (f.filename, title, bpm, key, genre, dest_path,
             json.dumps([project_title]))
        )

        entry = {
            "id": track_id, "filename": f.filename, "title": title,
            "path": dest_path, "bpm": bpm, "key": key, "genre": genre,
            "status": "saved"
        }

        # Auto-analyze in background if requested
        if auto_analyze and track_id:
            try:
                import threading
                def _bg_analyze(path, tid):
                    import urllib.request
                    try:
                        req = urllib.request.Request(
                            f"{PUBLIC_URL}/api/analyze",
                            data=json.dumps({"file_path": path, "track_id": tid}).encode(),
                            headers={"Content-Type": "application/json"},
                            method="POST"
                        )
                        urllib.request.urlopen(req, timeout=60)
                    except Exception:
                        pass
                threading.Thread(target=_bg_analyze, args=(dest_path, track_id), daemon=True).start()
                entry["analysis"] = "queued"
            except Exception:
                entry["analysis"] = "skipped"

        results.append(entry)

    return jsonify({"project": project_title, "folder": project_folder, "files": results}), 201


def _safe_name(s):
    """Convert string to filesystem-safe name."""
    import re
    return re.sub(r"[^\w\-. ]", "_", s).strip()[:80]


# ══════════════════════════════════════════════════════════════════════════════
#  III. DISPATCH — message ingestion, contact matching, project linking
# ══════════════════════════════════════════════════════════════════════════════

def _match_contact(sender_ref):
    """Try to match sender phone/handle to a contact. Returns contact dict or None."""
    if not sender_ref:
        return None
    ref = sender_ref.lstrip("+").lower().strip()
    # Try phone match (normalize by stripping +1 country code)
    for suffix in [ref, ref[-10:] if len(ref) > 10 else ref]:
        c = _qone("SELECT * FROM contacts WHERE REPLACE(REPLACE(phone,' ',''),'-','') LIKE ?",
                  (f"%{suffix}",))
        if c:
            return c
    # Try Instagram handle match (strip @)
    handle = ref.lstrip("@")
    c = _qone("SELECT * FROM contacts WHERE LOWER(REPLACE(instagram,'@',''))=?", (handle,))
    return c


@ext.route("/api/dispatch", methods=["GET"])
def get_dispatch():
    status  = request.args.get("status")
    source  = request.args.get("source")
    project = request.args.get("project_id")
    sql     = """
        SELECT d.*, c.name contact_name, c.instagram, c.tier,
               p.title project_title
        FROM dispatch_messages d
        LEFT JOIN contacts c ON c.id = d.contact_id
        LEFT JOIN projects p ON p.id = d.project_id
        WHERE 1=1
    """
    args = []
    if status:  sql += " AND d.status=?";     args.append(status)
    if source:  sql += " AND d.source=?";     args.append(source)
    if project: sql += " AND d.project_id=?"; args.append(int(project))
    sql += " ORDER BY d.received_at DESC LIMIT 200"
    return jsonify(_qall(sql, args))


@ext.route("/api/dispatch", methods=["POST"])
def create_dispatch():
    """Manually log a message (paste from IG DM, email, etc.)."""
    d = request.json or {}
    sender_ref  = d.get("sender_ref", "")
    contact     = _match_contact(sender_ref)
    contact_id  = contact["id"] if contact else d.get("contact_id")

    mid = _run(
        """INSERT INTO dispatch_messages
           (source,sender_name,sender_ref,contact_id,project_id,body,media_url,status)
           VALUES (?,?,?,?,?,?,?,?)""",
        (d.get("source","manual"), d.get("sender_name",""),
         sender_ref, contact_id, d.get("project_id"),
         d.get("body",""), d.get("media_url",""), "unread")
    )
    return jsonify({"id": mid, "contact_matched": bool(contact),
                   "contact": contact}), 201


@ext.route("/api/dispatch/<int:mid>", methods=["PATCH"])
def update_dispatch(mid):
    d    = request.json or {}
    cols = [k for k in d if k in ("status","project_id","contact_id","sender_name","body")]
    if not cols:
        return jsonify({"error": "nothing to update"}), 400
    sql = "UPDATE dispatch_messages SET " + ",".join(f"{c}=?" for c in cols) + " WHERE id=?"
    _run(sql, [d[c] for c in cols] + [mid])
    return jsonify({"ok": True})


@ext.route("/api/dispatch/<int:mid>", methods=["DELETE"])
def delete_dispatch(mid):
    _run("DELETE FROM dispatch_messages WHERE id=?", (mid,))
    return jsonify({"ok": True})


@ext.route("/api/dispatch/stats")
def dispatch_stats():
    total   = _qone("SELECT COUNT(*) n FROM dispatch_messages")["n"]
    unread  = _qone("SELECT COUNT(*) n FROM dispatch_messages WHERE status='unread'")["n"]
    linked  = _qone("SELECT COUNT(*) n FROM dispatch_messages WHERE project_id IS NOT NULL")["n"]
    by_src  = _qall("SELECT source, COUNT(*) n FROM dispatch_messages GROUP BY source")
    return jsonify({"total": total, "unread": unread, "linked": linked, "by_source": by_src})


# ══════════════════════════════════════════════════════════════════════════════
#  IV. TWILIO WEBHOOK — inbound SMS
# ══════════════════════════════════════════════════════════════════════════════

@ext.route("/api/webhook/twilio", methods=["POST"])
def twilio_webhook():
    """
    Twilio sends POST with form fields: From, Body, MediaUrl0, etc.
    Configure in Twilio console: Messaging → Webhook URL → this endpoint.
    """
    # Validate Twilio signature (optional but recommended)
    # from twilio.request_validator import RequestValidator
    # validator = RequestValidator(TWILIO_TOKEN)
    # if not validator.validate(request.url, request.form, request.headers.get('X-Twilio-Signature','')):
    #     return jsonify({"error": "Invalid signature"}), 403

    from_number = request.form.get("From", "")
    body        = request.form.get("Body", "")
    media_url   = request.form.get("MediaUrl0", "")
    to_number   = request.form.get("To", "")

    contact    = _match_contact(from_number)
    contact_id = contact["id"] if contact else None

    _run(
        """INSERT INTO dispatch_messages
           (source,sender_name,sender_ref,contact_id,body,media_url,status,raw_payload)
           VALUES ('sms',?,?,?,?,?,?,?)""",
        (contact["name"] if contact else from_number,
         from_number, contact_id, body, media_url, "unread",
         json.dumps(dict(request.form)))
    )

    # Respond with empty TwiML so Twilio doesn't retry
    return Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                    mimetype="text/xml")


# ══════════════════════════════════════════════════════════════════════════════
#  V. META IG WEBHOOK — Instagram DMs
# ══════════════════════════════════════════════════════════════════════════════

@ext.route("/api/webhook/ig", methods=["GET"])
def ig_verify():
    """Meta webhook verification handshake (GET)."""
    mode      = request.args.get("hub.mode")
    token     = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")
    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        return Response(challenge, mimetype="text/plain")
    return jsonify({"error": "Forbidden"}), 403


@ext.route("/api/webhook/ig", methods=["POST"])
def ig_webhook():
    """
    Meta sends DM events here once your app is approved.
    Set META_VERIFY_TOKEN env var to your chosen verify token.
    Configure in Meta Developer Console → Webhooks → messages.
    """
    # Verify X-Hub-Signature-256
    if META_APP_SECRET:
        sig     = request.headers.get("X-Hub-Signature-256", "")
        payload = request.get_data()
        digest  = "sha256=" + hmac.new(
            META_APP_SECRET.encode(), payload, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, digest):
            return jsonify({"error": "Invalid signature"}), 403

    data = request.json or {}
    for entry in data.get("entry", []):
        for msg_event in entry.get("messaging", []):
            sender = msg_event.get("sender", {})
            ig_id  = sender.get("id", "")
            msg    = msg_event.get("message", {})
            body   = msg.get("text", "")
            if not body:
                continue

            contact    = _match_contact(ig_id)
            contact_id = contact["id"] if contact else None

            _run(
                """INSERT INTO dispatch_messages
                   (source,sender_name,sender_ref,contact_id,body,status,raw_payload)
                   VALUES ('ig',?,?,?,?,'unread',?)""",
                (contact["name"] if contact else ig_id,
                 ig_id, contact_id, body,
                 json.dumps(msg_event))
            )

    return jsonify({"ok": True})


# ══════════════════════════════════════════════════════════════════════════════
#  VI. CLOUD STREAMING URLS
# ══════════════════════════════════════════════════════════════════════════════

@ext.route("/api/cloud/dropbox/stream")
def dropbox_stream():
    """Return a temporary streamable URL for a Dropbox file."""
    token = DROPBOX_TOKEN()
    if not token:
        return jsonify({"error": "not_connected"}), 401
    path = request.args.get("path","")
    if not path:
        return jsonify({"error": "path required"}), 400
    try:
        import dropbox as dbx_module
        dbx     = dbx_module.Dropbox(token)
        # Create a temporary link (4 hours)
        result  = dbx.files_get_temporary_link(path)
        return jsonify({"url": result.link, "path": path})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ext.route("/api/cloud/gdrive/stream")
def gdrive_stream():
    """Return a direct download/stream URL for a Google Drive file."""
    if not os.path.exists(GDRIVE_TOKEN_PATH):
        return jsonify({"error": "not_connected",
                       "auth_url": f"{PUBLIC_URL}/api/cloud/gdrive/auth"}), 401
    file_id = request.args.get("fileId","")
    if not file_id:
        return jsonify({"error": "fileId required"}), 400
    try:
        from google.oauth2.credentials   import Credentials
        from googleapiclient.discovery   import build
        creds   = Credentials.from_authorized_user_file(GDRIVE_TOKEN_PATH)
        service = build("drive", "v3", credentials=creds)
        meta    = service.files().get(fileId=file_id, fields="id,name,mimeType").execute()
        # Direct streaming URL (requires auth header in browser — use proxy approach)
        stream_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        return jsonify({"url": stream_url, "file_id": file_id,
                       "name": meta.get("name"), "mime": meta.get("mimeType")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ext.route("/api/audio/stream/<path:filename>")
def stream_local_audio(filename):
    """Stream a local audio file with Range request support."""
    from flask import send_from_directory
    return send_from_directory(AUDIO_DIR, filename, conditional=True)


@ext.route("/api/audio/stream/project/<path:rel_path>")
def stream_project_audio(rel_path):
    """Stream audio from project folder."""
    from flask import send_from_directory
    return send_from_directory(PROJECT_DIR, rel_path, conditional=True)


# ══════════════════════════════════════════════════════════════════════════════
#  VII. GMAIL INTERACTION TIMELINE
# ══════════════════════════════════════════════════════════════════════════════

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

@ext.route("/api/gmail/auth")
def gmail_auth():
    """Redirect to Google OAuth — covers Gmail + Drive in one consent."""
    if not GDRIVE_CREDS or not os.path.exists(GDRIVE_CREDS):
        return jsonify({
            "error": "GDRIVE_CREDENTIALS_JSON env var not set or file not found",
            "setup": "Create a Google Cloud project, enable Gmail API + Drive API, "
                     "download credentials.json, set GDRIVE_CREDENTIALS_JSON=/path/to/credentials.json"
        }), 503
    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(
            GDRIVE_CREDS, scopes=GMAIL_SCOPES,
            redirect_uri=f"{PUBLIC_URL}/api/gmail/callback"
        )
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        return redirect(auth_url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ext.route("/api/gmail/callback")
def gmail_callback():
    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(
            GDRIVE_CREDS, scopes=GMAIL_SCOPES,
            redirect_uri=f"{PUBLIC_URL}/api/gmail/callback"
        )
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        with open(GMAIL_TOKEN_PATH, "w") as f:
            f.write(creds.to_json())
        return "<script>window.close();</script><p>Gmail connected! You can close this tab.</p>"
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ext.route("/api/gmail/status")
def gmail_status():
    connected = os.path.exists(GMAIL_TOKEN_PATH)
    return jsonify({"connected": connected,
                   "auth_url": f"{PUBLIC_URL}/api/gmail/auth" if not connected else None})


@ext.route("/api/gmail/sync/<int:contact_id>", methods=["POST"])
def gmail_sync_contact(contact_id):
    """
    Fetch last 50 emails to/from a contact's email address and cache in DB.
    Call this when opening a contact detail panel.
    """
    if not os.path.exists(GMAIL_TOKEN_PATH):
        return jsonify({"error": "not_connected",
                       "auth_url": f"{PUBLIC_URL}/api/gmail/auth"}), 401

    contact = _qone("SELECT * FROM contacts WHERE id=?", (contact_id,))
    if not contact or not contact.get("email"):
        return jsonify({"error": "contact not found or no email"}), 404

    email = contact["email"]
    try:
        from google.oauth2.credentials  import Credentials
        from googleapiclient.discovery  import build

        creds   = Credentials.from_authorized_user_file(GMAIL_TOKEN_PATH)
        service = build("gmail", "v1", credentials=creds)

        # Search for emails involving this contact
        query   = f"from:{email} OR to:{email}"
        result  = service.users().messages().list(
            userId="me", q=query, maxResults=50
        ).execute()

        messages = result.get("messages", [])
        synced   = 0

        for msg_stub in messages:
            msg_id = msg_stub["id"]
            # Skip if already cached
            if _qone("SELECT id FROM gmail_interactions WHERE gmail_id=?", (msg_id,)):
                continue
            # Fetch message details
            msg = service.users().messages().get(
                userId="me", id=msg_id, format="metadata",
                metadataHeaders=["From","To","Subject","Date"]
            ).execute()

            headers  = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_hdr = headers.get("From","")
            to_hdr   = headers.get("To","")
            direction = "received" if email.lower() in from_hdr.lower() else "sent"
            has_attach = bool(msg.get("payload",{}).get("parts"))

            _run(
                """INSERT OR IGNORE INTO gmail_interactions
                   (contact_id,gmail_id,subject,snippet,direction,date_ts,has_attach,thread_id)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (contact_id, msg_id, headers.get("Subject",""),
                 msg.get("snippet","")[:200],
                 direction, headers.get("Date",""),
                 int(has_attach), msg.get("threadId",""))
            )
            synced += 1

        return jsonify({"ok": True, "synced": synced, "total": len(messages)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ext.route("/api/gmail/contacts/<int:contact_id>/emails")
def get_contact_emails(contact_id):
    """Return cached email interactions for a contact."""
    rows = _qall(
        """SELECT * FROM gmail_interactions
           WHERE contact_id=?
           ORDER BY date_ts DESC LIMIT 100""",
        (contact_id,)
    )
    return jsonify(rows)


# ══════════════════════════════════════════════════════════════════════════════
#  SPOTIFY — Playlist Import
#  Requires: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET in .env
#  Uses Client Credentials flow (no user login needed for public playlists)
# ══════════════════════════════════════════════════════════════════════════════
import re as _re, base64 as _b64
try:
    import urllib.request as _ureq, urllib.parse as _uparse
    _HAS_URLLIB = True
except ImportError:
    _HAS_URLLIB = False

def _spotify_client_token():
    """Obtain a Spotify Client Credentials access token."""
    cid  = os.getenv("SPOTIFY_CLIENT_ID", "")
    csec = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    if not cid or not csec:
        return None
    creds = _b64.b64encode(f"{cid}:{csec}".encode()).decode()
    data  = _uparse.urlencode({"grant_type": "client_credentials"}).encode()
    req   = _ureq.Request(
        "https://accounts.spotify.com/api/token",
        data=data,
        headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"}
    )
    with _ureq.urlopen(req, timeout=8) as r:
        return json.loads(r.read())["access_token"]

def _spotify_api(endpoint, token):
    req = _ureq.Request(
        f"https://api.spotify.com/v1/{endpoint}",
        headers={"Authorization": f"Bearer {token}"}
    )
    with _ureq.urlopen(req, timeout=8) as r:
        return json.loads(r.read())

def _extract_spotify_id(url, resource_type):
    """Extract Spotify resource ID from URL or plain ID."""
    m = _re.search(rf"open\.spotify\.com/{resource_type}/([A-Za-z0-9]+)", url)
    if m:
        return m.group(1)
    m = _re.search(r"[A-Za-z0-9]{22}", url)
    return m.group(0) if m else url.strip()

@ext.route("/api/spotify/playlist", methods=["POST"])
def spotify_import_playlist():
    """
    POST { "url": "https://open.spotify.com/playlist/..." }
    Returns list of tracks: {title, artist, album, year, spotifyUrl, coverUrl, durationMs}
    """
    body = request.get_json(force=True, silent=True) or {}
    url  = body.get("url", "").strip()
    if not url:
        return jsonify({"error": "url required"}), 400

    try:
        token = _spotify_client_token()
    except Exception as e:
        return jsonify({"error": f"Spotify auth failed: {e}", "needs_setup": True}), 503

    if not token:
        return jsonify({"error": "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set in .env", "needs_setup": True}), 503

    try:
        # Determine if URL is a playlist or single track
        if "/track/" in url:
            tid = _extract_spotify_id(url, "track")
            data = _spotify_api(f"tracks/{tid}", token)
            tracks = [data]
            playlist_name = data["name"]
        elif "/album/" in url:
            aid   = _extract_spotify_id(url, "album")
            album = _spotify_api(f"albums/{aid}", token)
            tracks = [t for t in album.get("tracks", {}).get("items", [])]
            # Attach album info to each
            for t in tracks:
                t["album"] = {"name": album["name"], "release_date": album.get("release_date", ""), "images": album.get("images", [])}
            playlist_name = album["name"]
        else:
            # Playlist
            pid  = _extract_spotify_id(url, "playlist")
            data = _spotify_api(f"playlists/{pid}?fields=name,tracks.items(track(id,name,artists,album,external_urls,duration_ms))", token)
            playlist_name = data.get("name", "Playlist")
            items  = data.get("tracks", {}).get("items", [])
            tracks = [i["track"] for i in items if i.get("track")]

        results = []
        for t in tracks:
            if not t:
                continue
            album  = t.get("album", {})
            images = album.get("images", [])
            cover  = images[0]["url"] if images else ""
            rd     = album.get("release_date", "")
            year   = int(rd[:4]) if rd and len(rd) >= 4 else None
            results.append({
                "spotifyId":   t.get("id", ""),
                "title":       t.get("name", ""),
                "artist":      ", ".join(a["name"] for a in t.get("artists", [])),
                "album":       album.get("name", ""),
                "year":        year,
                "spotifyUrl":  t.get("external_urls", {}).get("spotify", ""),
                "coverUrl":    cover,
                "durationMs":  t.get("duration_ms", 0),
            })

        return jsonify({"playlist": playlist_name, "tracks": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  REGISTER
# ══════════════════════════════════════════════════════════════════════════════
def register_extensions(app):
    ensure_schema()
    app.register_blueprint(ext)
    print("✓ Extensions registered: analysis, dispatch, webhooks, cloud streaming, gmail, spotify")
