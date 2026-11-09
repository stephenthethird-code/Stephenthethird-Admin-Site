"""
Import the master contact CSV into the Studio OS database.

  python import_contacts.py "/path/to/MASTER SPREADSHEET ALL - Sheet1.csv"
  python import_contacts.py sheet.csv --demo demo.db      # redacted copy, safe to show

Cleans placeholders ("-", "#", "IG"), de-duplicates by name, normalises tier / role /
status, and moves phone numbers out of the email column. Re-running is safe: contacts
whose name already exists are skipped.

--demo writes a separate database with emails, phones and notes removed and
"5 - Blacklist" contacts left out. Run the API against it with:
    DB_PATH=demo.db python app.py
"""
import argparse, csv, os, re, sqlite3

BASE = os.path.dirname(os.path.abspath(__file__))
PLACEHOLDERS = {"", "-", "#", "##", "?", "????", "ig", "—"}
ROLE_MAP = {"engineer + prod": "Engineer", "dj": "Other", "a&r": "Exec", "": "Other"}
KNOWN_ROLES = {"Artist", "Exec", "Producer", "Engineer", "Writer", "Creative", "Manager", "Other"}
STATUS_MAP = {"active": "active", "inactive": "inactive", "reach out": "reach_out"}  # format the UI expects


def clean(v):
    v = (v or "").replace("‭", "").replace("‬", "").strip()
    return "" if v.lower() in PLACEHOLDERS else v


def parse_tier(v):
    m = re.match(r"\s*(\d)", v or "")
    t = int(m.group(1)) if m else None
    return t if t in (1, 2, 3, 4, 5) else None


def parse_contact_field(v):
    """Email/Contact column may hold an email, a phone number, or junk."""
    v = clean(v)
    if "@" in v:
        return v, ""
    if len(re.sub(r"\D", "", v)) >= 7:
        return "", v
    return "", ""


def norm_key(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def read_rows(path):
    merged = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            name = clean(r.get("Name"))
            if not name:
                continue
            role = clean(r.get("Role"))
            role = ROLE_MAP.get(role.lower(), role)
            if role not in KNOWN_ROLES:
                role = "Other"
            email, phone = parse_contact_field(r.get("Email/Contact"))
            row = {
                "name": name, "role": role, "tier": parse_tier(r.get("Tier")),
                "location": clean(r.get("Location")), "company": clean(r.get("Company")),
                "email": email, "phone": phone, "notes": clean(r.get("Notes / Intel")),
                "status": STATUS_MAP.get(clean(r.get("Status")).lower(), "active"),
            }
            k = norm_key(name)
            if k not in merged:
                merged[k] = row
                continue
            cur = merged[k]
            for field in ("location", "company", "email", "phone", "notes"):
                cur[field] = cur[field] or row[field]
            if cur["role"] == "Other":
                cur["role"] = row["role"]
            tiers = [t for t in (cur["tier"], row["tier"]) if t]
            cur["tier"] = min(tiers) if tiers else None
    for row in merged.values():
        row["tier"] = row["tier"] or 3
    return list(merged.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--demo", metavar="OUT.db", help="write a redacted demo database instead")
    ap.add_argument("--db", default=os.getenv("DB_PATH", os.path.join(BASE, "studioos.db")))
    a = ap.parse_args()

    rows = read_rows(a.csv)
    db_path = a.demo or a.db
    if a.demo:
        rows = [r for r in rows if r["tier"] != 5]
        for r in rows:
            r["email"] = r["phone"] = r["notes"] = ""
        if os.path.exists(db_path):
            os.remove(db_path)

    con = sqlite3.connect(db_path)
    with open(os.path.join(BASE, "schema.sql")) as f:
        con.executescript(f.read())
    have = {norm_key(n) for (n,) in con.execute("SELECT name FROM contacts")}
    added = 0
    for r in rows:
        if norm_key(r["name"]) in have:
            continue
        con.execute(
            "INSERT INTO contacts (name,role,tier,location,company,email,phone,notes,status)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (r["name"], r["role"], r["tier"], r["location"], r["company"],
             r["email"], r["phone"], r["notes"], r["status"]),
        )
        added += 1
    con.commit()
    total = con.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
    con.close()
    print(f"{db_path}: added {added}, skipped {len(rows) - added} existing, {total} total")


if __name__ == "__main__":
    main()
