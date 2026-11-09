/**
 * AdminContacts.jsx  →  /admin/contacts
 *
 * Full CRM with add / edit / delete.
 * Tier 1=Inner Circle · 2=Collaborator · 3=Network · 4=Target · 5=Blacklist
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Mail, MapPin, Building2, Plus, Trash2,
  Edit3, Save, Users, Star, Instagram, Phone,
  RotateCcw, Check, ChevronRight, UserPlus, Briefcase, FolderPlus,
  Download, Upload, AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import AdminShell      from "../components/admin/AdminShell";
import contactsRaw, { TIER_LABELS, TIER_COLORS, STATUS_COLORS } from "../data/contactsData";
import { useAdminData } from "../context/AdminDataContext";

// ── Excel helpers ─────────────────────────────────────────────────────────────
const XLS_COLS = ["Name","Role","Tier","Status","Company","Location","Email","Phone","Instagram","Notes"];

function exportToXLSX(contacts) {
  const rows = contacts.map(c => ({
    Name:      c.name      ?? "",
    Role:      c.role      ?? "",
    Tier:      c.tier      ?? 3,
    Status:    (c.status   ?? "").replace("_"," "),
    Company:   c.company   ?? "",
    Location:  c.location  ?? "",
    Email:     c.email     ?? "",
    Phone:     c.phone     ?? "",
    Instagram: c.instagram ?? "",
    Notes:     c.notes     ?? "",
  }));
  const ws  = XLSX.utils.json_to_sheet(rows, { header: XLS_COLS });
  // Column widths
  ws["!cols"] = [24,14,6,12,22,20,28,16,18,40].map(w => ({ wch: w }));
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");
  XLSX.writeFile(wb, "s3_contacts.xlsx");
}

function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type:"binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
        const parsed = rows.map((r, i) => ({
          id:        Date.now() + i,
          name:      r.Name      || r.name      || "",
          role:      r.Role      || r.role      || "",
          tier:      Number(r.Tier ?? r.tier ?? 3),
          status:    (r.Status   || r.status    || "active").toLowerCase().replace(" ","_"),
          company:   r.Company   || r.company   || "",
          location:  r.Location  || r.location  || "",
          email:     r.Email     || r.email     || "",
          phone:     r.Phone     || r.phone     || "",
          instagram: r.Instagram || r.instagram || "",
          notes:     r.Notes     || r.notes     || "",
        })).filter(c => c.name.trim());
        resolve(parsed);
      } catch(err) { reject(err); }
    };
    reader.readAsBinaryString(file);
  });
}

const ROLES       = ["All","Artist","Exec","Producer","Engineer","Writer","Creative","Manager","Other"];
const TIERS       = [0,1,2,3,4,5];
const STATUSES    = ["All","Active","Inactive","Reach Out"];
const EASE        = [0.22, 1, 0.36, 1];
const SPRING      = { type:"spring", stiffness:300, damping:30 };
const API         = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const BLANK_CONTACT = {
  name:"", role:"", tier:3, location:"", company:"",
  email:"", phone:"", instagram:"", notes:"", status:"active",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiSaveContact(contact) {
  const method = contact.id ? "PATCH" : "POST";
  const url    = contact.id ? `${API}/api/contacts/${contact.id}` : `${API}/api/contacts`;
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error("save failed");
  return r.json();
}

async function apiDeleteContact(id) {
  await fetch(`${API}/api/contacts/${id}`, { method:"DELETE", signal: AbortSignal.timeout(3000) });
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const c = TIER_COLORS[tier] ?? TIER_COLORS[3];
  return (
    <span className={`inline-flex items-center text-[9px] px-2 py-0.5 border tracking-[0.12em] uppercase font-medium ${c.bg} ${c.text} ${c.border}`}>
      {TIER_LABELS[tier] ?? "Network"}
    </span>
  );
}

function Avatar({ name, tier }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const c = TIER_COLORS[tier] ?? TIER_COLORS[3];
  return (
    <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center text-[11px] font-black border ${c.bg} ${c.text} ${c.border}`}>
      {initials}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls  = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";
const selectCls = inputCls + " cursor-pointer";

// ── Project badges (mini colour squares) ────────────────────────────────────
function ProjectBadges({ contactId, getContactProjects }) {
  const assigned = getContactProjects(contactId);
  if (!assigned.length) return null;
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {assigned.map(p => (
        <span
          key={p.id}
          title={p.title}
          style={{ background: p.color }}
          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
        />
      ))}
    </div>
  );
}

// ── Edit / Add panel ──────────────────────────────────────────────────────────
function ContactPanel({ contact, isNew, onSave, onClose, onDelete, projectStore }) {
  const [form, setForm]     = useState({ ...BLANK_CONTACT, ...contact });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [projSearch, setProjSearch] = useState("");

  const {
    projects = [],
    assignContact,
    unassignContact,
    getContactProjects,
  } = projectStore || {};

  const assignedProjects = contact?.id ? (getContactProjects?.(contact.id) ?? []) : [];

  // Projects not yet assigned
  const unassignedProjects = projects.filter(
    p => !assignedProjects.find(a => a.id === p.id) &&
         p.title.toLowerCase().includes(projSearch.toLowerCase())
  );

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let result = form;
      try { result = await apiSaveContact(form); } catch {}
      onSave({ ...form, ...result, id: form.id || result.id || Date.now() });
      setSaved(true);
      setTimeout(() => { setSaved(false); if (isNew) onClose(); }, 1500);
    } finally { setSaving(false); }
  }

  return (
    <motion.div
      key={contact?.id ?? "new"}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0,  opacity: 1 }}
      exit={{    x: 60, opacity: 0 }}
      transition={SPRING}
      className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <p className="text-gray-500 text-xs font-medium flex items-center gap-2">
          {isNew
            ? <><UserPlus size={12} className="text-amber-400" /> New Contact</>
            : <><Edit3 size={11} className="text-amber-400" /> {form.name || "Edit"}</>}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <Field label="Full Name">
          <input className={inputCls} value={form.name}
            onChange={e => set("name", e.target.value)} placeholder="Name" autoFocus={isNew} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select className={selectCls} value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="">— Select —</option>
              {ROLES.filter(r => r !== "All").map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Tier">
            <select className={selectCls} value={form.tier} onChange={e => set("tier", Number(e.target.value))}>
              {[1,2,3,4,5].map(t => (
                <option key={t} value={t}>{t} — {TIER_LABELS[t]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set("status", e.target.value)}>
            {["active","inactive","reach_out"].map(s => (
              <option key={s} value={s}>{s.replace("_"," ")}</option>
            ))}
          </select>
        </Field>

        <Field label="Company / Label">
          <input className={inputCls} value={form.company}
            onChange={e => set("company", e.target.value)} placeholder="Empire Records…" />
        </Field>

        <Field label="Location">
          <input className={inputCls} value={form.location}
            onChange={e => set("location", e.target.value)} placeholder="New York, NY" />
        </Field>

        <Field label="Email">
          <input className={inputCls} type="email" value={form.email}
            onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input className={inputCls} value={form.phone}
              onChange={e => set("phone", e.target.value)} placeholder="+1 212…" />
          </Field>
          <Field label="Instagram">
            <input className={inputCls} value={form.instagram}
              onChange={e => set("instagram", e.target.value)} placeholder="@handle" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className={inputCls + " resize-none"} rows={4}
            value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Met at SXSW, intro'd by ASAP Illz…" />
        </Field>

        {/* ── Projects section ─────────────────────────────────────── */}
        {!isNew && contact?.id && (
          <div className="pt-1">
            <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-2 flex items-center gap-1.5">
              <Briefcase size={10} className="text-amber-400/60" /> Projects
            </label>

            {/* Assigned projects */}
            {assignedProjects.length > 0 ? (
              <div className="space-y-1 mb-3">
                {assignedProjects.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 group">
                    <span style={{ background: p.color }} className="w-2.5 h-2.5 rounded-sm flex-shrink-0" />
                    <span className="text-gray-600 text-xs flex-1 truncate">{p.title}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide flex-shrink-0">{p.type}</span>
                    <button
                      onClick={() => unassignContact?.(p.id, contact.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors ml-1 opacity-0 group-hover:opacity-100">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300 text-xs mb-3 italic">Not on any projects yet.</p>
            )}

            {/* Add to project picker */}
            <div className="relative">
              <div className="relative mb-1">
                <FolderPlus size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={projSearch}
                  onChange={e => setProjSearch(e.target.value)}
                  placeholder="Assign to project…"
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-xs pl-7 pr-3 py-1.5 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors"
                />
              </div>
              {unassignedProjects.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-gray-200 bg-gray-50">
                  {unassignedProjects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { assignContact?.(p.id, contact.id); setProjSearch(""); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 text-left transition-colors">
                      <span style={{ background: p.color }} className="w-2.5 h-2.5 rounded-sm flex-shrink-0" />
                      <span className="text-gray-500 text-xs flex-1 truncate hover:text-gray-900">{p.title}</span>
                      <span className="text-[9px] text-gray-300 uppercase tracking-wide">{p.type}</span>
                    </button>
                  ))}
                </div>
              )}
              {projSearch && unassignedProjects.length === 0 && (
                <p className="text-gray-300 text-[10px] py-1 pl-1">No matching projects</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
        <button onClick={handleSave} disabled={saving || !form.name.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-gray-900 text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-40">
          {saving ? <RotateCcw size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
          {saving ? "Saving…" : saved ? "Saved!" : isNew ? "Create" : "Save"}
        </button>
        {!isNew && (
          <button onClick={() => onDelete(form.id)}
            className="px-3 py-2.5 border border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminContacts() {
  // Pull contacts + projects from shared context
  const adminData    = useAdminData();
  const contacts     = adminData?.contacts     ?? contactsRaw;
  const setContacts  = adminData?.setContacts  ?? (() => {});
  const saveContact  = adminData?.saveContact  ?? (() => {});
  const deleteContact = adminData?.deleteContact ?? (() => {});
  const projectStore = adminData; // has assignContact, unassignContact, getContactProjects etc.

  const [query,         setQuery]         = useState("");
  const [roleTab,       setRoleTab]       = useState("All");
  const [tierFilt,      setTierFilt]      = useState(0);
  const [statFilt,      setStatFilt]      = useState("All");
  const [panel,         setPanel]         = useState(null);
  const [delConfirm,    setDelConfirm]    = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError,   setImportError]   = useState("");
  const importRef = useRef(null);

  // ── Export ──────────────────────────────────────────────────────────────
  function handleExport() {
    exportToXLSX(contacts);
  }

  // ── Import ──────────────────────────────────────────────────────────────
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportError("");
    try {
      const rows = await parseXLSX(file);
      if (!rows.length) { setImportError("No valid rows found in the file."); return; }
      setImportPreview(rows);
    } catch {
      setImportError("Couldn't read the file. Make sure it's a valid .xlsx or .csv.");
    }
  }

  function confirmImport() {
    if (!importPreview) return;
    const existing = new Set(contacts.map(c => c.name.toLowerCase().trim()));
    const newOnes  = importPreview.filter(c => !existing.has(c.name.toLowerCase().trim()));
    // Use shared store so auto-sync picks it up
    setContacts(prev => [...newOnes, ...prev]);
    setImportPreview(null);
  }

  // Stats
  const totalContacts  = contacts.length;
  const innerCircle    = contacts.filter(c => c.tier === 1).length;
  const activeContacts = contacts.filter(c => c.status === "active").length;
  const reachOut       = contacts.filter(c => c.status === "reach_out").length;

  // Filtered list
  const visible = useMemo(() => contacts.filter(c => {
    if (roleTab !== "All" && (c.role ?? "").toLowerCase() !== roleTab.toLowerCase()) return false;
    if (tierFilt !== 0 && c.tier !== tierFilt) return false;
    if (statFilt !== "All") {
      const s = statFilt.toLowerCase().replace(" ","_");
      if ((c.status ?? "").toLowerCase() !== s) return false;
    }
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (c.name      ?? "").toLowerCase().includes(q) ||
      (c.company   ?? "").toLowerCase().includes(q) ||
      (c.location  ?? "").toLowerCase().includes(q) ||
      (c.notes     ?? "").toLowerCase().includes(q)
    );
  }), [contacts, query, roleTab, tierFilt, statFilt]);

  function openEdit(contact) { setPanel({ contact, isNew: false }); }
  function openNew()          { setPanel({ contact: null, isNew: true }); }

  function handleSave(updated) {
    saveContact(updated);
  }

  function handleDelete(id) {
    setDelConfirm(id);
  }

  function confirmDelete(id) {
    deleteContact(id);
    setPanel(null);
    setDelConfirm(null);
  }

  return (
    <AdminShell>
      <div className="flex h-full overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>

        {/* Main column */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">CRM</p>
              <h2 className="text-gray-900 font-black text-xl" style={{ letterSpacing:"-0.02em" }}>
                Contacts
                <span className="text-gray-400 font-normal text-sm ml-2">{visible.length} / {totalContacts}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Import */}
              <input ref={importRef} type="file" accept=".xlsx,.xls,.csv"
                className="hidden" onChange={handleImportFile}/>
              <button onClick={() => importRef.current?.click()}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-2 hover:border-gray-300 hover:text-gray-700 transition-colors">
                <Upload size={12}/> Import
              </button>
              {/* Export */}
              <button onClick={handleExport}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-500 text-xs font-medium px-3 py-2 hover:border-gray-300 hover:text-gray-700 transition-colors">
                <Download size={12}/> Export
              </button>
              {/* Add */}
              <button onClick={openNew}
                className="flex items-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-400 hover:text-black transition-colors">
                <Plus size={12} /> Add Contact
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="px-6 py-3 border-b border-gray-100 grid grid-cols-4 gap-4 bg-gray-50 flex-shrink-0">
            {[
              { n: totalContacts,  l: "Total",       icon: Users, c: "text-gray-400"   },
              { n: innerCircle,    l: "Inner Circle", icon: Star,  c: "text-amber-400"  },
              { n: activeContacts, l: "Active",       icon: Check, c: "text-green-400"  },
              { n: reachOut,       l: "Reach Out",    icon: Mail,  c: "text-blue-400"   },
            ].map(({ n, l, icon: Icon, c }) => (
              <div key={l} className="flex items-center gap-2">
                <Icon size={13} className={c} />
                <span className="text-gray-900 font-black text-lg tabular-nums">{n}</span>
                <span className="text-gray-400 text-[10px] uppercase tracking-wide">{l}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search contacts, companies, locations…"
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm pl-8 pr-3 py-2 focus:outline-none focus:border-amber-400/30 placeholder:text-gray-300 transition-colors" />
              </div>
              <select value={statFilt} onChange={e => setStatFilt(e.target.value)}
                className="bg-gray-100 border border-gray-200 text-gray-400 text-xs px-3 py-2 focus:outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Role tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRoleTab(r)}
                  className={`text-[10px] tracking-[0.12em] uppercase px-3 py-1 transition-colors ${
                    roleTab === r
                      ? "bg-gray-100 text-gray-900 border border-gray-300"
                      : "text-gray-500 hover:text-gray-500 border border-transparent"
                  }`}>{r}</button>
              ))}
            </div>

            {/* Tier chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {TIERS.map(t => {
                const c = t === 0 ? null : TIER_COLORS[t];
                return (
                  <button key={t} onClick={() => setTierFilt(t)}
                    className={`text-[9px] tracking-[0.12em] uppercase px-2.5 py-1 border transition-all ${
                      tierFilt === t
                        ? (c ? `${c.bg} ${c.text} ${c.border}` : "bg-gray-100 text-gray-900 border-gray-300")
                        : "border-gray-200 text-gray-400 hover:border-gray-200"
                    }`}>
                    {t === 0 ? "All Tiers" : `T${t} · ${TIER_LABELS[t]}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact rows */}
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <div className="text-center py-20">
                <Users size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No contacts found</p>
              </div>
            )}
            {visible.map((c, i) => {
              const isActive  = panel?.contact?.id === c.id;
              return (
                <motion.div key={c.id}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: Math.min(i*0.015, 0.25), duration:0.3, ease:EASE }}
                  className={`flex items-center gap-4 px-6 py-3.5 border-b border-gray-100 group transition-all cursor-pointer ${
                    isActive ? "bg-gray-100 border-l-2 border-l-amber-400" : "hover:bg-gray-50"
                  }`}
                  onClick={() => openEdit(c)}>

                  <Avatar name={c.name} tier={c.tier} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-gray-700 text-sm font-medium truncate group-hover:text-gray-900 transition-colors">
                        {c.name}
                      </p>
                      {c.tier === 1 && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-500 text-xs truncate">
                        {[c.role, c.company].filter(Boolean).join(" · ")}
                      </p>
                      {/* Project colour badges */}
                      <ProjectBadges
                        contactId={c.id}
                        getContactProjects={projectStore.getContactProjects}
                      />
                    </div>
                  </div>

                  {c.location && (
                    <div className="hidden md:flex items-center gap-1 text-gray-300 text-xs flex-shrink-0">
                      <MapPin size={10} /> {c.location}
                    </div>
                  )}

                  <TierBadge tier={c.tier} />

                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    c.status === "active"    ? "bg-green-400" :
                    c.status === "reach_out" ? "bg-blue-400"  : "bg-gray-200"
                  }`} />

                  <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Edit / Add panel */}
        <AnimatePresence>
          {panel && (
            <ContactPanel
              key={panel.contact?.id ?? "new"}
              contact={panel.contact ?? {}}
              isNew={panel.isNew}
              onSave={handleSave}
              onClose={() => setPanel(null)}
              onDelete={handleDelete}
              projectStore={projectStore}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {delConfirm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => setDelConfirm(null)}>
            <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }}
              transition={SPRING}
              className="bg-white border border-gray-200 p-6 w-72"
              onClick={e => e.stopPropagation()}>
              <p className="text-gray-900 font-medium mb-2">Delete contact?</p>
              <p className="text-gray-400 text-sm mb-5">This can't be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => confirmDelete(delConfirm)}
                  className="flex-1 bg-red-500 text-white text-xs font-black tracking-widest uppercase py-2.5 hover:bg-red-400 transition-colors">
                  Delete
                </button>
                <button onClick={() => setDelConfirm(null)}
                  className="flex-1 border border-gray-200 text-gray-400 text-xs hover:text-gray-900 py-2.5 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import Preview Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {importPreview && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={() => setImportPreview(null)}>
            <motion.div initial={{ scale:0.96, y:10 }} animate={{ scale:1, y:0 }} exit={{ scale:0.96 }}
              transition={SPRING}
              className="bg-white border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-gray-900 text-sm font-black flex items-center gap-2">
                    <Upload size={14} className="text-amber-400"/> Import Preview
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {importPreview.filter(c => !contacts.find(e => e.name.toLowerCase() === c.name.toLowerCase())).length} new ·{" "}
                    {importPreview.filter(c =>  contacts.find(e => e.name.toLowerCase() === c.name.toLowerCase())).length} duplicates (will skip)
                  </p>
                </div>
                <button onClick={() => setImportPreview(null)} className="text-gray-400 hover:text-gray-900">
                  <X size={15}/>
                </button>
              </div>

              {/* Preview rows */}
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {importPreview.slice(0,30).map((c, i) => {
                  const isDupe = contacts.some(e => e.name.toLowerCase() === c.name.toLowerCase());
                  return (
                    <div key={i} className={`flex items-center gap-3 px-5 py-2.5 ${isDupe ? "opacity-40" : ""}`}>
                      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-[9px] font-black bg-gray-100 text-gray-500 border border-gray-200">
                        {(c.name[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-xs font-medium truncate">{c.name}</p>
                        <p className="text-gray-400 text-[10px] truncate">{[c.role, c.company, c.location].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 border font-medium uppercase tracking-wide flex-shrink-0 ${
                        isDupe ? "border-gray-200 text-gray-300" : "border-amber-400/30 text-amber-500 bg-amber-50"
                      }`}>
                        {isDupe ? "skip" : `T${c.tier}`}
                      </span>
                    </div>
                  );
                })}
                {importPreview.length > 30 && (
                  <p className="text-center text-gray-300 text-xs py-3">…and {importPreview.length - 30} more</p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={confirmImport}
                  className="flex-1 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-400 hover:text-black transition-colors">
                  <Check size={12} className="inline mr-1.5"/> Confirm Import
                </button>
                <button onClick={() => setImportPreview(null)}
                  className="px-4 border border-gray-200 text-gray-400 text-xs hover:text-gray-900 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import error toast */}
      <AnimatePresence>
        {importError && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 text-sm px-5 py-3 shadow-lg">
            <AlertCircle size={16}/>
            {importError}
            <button onClick={() => setImportError("")} className="ml-2 text-red-400 hover:text-red-600">
              <X size={14}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}

