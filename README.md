# Music Hub (Studio OS)

A producer's portfolio site plus a private "Studio OS" admin: CRM contacts, track catalog,
projects, follow-ups, email campaigns with open tracking, whiteboard, and a unified
inbox (SMS / Instagram / Gmail) with Dropbox & Google Drive browsing.

- `portfolio-site/` — Vite + React + Tailwind frontend (public site + `/admin` pages)
- `backend/` — Flask + SQLite API (port 5050)
- `legacy/` — the original single-file prototypes, kept for reference
- `DISPATCH_SETUP.md` — optional integrations (Twilio, Meta, Gmail, librosa)

## Quick start

Backend:

```bash
cd backend
bash setup.sh            # venv, dependencies, .env, database
source .venv/bin/activate
python app.py            # http://localhost:5050
```

Frontend (second terminal):

```bash
cd portfolio-site
cp .env.example .env.local
npm install
npm run dev              # http://localhost:5173
```

Set `VITE_DEMO_MODE=true` to run the frontend with sample data and no backend.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Debug mode is off by default (`FLASK_DEBUG=1` to enable locally) and the
server binds to `127.0.0.1`.

`.env` files, the SQLite database, OAuth tokens and uploads are git-ignored — don't commit them.

## Publishing to GitHub

```bash
git remote add origin https://github.com/<you>/music-hub.git
git push -u origin main
```

The frontend can be deployed to GitHub Pages / Netlify / Vercel (`npm run build`, publish
`portfolio-site/dist`, set `VITE_API_BASE` or use demo mode). The Flask backend needs a
host such as Render, Railway, or a VPS.

## Login

Login is verified by the backend (`backend/auth.py`): hashed passwords in a `users` table,
signed 12-hour tokens, every `/api` route locked except login, the email-open pixel,
Twilio/Instagram webhooks and OAuth callbacks. Failed logins are throttled.

Create your account (hidden password prompt, min 10 chars):

```bash
cd backend && source .venv/bin/activate
python create_user.py you@example.com --name "Your Name" --role superadmin
DB_PATH=demo.db python create_user.py demo@example.com --role employee   # login for the demo DB
```

For production set `SECRET_KEY`, `CORS_ORIGINS` and serve over HTTPS.

## Contacts import & demoing to others

```bash
cd backend
python import_contacts.py "/path/to/MASTER SPREADSHEET.csv"            # your real DB
python import_contacts.py "/path/to/MASTER SPREADSHEET.csv" --demo demo.db   # redacted copy
cd .. && ./run_demo.sh      # runs the admin on the redacted copy
```

The demo copy has no emails, phone numbers or notes and omits blacklisted contacts.
Contacts are served only to logged-in users (they are no longer bundled into the site JS).

## Sharing a live demo

`./share_demo.sh` builds the site, serves it and the API from one port using the redacted demo
database, and opens a temporary public `trycloudflare.com` link (needs `brew install cloudflared`).
Give reviewers a demo login created with `create_user.py`; stop the script to revoke the link.
