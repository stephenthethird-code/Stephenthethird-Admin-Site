#!/bin/bash
# Run once from /backend:  bash setup.sh
set -e
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
[ -f .env ] || cp .env.example .env
python3 -c "
import sqlite3
with sqlite3.connect('studioos.db') as con:
    con.executescript(open('schema.sql').read())
print('studioos.db ready')
"
echo "Edit backend/.env, then: source .venv/bin/activate && python app.py"
