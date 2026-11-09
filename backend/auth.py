"""
auth.py — real login for Studio OS.

* Users live in the `users` table; passwords are hashed (PBKDF2-SHA256), never stored in plain text.
* POST /api/auth/login  -> signed, expiring token  (send back as  Authorization: Bearer <token>)
* GET  /api/auth/me     -> current user
* Every /api/* route requires a valid token EXCEPT the PUBLIC_PREFIXES below
  (login, email-open tracking pixel, Twilio/Instagram webhooks, OAuth callbacks).
* A token may also be passed as ?access_token=... for things the browser opens directly
  (OAuth start links, <audio> streaming).

Create users with:  python create_user.py you@example.com
"""
import os, secrets, sqlite3, time
from functools import wraps

from flask import Blueprint, request, jsonify, g, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

TOKEN_TTL = int(os.getenv("TOKEN_TTL_HOURS", "12")) * 3600
ROLES = ("superadmin", "employee")

# Routes that must stay reachable without a login.
PUBLIC_PREFIXES = (
    "/api/auth/login",
    "/api/email/track/",          # tracking pixel loaded by recipients' mail clients
    "/api/webhook/",             # Twilio / Instagram call these (verified by their own signatures)
    "/api/gmail/callback",       # OAuth redirects back from Google / Dropbox
    "/api/cloud/dropbox/callback",
    "/api/cloud/gdrive/callback",
    "/covers/",                  # cover art shown on the public site
)

_BASE = os.path.dirname(os.path.abspath(__file__))
_DUMMY_HASH = generate_password_hash("dummy", method="pbkdf2:sha256")
_failures = {}   # (ip, email) -> [timestamps]; in-memory login throttle


def _secret_key():
    key = os.getenv("SECRET_KEY")
    if key:
        return key
    path = os.path.join(_BASE, ".secret_key")     # generated once, git-ignored
    if os.path.exists(path):
        return open(path).read().strip()
    key = secrets.token_hex(32)
    with open(path, "w") as f:
        f.write(key)
    os.chmod(path, 0o600)
    return key


def _serializer():
    return URLSafeTimedSerializer(_secret_key(), salt="studioos-auth")


def _db():
    con = sqlite3.connect(current_app.config["DB_PATH"])
    con.row_factory = sqlite3.Row
    return con


def ensure_users_table(db_path):
    with sqlite3.connect(db_path) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT UNIQUE NOT NULL,
            name          TEXT DEFAULT '',
            role          TEXT DEFAULT 'employee',
            password_hash TEXT NOT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")


def create_user(db_path, email, password, name="", role="superadmin"):
    if role not in ROLES:
        raise ValueError(f"role must be one of {ROLES}")
    if len(password) < 10:
        raise ValueError("password must be at least 10 characters")
    ensure_users_table(db_path)
    with sqlite3.connect(db_path) as con:
        con.execute(
            "INSERT INTO users (email,name,role,password_hash) VALUES (?,?,?,?)"
            " ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,"
            " name=excluded.name, role=excluded.role",
            (email.strip().lower(), name, role,
             generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)),
        )


def _public_user(row):
    return {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"]}


def _token_from_request():
    h = request.headers.get("Authorization", "")
    if h.lower().startswith("bearer "):
        return h[7:].strip()
    return request.args.get("access_token", "")


def _user_from_token(token):
    try:
        data = _serializer().loads(token, max_age=TOKEN_TTL)
    except (BadSignature, SignatureExpired):
        return None
    con = _db()
    try:
        row = con.execute("SELECT * FROM users WHERE id=?", (data.get("uid"),)).fetchone()
    finally:
        con.close()
    return row


def require_superadmin(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not g.get("user") or g.user["role"] != "superadmin":
            return jsonify({"error": "Forbidden"}), 403
        return f(*a, **kw)
    return wrapper


def init_auth(app):
    app.config["DB_PATH"] = app.config.get("DB_PATH") or os.path.join(_BASE, "studioos.db")
    ensure_users_table(app.config["DB_PATH"])
    app.register_blueprint(auth_bp)

    @app.before_request
    def _gate():
        p = request.path
        if request.method == "OPTIONS" or not (
            p.startswith("/api/") or p.startswith("/serve-audio")
        ):
            return None
        if any(p.startswith(x) for x in PUBLIC_PREFIXES):
            return None
        token = _token_from_request()
        user = _user_from_token(token) if token else None
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.user = user
        return None

    @app.after_request
    def _headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return resp


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    d = request.get_json(silent=True) or {}
    email = (d.get("email") or "").strip().lower()
    password = d.get("password") or ""

    key = (request.remote_addr, email)
    now = time.time()
    recent = [t for t in _failures.get(key, []) if now - t < 900]
    if len(recent) >= 8:
        return jsonify({"error": "Too many attempts. Try again in 15 minutes."}), 429

    con = _db()
    try:
        row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    finally:
        con.close()
    # Always run a hash check so response time doesn't reveal whether the email exists.
    ok = check_password_hash(row["password_hash"] if row else _DUMMY_HASH, password)
    if not (row and ok):
        _failures[key] = recent + [now]
        return jsonify({"error": "Invalid email or password."}), 401

    _failures.pop(key, None)
    token = _serializer().dumps({"uid": row["id"]})
    return jsonify({"token": token, "user": _public_user(row), "expires_in": TOKEN_TTL})


@auth_bp.route("/api/auth/me")
def me():
    return jsonify(_public_user(g.user))
