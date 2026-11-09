"""
upload_email.py — Image Upload + Email API endpoints for S3 Hub
Add these routes to your existing app.py in ~/music-hub/backend/

Dependencies (install once):
  pip3 install flask-mail pillow --break-system-packages

Then in your app.py, add:
  from upload_email import register_upload_email_routes
  register_upload_email_routes(app)
"""

import os
import uuid
import json
from pathlib import Path
from flask import request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from db import execute, query

# ── Config ───────────────────────────────────────────────────────────────────
UPLOAD_FOLDER   = Path(__file__).parent / "uploads"
ALLOWED_IMAGE   = {"png", "jpg", "jpeg", "gif", "webp", "svg"}
MAX_FILE_MB     = 25

UPLOAD_FOLDER.mkdir(exist_ok=True)


def _allowed(filename: str, allowed: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


# ── Register all routes ───────────────────────────────────────────────────────
def register_upload_email_routes(app):

    # ── IMAGE UPLOAD ─────────────────────────────────────────────────────────
    @app.route("/api/upload/image", methods=["POST"])
    def upload_image():
        """
        POST /api/upload/image
        Form fields:
          file        — the image file
          entity_type — "track" | "contact" | "project" | "site"
          entity_id   — integer ID (optional)
        Returns: { url, filename, id }
        """
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        f = request.files["file"]
        if not f.filename:
            return jsonify({"error": "Empty filename"}), 400
        if not _allowed(f.filename, ALLOWED_IMAGE):
            return jsonify({"error": "File type not allowed"}), 400

        # Check size (read once, then seek back)
        f.seek(0, 2)
        size = f.tell()
        f.seek(0)
        if size > MAX_FILE_MB * 1024 * 1024:
            return jsonify({"error": f"Max {MAX_FILE_MB}MB"}), 413

        ext      = f.filename.rsplit(".", 1)[1].lower()
        new_name = f"{uuid.uuid4().hex}.{ext}"
        save_path = UPLOAD_FOLDER / new_name
        f.save(str(save_path))

        entity_type = request.form.get("entity_type", "site")
        entity_id   = request.form.get("entity_id")
        url_path    = f"/uploads/{new_name}"

        # Record in DB
        media_id = execute("""
            INSERT INTO media (filename, original_name, mime_type, size_bytes, url_path, entity_type, entity_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (new_name, secure_filename(f.filename), f.content_type, size, url_path, entity_type, entity_id))

        # If it's a track cover, update the track
        if entity_type == "track" and entity_id:
            execute("UPDATE tracks SET cover_art=?, updated_at=datetime('now') WHERE id=?",
                    (url_path, int(entity_id)))

        return jsonify({"url": url_path, "filename": new_name, "id": media_id}), 201

    @app.route("/uploads/<filename>")
    def serve_upload(filename):
        return send_from_directory(str(UPLOAD_FOLDER), filename)

    # ── BATCH TRACK TAGGING ──────────────────────────────────────────────────
    @app.route("/api/tracks/batch-tag", methods=["POST"])
    def batch_tag():
        """
        POST /api/tracks/batch-tag
        Body: {
          "track_ids": [1, 2, 3],
          "updates": {
            "genre": "Hip Hop",
            "bpm": 140,
            "inner_circle": 1,
            "tags": ["trap", "dark"]
          }
        }
        """
        data = request.get_json()
        if not data or not data.get("track_ids"):
            return jsonify({"error": "track_ids required"}), 400

        ids     = data["track_ids"]
        updates = data.get("updates", {})

        if not updates:
            return jsonify({"error": "No updates provided"}), 400

        ALLOWED_FIELDS = {"genre", "bpm", "inner_circle", "tags", "notes", "featured", "key_sig"}
        fields  = {k: v for k, v in updates.items() if k in ALLOWED_FIELDS}

        if not fields:
            return jsonify({"error": "No valid fields"}), 400

        # Build SET clause
        set_parts = []
        values    = []
        for k, v in fields.items():
            set_parts.append(f"{k}=?")
            values.append(json.dumps(v) if isinstance(v, list) else v)

        set_parts.append("updated_at=datetime('now')")
        placeholders = ",".join("?" * len(ids))
        sql = f"UPDATE tracks SET {', '.join(set_parts)} WHERE id IN ({placeholders})"
        execute(sql, values + ids)

        return jsonify({"updated": len(ids), "fields": list(fields.keys())}), 200

    # ── EMAIL SENDING ────────────────────────────────────────────────────────
    @app.route("/api/email/send", methods=["POST"])
    def send_email():
        """
        POST /api/email/send
        Body: {
          "to": ["email@example.com"] or contact_ids list,
          "subject": "...",
          "body": "...",
          "contact_ids": [1, 2, 3],   // optional — send to contacts by ID
          "save_to_inbox": true
        }

        Configure SMTP in env vars:
          SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
        """
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        subject = data.get("subject", "(no subject)")
        body    = data.get("body", "")
        to_list = list(data.get("to", []))

        # Resolve contact IDs to emails
        contact_ids = data.get("contact_ids", [])
        if contact_ids:
            placeholders = ",".join("?" * len(contact_ids))
            rows = query(f"SELECT id, email FROM contacts WHERE id IN ({placeholders}) AND email != ''", contact_ids)
            for r in rows:
                if r["email"] and r["email"] not in to_list:
                    to_list.append(r["email"])

        if not to_list:
            return jsonify({"error": "No recipients"}), 400

        # SMTP config from environment
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")
        from_addr = os.getenv("FROM_EMAIL", smtp_user)

        if not smtp_user:
            # Dev mode — log instead of sending
            print(f"[EMAIL DEV] To: {to_list}\nSubject: {subject}\n{body}")
            sent = len(to_list)
        else:
            sent = 0
            try:
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    for recipient in to_list:
                        msg = MIMEMultipart("alternative")
                        msg["Subject"] = subject
                        msg["From"]    = from_addr
                        msg["To"]      = recipient
                        msg.attach(MIMEText(body, "plain"))
                        server.sendmail(from_addr, [recipient], msg.as_string())
                        sent += 1
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        # Save to messages inbox
        if data.get("save_to_inbox", True):
            for cid in contact_ids:
                execute("""
                    INSERT INTO messages (contact_id, direction, subject, body, channel, status)
                    VALUES (?, 'outbound', ?, ?, 'email', 'read')
                """, (cid, subject, body))

        return jsonify({"sent": sent, "recipients": to_list}), 200

    # ── SITE CONFIG API ──────────────────────────────────────────────────────
    @app.route("/api/config", methods=["GET"])
    def get_config():
        """GET /api/config — return all site config"""
        rows = query("SELECT key, value FROM site_config")
        return jsonify({r["key"]: json.loads(r["value"]) for r in rows})

    @app.route("/api/config", methods=["POST"])
    def set_config():
        """POST /api/config — upsert config values { key: value, ... }"""
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        for k, v in data.items():
            execute("""
                INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """, (k, json.dumps(v)))
        return jsonify({"updated": list(data.keys())}), 200

    print("[S3 Hub] Upload + Email + Config routes registered")
