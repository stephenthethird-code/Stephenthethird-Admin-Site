#!/bin/bash
# Run the admin against the REDACTED demo database (no emails, phones, notes, or blacklist).
# First time: cd backend && python import_contacts.py "<master.csv>" --demo demo.db && DB_PATH=demo.db python create_user.py demo@example.com
set -e
cd "$(dirname "$0")"
[ -f backend/demo.db ] || { echo "backend/demo.db missing - see comment above"; exit 1; }
(cd backend && DB_PATH=demo.db .venv/bin/python app.py) &
API=$!
trap "kill $API 2>/dev/null" EXIT
cd portfolio-site && npm run dev
