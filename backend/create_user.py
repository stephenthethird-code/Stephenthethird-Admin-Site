"""Create (or reset the password of) a login.

    python create_user.py you@example.com --name "Stephen" --role superadmin
    DB_PATH=demo.db python create_user.py demo@example.com --role employee   # login for the demo DB

The password is typed at a hidden prompt, never passed on the command line.
"""
import argparse, getpass, os, sys
from auth import create_user, ROLES

BASE = os.path.dirname(os.path.abspath(__file__))

ap = argparse.ArgumentParser()
ap.add_argument("email")
ap.add_argument("--name", default="")
ap.add_argument("--role", default="superadmin", choices=ROLES)
a = ap.parse_args()

db = os.getenv("DB_PATH") or os.path.join(BASE, "studioos.db")
pw = getpass.getpass("Password (min 10 chars): ")
if pw != getpass.getpass("Repeat password: "):
    sys.exit("Passwords don't match.")
try:
    create_user(db, a.email, pw, a.name, a.role)
except ValueError as e:
    sys.exit(str(e))
print(f"Saved {a.email} ({a.role}) in {db}")
