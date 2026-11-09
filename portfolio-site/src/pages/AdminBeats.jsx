/**
 * AdminBeats.jsx  →  /admin/beats
 * Beat catalog + licensing inquiry management:
 * · Beat inventory (title, BPM, key, genre, mood, price, lease type, status)
 * · Add / Edit beat panel
 * · Licensing inquiries tracker (from, beat, license tier, date, status)
 * · Filter by genre / status / availability
 */

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, X, Music2, DollarSign, Tag, Sliders,
  CheckCircle2, Circle, Clock, Trash2, Edit2, ChevronDown,
  ExternalLink, FileText, Filter, Upload, Zap, Send,
  Users, Activity, BarChart2, Target, Loader, Check,
  AlertCircle, ChevronRight,
} from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import contactsRaw from "../data/contactsData";

const API = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const EASE = [0.22, 1, 0.36, 1];
const FADE = (d = 0) => ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }, transition: { duration: 0.3, ease: EASE, delay: d },
});

// ── Config ────────────────────────────────────────────────────────────────────
const GENRES  = ["Trap", "Drill", "R&B", "Hip-Hop", "Afro", "Pop", "Club", "Lo-Fi", "Other"];
const MOODS   = ["Dark", "Hard", "Melodic", "Emotional", "Chill", "Hype", "Smooth"];
const KEYS    = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B","Cm","C#m","Dm","D#m","Em","Fm","F#m","Gm","G#m","Am","A#m","Bm"];
const LEASE_TYPES = ["Non-Exclusive","Exclusive","Premium Exclusive","Buyout"];

const STATUS_CFG = {
  available:  { label: "Available",  color: "#10b981" },
  leased:     { label: "Leased",     color: "#3b82f6" },
  exclusive:  { label: "Exclusively Sold", color: "#f59e0b" },
  off_market: { label: "Off Market", color: "#6b7280" },
};

const INQUIRY_STATUS = {
  new:      { label: "New",      color: "#3b82f6"  },
  replied:  { label: "Replied",  color: "#f59e0b"  },
  licensed: { label: "Licensed", color: "#10b981"  },
  passed:   { label: "Passed",   color: "#6b7280"  },
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_BEATS = [
  { id:1, title:"Overtonight",    genre:"Trap",   mood:"Dark",     bpm:140, key:"Am",  status:"available",  price:299,  leases:["Non-Exclusive","Exclusive"], notes:"Hard 808s, dark melody.",  targets:[], audioFile:"" },
  { id:2, title:"Fallin on Purpose", genre:"R&B", mood:"Emotional",bpm:86,  key:"Fm",  status:"leased",     price:199,  leases:["Non-Exclusive"],              notes:"Placed on Kaycyy EP.",     targets:["Kaycyy"], audioFile:"" },
  { id:3, title:"WIN",            genre:"Trap",   mood:"Hype",     bpm:145, key:"G#m", status:"exclusive",  price:2500, leases:["Exclusive"],                  notes:"NBA 2K Sync — confirmed.", targets:[], audioFile:"" },
  { id:4, title:"Ghost Season",   genre:"Drill",  mood:"Dark",     bpm:142, key:"Dm",  status:"available",  price:249,  leases:["Non-Exclusive","Exclusive","Premium Exclusive"], notes:"",     targets:[], audioFile:"" },
  { id:5, title:"Solar",          genre:"Afro",   mood:"Smooth",   bpm:105, key:"C#m", status:"available",  price:179,  leases:["Non-Exclusive","Exclusive"],  notes:"Summer vibe.",            targets:[], audioFile:"" },
  { id:6, title:"Midnight Cut",   genre:"Lo-Fi",  mood:"Chill",    bpm:78,  key:"F#m", status:"available",  price:99,   leases:["Non-Exclusive"],              notes:"",                         targets:[], audioFile:"" },
];

const SEED_INQUIRIES = [
  { id:1, from:"A&R @ Atlantic",  beatId:1, beatTitle:"Overtonight",      license:"Exclusive",      date:"2026-04-22", status:"replied",  notes:"Waiting for budget approval." },
  { id:2, from:"Lil Durk team",   beatId:4, beatTitle:"Ghost Season",     license:"Non-Exclusive",  date:"2026-04-25", status:"new",      notes:"" },
  { id:3, from:"Kaycyy mgmt",     beatId:2, beatTitle:"Fallin on Purpose", license:"Non-Exclusive", date:"2026-04-01", status:"licensed", notes:"Signed off, payment received." },
];

// A&R pitches: { id, beatId, beatTitle, contactName, date, notes, status }
const SEED_PITCHES = [
  { id:1, beatId:1, beatTitle:"Overtonight",    contactName:"Overtonight", date:"2026-04-20", notes:"Sent private link, awaiting feedback", status:"sent" },
  { id:2, beatId:4, beatTitle:"Ghost Season",   contactName:"Joey Bada$$", date:"2026-04-24", notes:"Intro via manager, following up Friday", status:"follow_up" },
  { id:3, beatId:2, beatTitle:"Fallin on Purpose",contactName:"Kaycyy",   date:"2026-04-01", notes:"Placed on EP",                         status:"placed" },
];

const PITCH_STATUS = {
  draft:      { label:"Draft",      color:"#6b7280" },
  sent:       { label:"Sent",       color:"#3b82f6" },
  follow_up:  { label:"Follow Up",  color:"#f59e0b" },
  interested: { label:"Interested", color:"#8b5cf6" },
  placed:     { label:"Placed",     color:"#10b981" },
  passed:     { label:"Passed",     color:"#ef4444" },
};

let _beatId = 200;
let _inqId  = 300;
let _pitchId = 400;

const BLANK_BEAT  = { title:"", genre:"Trap", mood:"Dark", bpm:"", key:"Am", status:"available", price:"", leases:[], notes:"", targets:[], audioFile:"" };
const BLANK_INQ   = { from:"", beatId:"", beatTitle:"", license:"Non-Exclusive", date:"", status:"new", notes:"" };
const BLANK_PITCH = { beatId:"", beatTitle:"", contactName:"", date: new Date().toISOString().slice(0,10), notes:"", status:"sent" };

// ── Beat form ─────────────────────────────────────────────────────────────────
function BeatForm({ initial = BLANK_BEAT, onSave, onClose }) {
  const [f,          setF]         = useState({ ...BLANK_BEAT, ...initial });
  const [analyzing,  setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg]= useState("");
  const fileRef = useRef(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  function toggleLease(lt) {
    setF(p => ({
      ...p,
      leases: p.leases.includes(lt) ? p.leases.filter(l => l !== lt) : [...p.leases, lt],
    }));
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    set("audioFile", file.name);
    if (!f.title) set("title", file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    // Auto-analyze
    setAnalyzing(true);
    setAnalyzeMsg("Analyzing audio…");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API}/api/analyze`, { method:"POST", body: form, signal: AbortSignal.timeout(30000) });
      if (r.ok) {
        const d = await r.json();
        setF(p => ({
          ...p,
          bpm:   d.bpm   ? Math.round(d.bpm)       : p.bpm,
          key:   d.key                               || p.key,
          genre: d.genre                             || p.genre,
          mood:  d.mood                              || p.mood,
        }));
        setAnalyzeMsg(`✓ BPM: ${Math.round(d.bpm||0)} · Key: ${d.key||"?"} · Genre: ${d.genre||"?"}`);
      } else {
        setAnalyzeMsg("Analysis unavailable (backend offline?)");
      }
    } catch {
      setAnalyzeMsg("Analysis skipped — backend not reachable");
    } finally {
      setAnalyzing(false);
    }
  }

  function save() {
    if (!f.title.trim()) return;
    onSave({ ...f, title: f.title.trim(), bpm: Number(f.bpm) || 0, price: Number(f.price) || 0 });
  }

  const Field = ({ label, children }) => (
    <div>
      <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">{label}</label>
      {children}
    </div>
  );

  const Input = ({ k, ...rest }) => (
    <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
      value={f[k]} onChange={e => set(k, e.target.value)} {...rest} />
  );

  const Select = ({ k, opts }) => (
    <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
      value={f[k]} onChange={e => set(k, e.target.value)}>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <motion.div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}>
      <motion.div className="bg-white border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.95, opacity:0 }} transition={{ duration:0.2 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-black text-sm">{f.id ? "Edit Beat" : "Add Beat"}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Audio file upload + auto-analyze */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Audio File (auto-analyzes BPM, key, genre)</label>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 border-2 border-dashed py-3 text-xs transition-colors ${
                f.audioFile ? "border-amber-400/50 text-amber-500 bg-amber-50" : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}>
              {analyzing ? <Loader size={13} className="animate-spin" /> : <Upload size={13}/>}
              {analyzing ? "Analyzing…" : f.audioFile ? f.audioFile : "Click to upload audio file"}
            </button>
            {analyzeMsg && (
              <p className={`text-[10px] mt-1 ${analyzeMsg.startsWith("✓") ? "text-green-600" : "text-gray-400"}`}>{analyzeMsg}</p>
            )}
          </div>

          <Field label="Title *"><Input k="title" placeholder="Beat title" /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Genre"><Select k="genre" opts={GENRES} /></Field>
            <Field label="Mood"><Select k="mood" opts={MOODS} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="BPM"><Input k="bpm" type="number" placeholder="140" /></Field>
            <Field label="Key"><Select k="key" opts={KEYS} /></Field>
            <Field label="Price ($)"><Input k="price" type="number" placeholder="299" /></Field>
          </div>

          <Field label="Status">
            <Select k="status" opts={Object.keys(STATUS_CFG)} />
          </Field>

          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-2">License Tiers Offered</label>
            <div className="flex flex-wrap gap-2">
              {LEASE_TYPES.map(lt => (
                <button key={lt} type="button" onClick={() => toggleLease(lt)}
                  className={`px-2.5 py-1 border text-[11px] transition-all ${
                    f.leases.includes(lt)
                      ? "bg-amber-400 border-amber-400 text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {lt}
                </button>
              ))}
            </div>
          </div>

          <Field label="Notes">
            <textarea rows={2}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Placements, notes, tags..."
              value={f.notes} onChange={e => set("notes", e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
          <button onClick={save} disabled={!f.title.trim()}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 disabled:opacity-40 transition-colors">
            Save Beat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Pitch modal ───────────────────────────────────────────────────────────────
function PitchModal({ beats, initial = BLANK_PITCH, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_PITCH, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const contacts = contactsRaw;

  function selectBeat(id) {
    const b = beats.find(b => b.id === Number(id));
    setF(p => ({ ...p, beatId: id, beatTitle: b?.title || "" }));
  }

  function save() {
    if (!f.contactName.trim() || !f.beatId) return;
    onSave({ ...f });
  }

  const SPRING_P = { type:"spring", stiffness:300, damping:28 };

  return (
    <motion.div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}>
      <motion.div className="bg-white border border-gray-200 shadow-xl w-full max-w-md"
        initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.95, opacity:0 }} transition={{ duration:0.2 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-black text-sm flex items-center gap-2">
            <Send size={13} className="text-amber-400" /> Log A&amp;R Pitch
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Beat *</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.beatId} onChange={e => selectBeat(e.target.value)}>
              <option value="">Select beat…</option>
              {beats.filter(b => b.status === "available" || b.status === "leased").map(b => (
                <option key={b.id} value={b.id}>{b.title} — {b.genre} {b.bpm}bpm</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Artist / Contact *</label>
            <input list="contact-list"
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
              placeholder="Type name or select…"
              value={f.contactName}
              onChange={e => set("contactName", e.target.value)} />
            <datalist id="contact-list">
              {contacts.filter(c => c.role === "Artist" || c.role === "Manager").map(c => (
                <option key={c.id} value={c.name}>{c.name} — {c.role}</option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(PITCH_STATUS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set("status", k)}
                  className={`py-1.5 border text-[10px] font-bold transition-all ${
                    f.status === k ? "border-current" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                  style={f.status === k ? { color: v.color, background: v.color + "15", borderColor: v.color + "60" } : {}}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Date</label>
            <input type="date" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.date} onChange={e => set("date", e.target.value)} />
          </div>

          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Link sent, feedback received, deal points…"
              value={f.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
          <button onClick={save} disabled={!f.contactName.trim() || !f.beatId}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 disabled:opacity-40 transition-colors">
            Log Pitch
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Inquiry form ──────────────────────────────────────────────────────────────
function InquiryForm({ beats, initial = BLANK_INQ, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_INQ, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  function selectBeat(id) {
    const b = beats.find(b => b.id === Number(id));
    setF(p => ({ ...p, beatId: id, beatTitle: b?.title || "" }));
  }

  function save() {
    if (!f.from.trim() || !f.beatId) return;
    onSave({ ...f, from: f.from.trim() });
  }

  return (
    <motion.div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}>
      <motion.div className="bg-white border border-gray-200 shadow-xl w-full max-w-md"
        initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.95, opacity:0 }} transition={{ duration:0.2 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-black text-sm">Log Inquiry</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">From *</label>
            <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
              placeholder="e.g. A&R @ Atlantic" value={f.from} onChange={e => set("from", e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Beat *</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.beatId} onChange={e => selectBeat(e.target.value)}>
              <option value="">Select beat…</option>
              {beats.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">License</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.license} onChange={e => set("license", e.target.value)}>
              {LEASE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Date</label>
            <input type="date" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Context, budget, timeline..." value={f.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
          <button onClick={save} disabled={!f.from.trim() || !f.beatId}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 disabled:opacity-40 transition-colors">
            Log Inquiry
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Beat row ──────────────────────────────────────────────────────────────────
function BeatRow({ beat, onEdit, onDelete }) {
  const st = STATUS_CFG[beat.status] || STATUS_CFG.available;
  return (
    <motion.div layout className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
      {/* Status dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.color }} title={st.label} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm font-medium truncate">{beat.title}</p>
        <p className="text-gray-400 text-[10px]">
          {beat.genre} · {beat.mood} · {beat.bpm} BPM · {beat.key}
        </p>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-gray-700 text-sm font-bold tabular-nums">${beat.price.toLocaleString()}</p>
        <p className="text-gray-400 text-[9px]">{beat.leases.length} tier{beat.leases.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Status badge */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded hidden sm:inline-block flex-shrink-0"
        style={{ color: st.color, background: st.color + "18" }}>
        {st.label}
      </span>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onEdit(beat)} className="p-1 text-gray-300 hover:text-gray-700 transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => onDelete(beat.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminBeats() {
  const [beats,       setBeats]       = useState(SEED_BEATS);
  const [inquiries,   setInquiries]   = useState(SEED_INQUIRIES);
  const [pitches,     setPitches]     = useState(SEED_PITCHES);
  const [beatModal,   setBeatModal]   = useState(null);   // null | beat obj
  const [inqModal,    setInqModal]    = useState(false);
  const [pitchModal,  setPitchModal]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterGenre, setFilterGenre] = useState("All");
  const [filterSt,    setFilterSt]    = useState("All");
  const [tab,         setTab]         = useState("beats"); // "beats" | "inquiries" | "anr"

  // ── CRUD — Beats ──────────────────────────────────────────────────────────
  function saveBeat(data) {
    if (data.id) {
      setBeats(p => p.map(b => b.id === data.id ? data : b));
    } else {
      setBeats(p => [{ id: _beatId++, ...data }, ...p]);
    }
    setBeatModal(null);
  }

  function deleteBeat(id) {
    setBeats(p => p.filter(b => b.id !== id));
  }

  // ── CRUD — Inquiries ──────────────────────────────────────────────────────
  function saveInquiry(data) {
    setInquiries(p => [{ id: _inqId++, ...data }, ...p]);
    setInqModal(false);
  }

  function updateInquiry(id, patch) {
    setInquiries(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  // ── CRUD — Pitches ────────────────────────────────────────────────────────
  function savePitch(data) {
    setPitches(p => [{ id: _pitchId++, ...data }, ...p]);
    setPitchModal(false);
  }

  function updatePitch(id, patch) {
    setPitches(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  function deletePitch(id) {
    setPitches(p => p.filter(i => i.id !== id));
  }

  // ── Filtered beats ────────────────────────────────────────────────────────
  const filtered = useMemo(() => beats.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q) || b.mood.toLowerCase().includes(q);
    const matchG = filterGenre === "All" || b.genre === filterGenre;
    const matchS = filterSt    === "All" || b.status === filterSt;
    return matchQ && matchG && matchS;
  }), [beats, search, filterGenre, filterSt]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    beats.length,
    available:beats.filter(b => b.status === "available").length,
    revenue:  beats.filter(b => b.status !== "available").reduce((s, b) => s + b.price, 0),
    newInq:   inquiries.filter(i => i.status === "new").length,
    pitched:  pitches.length,
    placed:   pitches.filter(p => p.status === "placed").length,
  }), [beats, inquiries, pitches]);

  const allGenres = ["All", ...GENRES.filter(g => beats.some(b => b.genre === g))];

  return (
    <AdminShell>
      <div className="p-6 space-y-5 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 font-black text-lg tracking-tight">Beat Store</h1>
            <p className="text-gray-400 text-xs mt-0.5">Manage your catalog and licensing inquiries</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPitchModal(true)}
              className="flex items-center gap-1.5 border border-purple-200 text-purple-500 hover:bg-purple-50 px-3 py-2 text-xs transition-colors">
              <Send size={12} /> Log Pitch
            </button>
            <button onClick={() => setInqModal(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:text-gray-900 px-3 py-2 text-xs transition-colors">
              <FileText size={12} /> Log Inquiry
            </button>
            <button onClick={() => setBeatModal(BLANK_BEAT)}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 text-xs hover:bg-amber-500 transition-colors">
              <Plus size={13} /> Add Beat
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label:"Total Beats",  value: stats.total,     color:"#6b7280" },
            { label:"Available",    value: stats.available,  color:"#10b981" },
            { label:"Revenue",      value:`$${stats.revenue.toLocaleString()}`, color:"#f59e0b" },
            { label:"Inquiries",    value: stats.newInq,    color:"#3b82f6" },
            { label:"Pitched",      value: stats.pitched,   color:"#8b5cf6" },
            { label:"Placed",       value: stats.placed,    color:"#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-gray-200 p-4 bg-white">
              <p className="text-gray-900 font-black text-2xl tabular-nums">{value}</p>
              <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200">
          {[
            { key:"beats",    label:`Catalog (${beats.length})` },
            { key:"inquiries",label:`Inquiries (${inquiries.length})` },
            { key:"anr",      label:`A&R Pipeline (${pitches.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] uppercase transition-colors ${
                tab === key ? "border-b-2 border-amber-400 text-gray-900" : "text-gray-400 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "beats" ? (

            <motion.div key="beats" {...FADE(0)} className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    className="pl-8 pr-3 py-2 border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 w-48"
                    placeholder="Search beats…"
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select className="border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-amber-400"
                  value={filterGenre} onChange={e => setFilterGenre(e.target.value)}>
                  {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-amber-400"
                  value={filterSt} onChange={e => setFilterSt(e.target.value)}>
                  <option value="All">All Status</option>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {(search || filterGenre !== "All" || filterSt !== "All") && (
                  <button onClick={() => { setSearch(""); setFilterGenre("All"); setFilterSt("All"); }}
                    className="text-gray-400 hover:text-gray-700 text-xs underline transition-colors">Clear</button>
                )}
              </div>

              {/* Beat list */}
              <div className="border border-gray-200 bg-white">
                {/* Column header */}
                <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="w-2 flex-shrink-0" />
                  <span className="flex-1 text-gray-400 text-[10px] tracking-[0.15em] uppercase">Title</span>
                  <span className="text-gray-400 text-[10px] tracking-[0.15em] uppercase w-20 text-right">Price</span>
                  <span className="text-gray-400 text-[10px] tracking-[0.15em] uppercase w-28 hidden sm:block">Status</span>
                  <div className="w-12 flex-shrink-0" />
                </div>
                {filtered.length === 0
                  ? <p className="text-gray-300 text-sm p-8 text-center">No beats match your filters</p>
                  : filtered.map(b => (
                    <BeatRow key={b.id} beat={b}
                      onEdit={beat => setBeatModal(beat)}
                      onDelete={deleteBeat}
                    />
                  ))
                }
              </div>
            </motion.div>
          ) : tab === "inquiries" ? (
            <motion.div key="inquiries" {...FADE(0)}>
              <div className="border border-gray-200 bg-white">
                <div className="grid grid-cols-5 gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                  {["From","Beat","License","Date","Status"].map(h => (
                    <span key={h} className="text-gray-400 text-[10px] tracking-[0.15em] uppercase">{h}</span>
                  ))}
                </div>
                {inquiries.length === 0
                  ? <p className="text-gray-300 text-sm p-8 text-center">No inquiries yet</p>
                  : inquiries.map(inq => {
                    const st = INQUIRY_STATUS[inq.status] || INQUIRY_STATUS.new;
                    return (
                      <div key={inq.id}
                        className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
                        <p className="text-gray-800 text-xs font-medium truncate">{inq.from}</p>
                        <p className="text-gray-600 text-xs truncate">{inq.beatTitle}</p>
                        <p className="text-gray-500 text-[11px] truncate">{inq.license}</p>
                        <p className="text-gray-400 text-[11px]">{inq.date || "—"}</p>
                        <select
                          className="border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:border-amber-400"
                          style={{ color: st.color }}
                          value={inq.status}
                          onChange={e => updateInquiry(inq.id, { status: e.target.value })}>
                          {Object.entries(INQUIRY_STATUS).map(([k, v]) => (
                            <option key={k} value={k} style={{ color: v.color }}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                }
              </div>
            </motion.div>
          ) : (
            // ── A&R Pipeline tab ──────────────────────────────────────────
            <motion.div key="anr" {...FADE(0)} className="space-y-4">

              {/* Kanban-style status columns */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(PITCH_STATUS).map(([key, cfg]) => {
                  const group = pitches.filter(p => p.status === key);
                  return (
                    <div key={key} className="border border-gray-200 bg-white">
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-gray-900 text-sm font-black">{group.length}</span>
                      </div>
                      <div className="p-2 space-y-1.5 min-h-[60px]">
                        {group.map(p => (
                          <div key={p.id} className="border border-gray-100 p-2 hover:border-gray-200 transition-colors group">
                            <p className="text-gray-800 text-[11px] font-medium truncate">{p.beatTitle}</p>
                            <p className="text-gray-400 text-[10px] truncate">{p.contactName}</p>
                            {p.date && <p className="text-gray-300 text-[9px] mt-0.5">{p.date}</p>}
                          </div>
                        ))}
                        {group.length === 0 && <p className="text-gray-200 text-[10px] text-center py-2">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pitch table */}
              <div className="border border-gray-200 bg-white">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <span className="text-gray-500 text-[10px] tracking-[0.15em] uppercase font-bold">All Pitches</span>
                  <button onClick={() => setPitchModal(true)}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-[10px] transition-colors">
                    <Plus size={10} /> New Pitch
                  </button>
                </div>
                {pitches.length === 0
                  ? <p className="text-gray-300 text-sm p-8 text-center">No pitches logged yet. Click "Log Pitch" to start.</p>
                  : (
                    <div>
                      <div className="grid grid-cols-5 gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                        {["Beat","Artist","Date","Notes","Status"].map(h => (
                          <span key={h} className="text-gray-400 text-[10px] tracking-[0.12em] uppercase">{h}</span>
                        ))}
                      </div>
                      {pitches.map(p => {
                        const st = PITCH_STATUS[p.status] || PITCH_STATUS.sent;
                        return (
                          <div key={p.id}
                            className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors group">
                            <p className="text-gray-800 text-xs font-medium truncate">{p.beatTitle}</p>
                            <p className="text-gray-600 text-xs truncate">{p.contactName}</p>
                            <p className="text-gray-400 text-[11px]">{p.date || "—"}</p>
                            <p className="text-gray-500 text-[10px] truncate">{p.notes || "—"}</p>
                            <div className="flex items-center gap-2">
                              <select
                                className="border border-gray-200 px-2 py-1 text-[11px] focus:outline-none focus:border-amber-400 flex-1"
                                style={{ color: st.color }}
                                value={p.status}
                                onChange={e => updatePitch(p.id, { status: e.target.value })}>
                                {Object.entries(PITCH_STATUS).map(([k, v]) => (
                                  <option key={k} value={k} style={{ color: v.color }}>{v.label}</option>
                                ))}
                              </select>
                              <button onClick={() => deletePitch(p.id)}
                                className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>

              {/* Beat-level targeting */}
              <div className="border border-gray-200 bg-white">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <span className="text-gray-500 text-[10px] tracking-[0.15em] uppercase font-bold">Beat Targeting Overview</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {beats.filter(b => b.status === "available").map(b => {
                    const bPitches = pitches.filter(p => p.beatId === b.id || p.beatTitle === b.title);
                    return (
                      <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-xs font-medium">{b.title}</p>
                          <p className="text-gray-400 text-[10px]">{b.genre} · {b.bpm} BPM · {b.key}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {bPitches.length > 0 ? (
                            <div className="flex gap-1">
                              {bPitches.slice(0,3).map(p => {
                                const pc = PITCH_STATUS[p.status];
                                return (
                                  <span key={p.id} className="text-[9px] px-1.5 py-0.5 font-bold"
                                    style={{ color: pc?.color, background: (pc?.color || "#6b7280") + "18" }}>
                                    {p.contactName.split(" ")[0]}
                                  </span>
                                );
                              })}
                              {bPitches.length > 3 && <span className="text-[9px] text-gray-400">+{bPitches.length-3}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-[10px]">Not pitched</span>
                          )}
                          <button
                            onClick={() => { setPitchModal(true); }}
                            className="text-[9px] border border-dashed border-gray-300 text-gray-400 px-2 py-0.5 hover:border-purple-400 hover:text-purple-500 transition-colors">
                            + Pitch
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {beatModal !== null && (
          <BeatForm key="beat-form" initial={beatModal} onSave={saveBeat} onClose={() => setBeatModal(null)} />
        )}
        {inqModal && (
          <InquiryForm key="inq-form" beats={beats} onSave={saveInquiry} onClose={() => setInqModal(false)} />
        )}
        {pitchModal && (
          <PitchModal key="pitch-form" beats={beats} onSave={savePitch} onClose={() => setPitchModal(false)} />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
