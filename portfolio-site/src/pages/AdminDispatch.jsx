/**
 * AdminDispatch.jsx  →  /admin/dispatch
 *
 * Unified message feed — SMS, Instagram DMs, manual pastes.
 * Each message is cross-referenced with the CRM contact list.
 * One click links it to an active project.
 * Mobile-optimized layout.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Instagram, Phone, Mail, Plus, X,
  Link2, CheckCircle2, Clock, User, Layers, Filter,
  ChevronDown, AlertCircle, Zap, Send, RefreshCw,
  Circle, ExternalLink, Trash2, Search,
} from "lucide-react";
import AdminShell        from "../components/admin/AdminShell";
import { useAdminData }  from "../context/AdminDataContext";

const API  = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");
const EASE = [0.22, 1, 0.36, 1];
const FADE = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: EASE, delay: d },
});

// ── Source config ─────────────────────────────────────────────────────────────
const SOURCE_CFG = {
  sms:    { label: "SMS",      Icon: Phone,          color: "#10b981", bg: "#10b98118" },
  ig:     { label: "Instagram",Icon: Instagram,      color: "#e879f9", bg: "#e879f918" },
  email:  { label: "Email",    Icon: Mail,           color: "#3b82f6", bg: "#3b82f618" },
  manual: { label: "Manual",   Icon: MessageSquare,  color: "#6b7280", bg: "#6b728018" },
};

const STATUS_CFG = {
  unread:  { label: "Unread",  color: "#ef4444" },
  read:    { label: "Read",    color: "#6b7280" },
  linked:  { label: "Linked",  color: "#f59e0b" },
  handled: { label: "Handled", color: "#10b981" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Paste / Manual entry modal ────────────────────────────────────────────────
function PasteModal({ contacts, projects, onSave, onClose }) {
  const [form, setForm] = useState({
    source: "manual", sender_name: "", sender_ref: "",
    contact_id: "", project_id: "", body: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-match contact when sender_ref changes
  useEffect(() => {
    if (!form.sender_ref || form.contact_id) return;
    const ref = form.sender_ref.toLowerCase().replace(/^\+1/, "").replace(/\D/g,"");
    const match = contacts.find(c => {
      const phone = (c.phone || "").replace(/\D/g,"").slice(-10);
      const ig    = (c.instagram || "").replace("@","").toLowerCase();
      return phone === ref.slice(-10) || ig === form.sender_ref.replace("@","").toLowerCase();
    });
    if (match) set("contact_id", match.id);
  }, [form.sender_ref]);

  function save() {
    if (!form.body.trim()) return;
    onSave(form);
  }

  return (
    <motion.div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}>
      <motion.div
        className="bg-white w-full sm:max-w-lg sm:border sm:border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-black text-sm">Log Message</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Source */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1.5">Source</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(SOURCE_CFG).map(([k, v]) => (
                <button key={k} onClick={() => set("source", k)}
                  className={`flex items-center justify-center gap-1 py-2 border text-[11px] transition-all ${
                    form.source === k ? "text-white border-transparent" : "border-gray-200 text-gray-500"
                  }`}
                  style={form.source === k ? { background: v.color } : {}}>
                  <v.Icon size={11} />{v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sender */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Name</label>
              <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                placeholder="Artist / person name" value={form.sender_name} onChange={e => set("sender_name", e.target.value)} />
            </div>
            <div>
              <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">
                {form.source === "ig" ? "IG Handle" : "Phone / Email"}
              </label>
              <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                placeholder={form.source === "ig" ? "@handle" : "+1 212..."}
                value={form.sender_ref} onChange={e => set("sender_ref", e.target.value)} />
            </div>
          </div>

          {/* Contact match */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Link to Contact</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={form.contact_id} onChange={e => set("contact_id", e.target.value)}>
              <option value="">No match — unlinked</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.role ? `· ${c.role}` : ""}</option>)}
            </select>
          </div>

          {/* Project link */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Link to Project</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={form.project_id} onChange={e => set("project_id", e.target.value)}>
              <option value="">No project</option>
              {projects.filter(p => p.col === "current" || p.col === "upcoming")
                .map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {/* Message body */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Message *</label>
            <textarea rows={4}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Paste the message here…"
              value={form.body} onChange={e => set("body", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-xs">Cancel</button>
          <button onClick={save} disabled={!form.body.trim()}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 disabled:opacity-40 transition-colors">
            Log Message
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Message card ──────────────────────────────────────────────────────────────
function MessageCard({ msg, projects, onUpdate, onDelete, onLinkProject }) {
  const [expanded,    setExpanded]    = useState(false);
  const [linkingProj, setLinkingProj] = useState(false);

  const src = SOURCE_CFG[msg.source] || SOURCE_CFG.manual;
  const st  = STATUS_CFG[msg.status] || STATUS_CFG.unread;
  const isUnread = msg.status === "unread";

  function markRead() {
    if (msg.status === "unread") onUpdate(msg.id, { status: "read" });
  }

  return (
    <motion.div layout
      className={`border-b border-gray-50 transition-colors ${isUnread ? "bg-amber-50/30" : "bg-white"}`}
      onClick={() => { setExpanded(e => !e); markRead(); }}>

      {/* Top row */}
      <div className="flex items-start gap-3 px-4 py-3.5 cursor-pointer">
        {/* Source icon */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: src.bg }}>
          <src.Icon size={13} style={{ color: src.color }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-900 text-xs font-bold">
              {msg.contact_name || msg.sender_name || msg.sender_ref || "Unknown"}
            </span>
            {msg.contact_name && msg.tier && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ color: msg.tier === 1 ? "#f59e0b" : "#6b7280",
                         background: msg.tier === 1 ? "#f59e0b18" : "#6b728018" }}>
                T{msg.tier}
              </span>
            )}
            {msg.project_title && (
              <span className="flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                <Layers size={8} />{msg.project_title}
              </span>
            )}
            {isUnread && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            )}
          </div>
          <p className={`text-gray-600 text-xs mt-0.5 ${expanded ? "" : "line-clamp-2"}`}>
            {msg.body}
          </p>
        </div>

        {/* Time */}
        <span className="text-gray-300 text-[10px] flex-shrink-0 mt-0.5">{timeAgo(msg.received_at)}</span>
      </div>

      {/* Expanded actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="px-4 pb-3 overflow-hidden">

            {/* Full message if long */}
            {msg.body.length > 120 && (
              <p className="text-gray-700 text-xs leading-relaxed mb-3 pl-10 border-l-2 border-gray-100">
                {msg.body}
              </p>
            )}

            <div className="pl-10 flex flex-wrap gap-2 items-center">
              {/* Status buttons */}
              {["read","linked","handled"].map(s => (
                <button key={s} onClick={() => onUpdate(msg.id, { status: s })}
                  className={`px-2.5 py-1 border text-[10px] font-bold transition-all ${
                    msg.status === s ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                  style={msg.status === s ? { background: STATUS_CFG[s].color } : {}}>
                  {STATUS_CFG[s].label}
                </button>
              ))}

              {/* Link to project */}
              {!msg.project_title ? (
                <div className="relative">
                  <button onClick={() => setLinkingProj(l => !l)}
                    className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-amber-300 text-amber-600 text-[10px] hover:border-amber-400 transition-colors">
                    <Link2 size={10} /> Link Project
                  </button>
                  <AnimatePresence>
                    {linkingProj && (
                      <motion.div
                        initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                        className="absolute left-0 top-8 z-20 bg-white border border-gray-200 shadow-lg min-w-[200px] py-1">
                        {projects.filter(p => p.col === "current" || p.col === "upcoming").map(p => (
                          <button key={p.id}
                            onClick={() => { onLinkProject(msg.id, p.id); setLinkingProj(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-amber-50 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: p.color || "#6b7280" }} />
                            {p.title}
                          </button>
                        ))}
                        {projects.filter(p => p.col === "current" || p.col === "upcoming").length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-300">No active projects</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                  <CheckCircle2 size={10} /> {msg.project_title}
                </span>
              )}

              {/* Delete */}
              <button onClick={() => onDelete(msg.id)}
                className="ml-auto text-gray-200 hover:text-red-400 transition-colors p-1">
                <Trash2 size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Setup card (shown when Twilio/IG not connected) ───────────────────────────
function SetupCard({ title, Icon, color, steps, docUrl }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 bg-white">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: color + "18" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div className="flex-1">
          <p className="text-gray-900 text-xs font-bold">{title}</p>
          <p className="text-gray-400 text-[10px]">Not connected — tap to set up</p>
        </div>
        <ChevronDown size={14} className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0 }} animate={{ height:"auto" }} exit={{ height:0 }}
            className="overflow-hidden border-t border-gray-100">
            <ol className="p-4 space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">{i+1}</span>
                  <span>{s}</span>
                </li>
              ))}
              {docUrl && (
                <li>
                  <a href={docUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1">
                    <ExternalLink size={11} /> View docs
                  </a>
                </li>
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDispatch() {
  const adminData = useAdminData();
  const contacts  = adminData?.contacts  ?? [];
  const projects  = adminData?.projects  ?? [];

  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [pasting,   setPasting]   = useState(false);
  const [filterSrc, setFilterSrc] = useState("all");
  const [filterSt,  setFilterSt]  = useState("all");
  const [search,    setSearch]    = useState("");
  const [stats,     setStats]     = useState({ total:0, unread:0, linked:0 });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/dispatch`);
      if (r.ok) setMessages(await r.json());
    } catch {
      // Backend offline — show demo messages
      setMessages(DEMO_MESSAGES);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/dispatch/stats`);
      if (r.ok) setStats(await r.json());
    } catch {
      setStats({ total: DEMO_MESSAGES.length, unread: 2, linked: 1 });
    }
  }, []);

  useEffect(() => { fetchMessages(); fetchStats(); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function handleSave(form) {
    try {
      const r = await fetch(`${API}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        const created = await r.json();
        // Optimistic update with contact name resolved locally
        const contact = contacts.find(c => c.id === Number(form.contact_id));
        const project = projects.find(p => p.id === Number(form.project_id));
        setMessages(m => [{
          id: created.id,
          source: form.source,
          sender_name: form.sender_name,
          sender_ref:  form.sender_ref,
          contact_id:  form.contact_id ? Number(form.contact_id) : null,
          contact_name: contact?.name || null,
          tier: contact?.tier || null,
          project_id: form.project_id ? Number(form.project_id) : null,
          project_title: project?.title || null,
          body: form.body,
          status: "unread",
          received_at: new Date().toISOString(),
        }, ...m]);
      }
    } catch {
      // Offline — local only
      const contact = contacts.find(c => c.id === Number(form.contact_id));
      const project = projects.find(p => p.id === Number(form.project_id));
      setMessages(m => [{
        id: Date.now(), ...form,
        contact_name: contact?.name || null,
        tier: contact?.tier || null,
        project_title: project?.title || null,
        received_at: new Date().toISOString(),
      }, ...m]);
    }
    setPasting(false);
    fetchStats();
  }

  async function handleUpdate(id, patch) {
    setMessages(m => m.map(msg => msg.id === id ? { ...msg, ...patch } : msg));
    try {
      await fetch(`${API}/api/dispatch/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {}
    fetchStats();
  }

  async function handleDelete(id) {
    setMessages(m => m.filter(msg => msg.id !== id));
    try { await fetch(`${API}/api/dispatch/${id}`, { method: "DELETE" }); } catch {}
    fetchStats();
  }

  function handleLinkProject(msgId, projectId) {
    const project = projects.find(p => p.id === projectId);
    handleUpdate(msgId, {
      project_id: projectId,
      project_title: project?.title,
      status: "linked",
    });
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => messages.filter(m => {
    if (filterSrc !== "all" && m.source !== filterSrc) return false;
    if (filterSt  !== "all" && m.status !== filterSt)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.body?.toLowerCase().includes(q) &&
          !m.contact_name?.toLowerCase().includes(q) &&
          !m.sender_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [messages, filterSrc, filterSt, search]);

  const unread = messages.filter(m => m.status === "unread").length;

  return (
    <AdminShell>
      <div className="flex flex-col h-full max-w-3xl mx-auto md:max-w-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-gray-900 font-black text-base tracking-tight">Dispatch</h1>
                {unread > 0 && (
                  <span className="text-[10px] font-black text-white bg-red-400 px-1.5 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-[11px] mt-0.5">
                {stats.total} messages · {stats.linked} linked to projects
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchMessages}
                className="p-2 border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => setPasting(true)}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 text-xs hover:bg-amber-500 transition-colors">
                <Plus size={13} /> Log Message
              </button>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(SOURCE_CFG).map(([k, v]) => {
              const count = messages.filter(m => m.source === k).length;
              return count > 0 ? (
                <button key={k}
                  onClick={() => setFilterSrc(f => f === k ? "all" : k)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    filterSrc === k ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  style={filterSrc === k ? { background: v.color } : {}}>
                  <v.Icon size={9} />{v.label} {count}
                </button>
              ) : null;
            })}
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0 bg-gray-50/60">
          <div className="relative flex-1">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input className="w-full pl-7 pr-3 py-1.5 border border-gray-200 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 bg-white"
              placeholder="Search messages…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 px-2 py-1.5 text-xs text-gray-600 focus:outline-none bg-white"
            value={filterSt} onChange={e => setFilterSt(e.target.value)}>
            <option value="all">All</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* ── Feed ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Setup cards — shown when no real messages yet */}
          {messages.length === 0 && !loading && (
            <div className="p-4 space-y-3">
              <p className="text-gray-400 text-xs mb-4">Connect your channels to start receiving messages automatically:</p>
              <SetupCard
                title="Twilio SMS"
                Icon={Phone}
                color="#10b981"
                steps={[
                  "Sign up at twilio.com and buy a phone number (~$1/mo)",
                  "In Twilio console: Messaging → Active Numbers → click your number",
                  "Set Webhook URL to: http://your-server:5050/api/webhook/twilio",
                  "Add TWILIO_AUTH_TOKEN to your .env file",
                  "Contacts text your Twilio number and messages appear here instantly",
                ]}
                docUrl="https://www.twilio.com/docs/sms/quickstart"
              />
              <SetupCard
                title="Instagram DMs (Meta API)"
                Icon={Instagram}
                color="#e879f9"
                steps={[
                  "Go to developers.facebook.com → Create App → Business type",
                  "Add Instagram product → connect your IG Business account",
                  "Enable 'instagram_manage_messages' permission (requires App Review)",
                  "Set Webhook URL: http://your-server:5050/api/webhook/ig",
                  "Set META_VERIFY_TOKEN and META_APP_SECRET env vars",
                  "Note: Meta App Review can take 1-2 weeks for DM permissions",
                ]}
                docUrl="https://developers.facebook.com/docs/messenger-platform/instagram"
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={18} className="animate-spin text-gray-300" />
            </div>
          )}

          <AnimatePresence initial={false}>
            {filtered.map((msg, i) => (
              <motion.div key={msg.id} {...FADE(i * 0.02)}>
                <MessageCard
                  msg={msg}
                  projects={projects}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onLinkProject={handleLinkProject}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && messages.length > 0 && (
            <p className="text-gray-300 text-sm text-center py-10">No messages match your filters</p>
          )}
        </div>
      </div>

      {/* Paste modal */}
      <AnimatePresence>
        {pasting && (
          <PasteModal
            contacts={contacts}
            projects={projects}
            onSave={handleSave}
            onClose={() => setPasting(false)}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}

// ── Demo messages (shown when backend is offline) ─────────────────────────────
const DEMO_MESSAGES = [
  {
    id: 1, source: "ig", sender_name: "Don Toliver", sender_ref: "@dontoliver",
    contact_name: "Don Toliver", tier: 1,
    body: "bro those stems from Atlantic just came through, let me know when you're in the studio",
    project_title: "Don Toliver Collab", status: "unread",
    received_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2, source: "sms", sender_name: "A&R @ Empire", sender_ref: "+12125550142",
    contact_name: null, tier: null,
    body: "Hey, just wanted to confirm the Shotgun royalty statement was sent over. Should hit your account by Friday.",
    project_title: null, status: "unread",
    received_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3, source: "ig", sender_name: "Kaycyy", sender_ref: "@kaycyy",
    contact_name: "Kaycyy", tier: 1,
    body: "EP is looking crazy bro. Can we lock in a session next week to do the last record?",
    project_title: "Kaycyy EP", status: "read",
    received_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4, source: "manual", sender_name: "Vicente Lopez", sender_ref: "",
    contact_name: "Vicente Lopez", tier: 2,
    body: "300 Entertainment wants to hear 3 more records. They're serious. Need them by Monday.",
    project_title: "300 Ent Pitch", status: "linked",
    received_at: new Date(Date.now() - 172800000).toISOString(),
  },
];
