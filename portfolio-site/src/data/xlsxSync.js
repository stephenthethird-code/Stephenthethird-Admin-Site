/**
 * xlsxSync.js — Auto-save contacts, projects, follow-ups to an Excel file.
 *
 * Uses the File System Access API (Chrome/Edge) so the file is written
 * directly to the user's chosen path on every data change.
 *
 * Usage:
 *   import { linkSpreadsheet, autoSave, syncState } from "./xlsxSync";
 *
 *   // On button click:
 *   await linkSpreadsheet();
 *
 *   // Whenever data changes (e.g. in a useEffect):
 *   autoSave({ contacts, projects, followups });
 */

import * as XLSX from "xlsx";

// ── Module-level state (survives re-renders, lives for the browser tab) ───────
let _fileHandle  = null;   // FileSystemFileHandle
let _timer       = null;   // debounce timer
let _saving      = false;
let _lastSaved   = null;   // Date
let _listeners   = [];     // state change subscribers

function notify() {
  _listeners.forEach(fn => fn(getState()));
}

export function getState() {
  return {
    linked:    !!_fileHandle,
    fileName:  _fileHandle?.name ?? null,
    saving:    _saving,
    lastSaved: _lastSaved,
  };
}

export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

// ── Link spreadsheet (must be called from a user gesture) ────────────────────
export async function linkSpreadsheet() {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "s3_studio_os.xlsx",
      types: [{
        description: "Excel Workbook",
        accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
      }],
    });
    _fileHandle = handle;
    notify();
    return handle.name;
  } catch (e) {
    if (e.name !== "AbortError") console.error("linkSpreadsheet:", e);
    return null;
  }
}

export function unlinkSpreadsheet() {
  _fileHandle = null;
  _lastSaved  = null;
  notify();
}

// ── Build workbook ────────────────────────────────────────────────────────────
function buildWorkbook({ contacts = [], projects = [], followups = [] }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Contacts
  const contactRows = contacts.map(c => ({
    Name:      c.name      ?? "",
    Role:      c.role      ?? "",
    Tier:      c.tier      ?? 3,
    Status:    (c.status   ?? "").replace(/_/g, " "),
    Company:   c.company   ?? "",
    Location:  c.location  ?? "",
    Email:     c.email     ?? "",
    Phone:     c.phone     ?? "",
    Instagram: c.instagram ?? "",
    Notes:     c.notes     ?? "",
  }));
  const wsContacts = XLSX.utils.json_to_sheet(contactRows, {
    header: ["Name","Role","Tier","Status","Company","Location","Email","Phone","Instagram","Notes"],
  });
  wsContacts["!cols"] = [24,14,6,12,22,20,28,16,18,40].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsContacts, "Contacts");

  // Sheet 2 — Projects
  const projectRows = projects.map(p => ({
    Title:    p.title    ?? "",
    Type:     p.type     ?? "",
    Status:   p.col      ?? "",
    Deadline: p.deadline ?? "",
    Notes:    p.notes    ?? "",
    Color:    p.color    ?? "",
  }));
  const wsProjects = XLSX.utils.json_to_sheet(projectRows, {
    header: ["Title","Type","Status","Deadline","Notes","Color"],
  });
  wsProjects["!cols"] = [28,14,12,14,40,10].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsProjects, "Projects");

  // Sheet 3 — Follow-ups
  const followupRows = followups.map(f => ({
    Title:       f.title        ?? "",
    Type:        f.type         ?? "",
    Status:      f.status       ?? "",
    "Due Date":  f.due_date     ?? "",
    Contact:     f.contact_name ?? "",
    Notes:       f.notes        ?? "",
    "Project ID": f.projectId   ?? "",
  }));
  const wsFollowups = XLSX.utils.json_to_sheet(followupRows, {
    header: ["Title","Type","Status","Due Date","Contact","Notes","Project ID"],
  });
  wsFollowups["!cols"] = [30,16,12,12,20,36,10].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsFollowups, "Follow-ups");

  return wb;
}

// ── Write to the linked file ──────────────────────────────────────────────────
async function writeFile(data) {
  if (!_fileHandle) return;
  _saving = true;
  notify();
  try {
    const wb  = buildWorkbook(data);
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const writable = await _fileHandle.createWritable();
    await writable.write(buf);
    await writable.close();
    _lastSaved = new Date();
  } catch (e) {
    // Handle permission revoked
    if (e.name === "NotAllowedError") {
      try {
        // Re-request permission
        const perm = await _fileHandle.requestPermission({ mode: "readwrite" });
        if (perm === "granted") {
          const wb  = buildWorkbook(data);
          const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const writable = await _fileHandle.createWritable();
          await writable.write(buf);
          await writable.close();
          _lastSaved = new Date();
        }
      } catch { /* give up quietly */ }
    } else {
      console.error("xlsxSync write error:", e);
    }
  } finally {
    _saving = false;
    notify();
  }
}

// ── Debounced auto-save (call this whenever data changes) ─────────────────────
export function autoSave(data, delayMs = 1500) {
  if (!_fileHandle) return;
  clearTimeout(_timer);
  _timer = setTimeout(() => writeFile(data), delayMs);
  // Mark as "pending save" immediately
  _saving = true;
  notify();
}

// ── One-shot manual save (bypasses debounce) ─────────────────────────────────
export async function saveNow(data) {
  clearTimeout(_timer);
  await writeFile(data);
}

// ── Fallback: browser download (no File System Access API) ───────────────────
export function downloadNow({ contacts = [], projects = [], followups = [] }) {
  const wb = buildWorkbook({ contacts, projects, followups });
  XLSX.writeFile(wb, "s3_studio_os.xlsx");
}

// ── Feature detection ─────────────────────────────────────────────────────────
export const canAutoSave = typeof window !== "undefined" && "showSaveFilePicker" in window;
