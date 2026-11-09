#!/bin/bash
# Share the REDACTED demo over a temporary public URL (your Mac must stay on and awake).
# One-time setup:
#   brew install cloudflared
#   cd backend && python import_contacts.py "<master.csv>" --demo demo.db
#   DB_PATH=demo.db python create_user.py demo@example.com --role employee
set -e
cd "$(dirname "$0")"
[ -f backend/demo.db ] || { echo "backend/demo.db missing - see setup comments in this file"; exit 1; }
command -v cloudflared >/dev/null || { echo "Run: brew install cloudflared"; exit 1; }

# Build the site to talk to the same origin it is served from
(cd portfolio-site && VITE_API_BASE="" npm run build >/dev/null)

(cd backend && DB_PATH=demo.db PORT=5050 .venv/bin/python app.py) &
API=$!
trap "kill $API 2>/dev/null" EXIT
sleep 3
echo ""
echo "Look for the https://....trycloudflare.com address below. Send that + the demo login."
echo "Press Ctrl+C when finished: the link stops working immediately."
cloudflared tunnel --url http://localhost:5050
