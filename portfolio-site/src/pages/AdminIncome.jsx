/**
 * AdminIncome.jsx  →  /admin/income
 * Income & royalty tracker:
 * · Full catalog with real data from S3 ADMIN PDF
 * · Advances: owed vs received
 * · PRO registration status per song (MLC, BMI, SongTrust, Claim Master)
 * · Money owed pipeline
 * · Filter / search / edit inline
 * · Add manual income entries
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Music2, AlertCircle, CheckCircle2, Clock,
  ExternalLink, Search, Filter, X, Edit2, Save, Plus,
  ChevronDown, ChevronUp, TrendingUp, FileText, Circle,
  BarChart2, Layers,
} from "lucide-react";
import AdminShell       from "../components/admin/AdminShell";
import { CATALOG, LABELS } from "../data/catalogData";

const EASE = [0.22, 1, 0.36, 1];
const FADE = (d = 0) => ({ initial:{ opacity:0, y:12 }, animate:{ opacity:1, y:0 }, transition:{ duration:0.35, ease:EASE, delay:d } });

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  executed:     { label:"Executed",     color:"#10b981", bg:"#10b98118" },
  waiting:      { label:"Waiting",      color:"#f59e0b", bg:"#f59e0b18" },
  not_released: { label:"Not Released", color:"#6b7280", bg:"#6b728018" },
};

const ADVANCE_STATUS_CFG = {
  received: { label:"Received", color:"#10b981" },
  waiting:  { label:"Owed",     color:"#ef4444" },
  none:     { label:"—",        color:"#9ca3af" },
};

const PRO_FIELDS = [
  { key:"claimedPub",  label:"Pub Claimed" },
  { key:"mlc",         label:"MLC"         },
  { key:"bmi",         label:"BMI"         },
  { key:"songtrust",   label:"SongTrust"   },
  { key:"claimMaster", label:"Master"      },
];

const TOTAL_STREAMS_APPROX = 35000000; // ~30-40M as of 2026

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return n != null ? n.toLocaleString() : "—"; }
function fmtM(n) { if (!n) return "—"; return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toLocaleString(); }
function Badge({ yes }) {
  return yes
    ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100"><CheckCircle2 size={10} className="text-green-500" /></span>
    : <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100"><Circle size={10} className="text-gray-300" /></span>;
}

// ── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ song, onSave, onClose }) {
  const [f, setF] = useState({ ...song });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <motion.div {...FADE(0)}
      className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div
        className="bg-white border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        initial={{ scale:0.96, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.96, opacity:0 }} transition={{ duration:0.2 }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-gray-900 font-black text-sm">{f.title}</h2>
            <p className="text-gray-400 text-[10px] mt-0.5">{f.artist}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          {/* Streams */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Spotify Streams</label>
            <input type="number" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.streams ?? ""} onChange={e => set("streams", e.target.value ? Number(e.target.value) : null)} placeholder="0" />
          </div>

          {/* Label */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Label</label>
            <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.label} onChange={e => set("label", e.target.value)} />
          </div>

          {/* Publishing % */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Publishing %</label>
            <input type="number" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.publishingPct ?? ""} onChange={e => set("publishingPct", e.target.value ? Number(e.target.value) : null)} />
          </div>

          {/* Master % */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Master %</label>
            <input type="number" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.masterPct ?? ""} onChange={e => set("masterPct", e.target.value ? Number(e.target.value) : null)} />
          </div>

          {/* Advance */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Advance Amount ($)</label>
            <input type="number" className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.advance ?? ""} onChange={e => set("advance", e.target.value ? Number(e.target.value) : 0)} />
          </div>

          {/* Advance status */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Advance Status</label>
            <div className="flex gap-2">
              {["received","waiting","none"].map(s => (
                <button key={s} onClick={() => set("advanceStatus", s)}
                  className={`flex-1 py-2 border text-[11px] font-medium transition-all ${f.advanceStatus === s ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {s === "received" ? "Received" : s === "waiting" ? "Owed" : "None"}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Song Status</label>
            <select className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.status} onChange={e => set("status", e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Spotify link */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Spotify Link</label>
            <input className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
              value={f.spotifyLink} onChange={e => set("spotifyLink", e.target.value)} placeholder="https://open.spotify.com/..." />
          </div>

          {/* PRO fields — full row */}
          <div className="col-span-2">
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-2">PRO Registration Status</label>
            <div className="grid grid-cols-5 gap-2">
              {PRO_FIELDS.map(({ key, label }) => (
                <button key={key} onClick={() => set(key, !f[key])}
                  className={`flex flex-col items-center gap-1.5 p-2.5 border transition-all ${f[key] ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <Badge yes={f[key]} />
                  <span className="text-[10px] text-gray-600">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              value={f.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
          <button onClick={() => { onSave(f); onClose(); }}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 transition-colors">
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Money Owed Panel ──────────────────────────────────────────────────────────
function OwedPanel({ songs }) {
  const owed = songs.filter(s => s.advanceStatus === "waiting" && s.advance > 0)
    .sort((a, b) => b.advance - a.advance);
  const total = owed.reduce((sum, s) => sum + s.advance, 0);

  return (
    <div className="bg-red-50 border border-red-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={14} className="text-red-500" />
        <span className="text-red-700 text-xs font-black tracking-[0.15em] uppercase">Money Owed to You</span>
        <span className="ml-auto text-red-700 font-black text-sm tabular-nums">${total.toLocaleString()}</span>
      </div>
      {owed.length === 0
        ? <p className="text-red-400 text-xs">Nothing outstanding</p>
        : (
          <div className="space-y-2">
            {owed.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-red-800 text-xs font-medium truncate">{s.title}</p>
                  <p className="text-red-400 text-[10px]">{s.artist} · {s.label}</p>
                </div>
                <span className="text-red-700 text-sm font-black tabular-nums">${s.advance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── PRO Gap Panel ─────────────────────────────────────────────────────────────
function ProGapPanel({ songs }) {
  const executed = songs.filter(s => s.status === "executed");
  const gaps = executed.filter(s => !s.mlc || !s.bmi || !s.claimedPub);

  return (
    <div className="bg-amber-50 border border-amber-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={14} className="text-amber-500" />
        <span className="text-amber-700 text-xs font-black tracking-[0.15em] uppercase">PRO Registration Gaps</span>
        <span className="ml-auto text-amber-700 font-black text-sm">{gaps.length} songs</span>
      </div>
      {gaps.length === 0
        ? <p className="text-amber-500 text-xs">All executed songs are fully registered</p>
        : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {gaps.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 text-xs font-medium truncate">{s.title}</p>
                  <p className="text-amber-500 text-[10px]">{s.artist}</p>
                </div>
                <div className="flex gap-1">
                  {!s.claimedPub  && <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">Pub</span>}
                  {!s.mlc         && <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">MLC</span>}
                  {!s.bmi         && <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">BMI</span>}
                  {!s.songtrust   && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">ST</span>}
                  {!s.claimMaster && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Mstr</span>}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function InlineNum({ value, onCommit, prefix = "", placeholder = "—", className = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const inputRef = useRef(null);

  function startEdit() {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  function commit() {
    const n = draft.trim() === "" ? null : Number(draft.replace(/[^0-9.]/g, ""));
    onCommit(isNaN(n) ? null : n);
    setEditing(false);
  }

  function onKey(e) {
    if (e.key === "Enter")  { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="w-24 border-b border-amber-400 bg-amber-50 text-gray-900 text-xs px-1 py-0.5 focus:outline-none tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      className={`text-left group/cell flex items-center gap-1 hover:text-amber-600 transition-colors cursor-text ${className}`}
    >
      {value != null
        ? <span className="tabular-nums font-medium">{prefix}{fmtM(value)}</span>
        : <span className="text-gray-200">{placeholder}</span>
      }
      <Edit2 size={9} className="opacity-0 group-hover/cell:opacity-60 text-amber-400 flex-shrink-0 transition-opacity" />
    </button>
  );
}

// ── Song row ──────────────────────────────────────────────────────────────────
function SongRow({ song, onEdit, onUpdate }) {
  const st  = STATUS_CFG[song.status]         || STATUS_CFG.executed;
  const adv = ADVANCE_STATUS_CFG[song.advanceStatus] || ADVANCE_STATUS_CFG.none;

  return (
    <motion.tr layout className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
      {/* Song info */}
      <td className="px-4 py-3 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.color }} />
          <div className="min-w-0">
            <p className="text-gray-900 text-xs font-medium truncate max-w-[160px]">{song.title}</p>
            <p className="text-gray-400 text-[10px] truncate">{song.artist}</p>
          </div>
        </div>
      </td>

      {/* Year */}
      <td className="px-3 py-3 text-gray-400 text-xs tabular-nums whitespace-nowrap">{song.year || "—"}</td>

      {/* Streams — inline editable */}
      <td className="px-3 py-3 text-gray-700 text-xs whitespace-nowrap">
        <InlineNum
          value={song.streams}
          onCommit={v => onUpdate({ ...song, streams: v })}
          placeholder="—"
        />
      </td>

      {/* Splits */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-[10px] text-gray-600">
          {song.publishingPct != null ? <span>{song.publishingPct}% pub</span> : <span className="text-gray-200">—</span>}
          {song.masterPct     != null ? <span className="text-gray-400"> · {song.masterPct}% mstr</span> : null}
        </div>
      </td>

      {/* Label */}
      <td className="px-3 py-3 text-gray-500 text-[11px] whitespace-nowrap">{song.label || "—"}</td>

      {/* Advance — inline editable amount + status toggle */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <InlineNum
            value={song.advance > 0 ? song.advance : null}
            onCommit={v => onUpdate({ ...song, advance: v ?? 0 })}
            prefix="$"
            placeholder="—"
            className="text-gray-900"
          />
          {song.advance > 0 && (
            <button
              title="Toggle advance status"
              onClick={() => {
                const next = song.advanceStatus === "received" ? "waiting"
                           : song.advanceStatus === "waiting"  ? "none"
                           : "received";
                onUpdate({ ...song, advanceStatus: next });
              }}
              className="text-[9px] font-bold px-1.5 py-0.5 transition-colors hover:opacity-70 flex-shrink-0"
              style={{ color: adv.color, background: adv.color + "18" }}>
              {adv.label}
            </button>
          )}
        </div>
      </td>

      {/* PRO badges */}
      <td className="px-3 py-3">
        <div className="flex gap-1">
          {PRO_FIELDS.map(({ key }) => <Badge key={key} yes={song[key]} />)}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-[10px] font-bold px-2 py-0.5" style={{ color: st.color, background: st.bg }}>
          {st.label}
        </span>
      </td>

      {/* Link + Edit */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {song.spotifyLink && (
            <a href={song.spotifyLink} target="_blank" rel="noreferrer"
              className="text-gray-300 hover:text-green-500 transition-colors">
              <ExternalLink size={12} />
            </a>
          )}
          <button onClick={() => onEdit(song)} className="text-gray-300 hover:text-gray-700 transition-colors">
            <Edit2 size={12} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

const LS_INCOME = "s3_income_songs_v1";

function loadSongs() {
  try {
    const saved = localStorage.getItem(LS_INCOME);
    if (!saved) return CATALOG;
    const savedMap = JSON.parse(saved); // { id: overrides }
    return CATALOG.map(s => savedMap[s.id] ? { ...s, ...savedMap[s.id] } : s);
  } catch { return CATALOG; }
}

function saveSongs(songs) {
  try {
    const overrides = {};
    songs.forEach(s => {
      const orig = CATALOG.find(c => c.id === s.id);
      if (!orig) return;
      const diff = {};
      Object.keys(s).forEach(k => { if (s[k] !== orig[k]) diff[k] = s[k]; });
      if (Object.keys(diff).length) overrides[s.id] = diff;
    });
    localStorage.setItem(LS_INCOME, JSON.stringify(overrides));
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminIncome() {
  const [songs,     setSongs]     = useState(loadSongs);
  const [editing,   setEditing]   = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterSt,  setFilterSt]  = useState("all");
  const [filterLbl, setFilterLbl] = useState("all");
  const [filterAdv, setFilterAdv] = useState("all");
  const [sortKey,   setSortKey]   = useState("streams");
  const [sortDir,   setSortDir]   = useState("desc");
  const [tab,       setTab]       = useState("catalog"); // catalog | owed | pro

  function updateSong(updated) {
    setSongs(p => {
      const next = p.map(s => s.id === updated.id ? updated : s);
      saveSongs(next);
      return next;
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const executed  = songs.filter(s => s.status === "executed");
    const owed      = songs.filter(s => s.advanceStatus === "waiting" && s.advance > 0);
    const received  = songs.filter(s => s.advanceStatus === "received" && s.advance > 0);
    const totalOwed = owed.reduce((s, x) => s + x.advance, 0);
    const totalRcvd = received.reduce((s, x) => s + x.advance, 0);
    const proGaps   = executed.filter(s => !s.mlc || !s.bmi || !s.claimedPub).length;
    return { executed: executed.length, owed: totalOwed, received: totalRcvd, proGaps };
  }, [songs]);

  // ── Sort + filter ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = songs.filter(s => {
      const q = search.toLowerCase();
      if (q && !s.title.toLowerCase().includes(q) && !s.artist.toLowerCase().includes(q)) return false;
      if (filterSt  !== "all" && s.status !== filterSt)                  return false;
      if (filterLbl !== "all" && s.label  !== filterLbl)                 return false;
      if (filterAdv === "owed"     && s.advanceStatus !== "waiting")     return false;
      if (filterAdv === "received" && s.advanceStatus !== "received")    return false;
      return true;
    });

    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = sortDir === "asc" ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === "asc" ? Infinity : -Infinity;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [songs, search, filterSt, filterLbl, filterAdv, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  const TH = ({ k, children, className = "" }) => (
    <th className={`px-3 py-2.5 text-left text-[10px] tracking-[0.12em] text-gray-400 uppercase font-bold cursor-pointer hover:text-gray-700 select-none whitespace-nowrap transition-colors ${className}`}
      onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{children}<SortIcon k={k} /></span>
    </th>
  );

  return (
    <AdminShell>
      <div className="p-6 space-y-5 max-w-screen-xl">

        {/* Header */}
        <motion.div {...FADE(0)} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-gray-900 font-black text-lg tracking-tight">Income & Catalog</h1>
            <p className="text-gray-400 text-xs mt-0.5">{songs.length} songs · ~{(TOTAL_STREAMS_APPROX / 1000000).toFixed(0)}M streams total</p>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div {...FADE(0.05)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:"Executed Songs",  value: stats.executed,                           color:"#10b981", Icon: Music2      },
            { label:"Advance Received", value:`$${stats.received.toLocaleString()}`,    color:"#10b981", Icon: CheckCircle2 },
            { label:"Owed to You",     value:`$${stats.owed.toLocaleString()}`,         color:"#ef4444", Icon: AlertCircle  },
            { label:"PRO Gaps",        value: stats.proGaps + " songs",                 color:"#f59e0b", Icon: FileText     },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color }} />
                <span className="text-gray-400 text-[10px] tracking-[0.15em] uppercase">{label}</span>
              </div>
              <p className="text-gray-900 font-black text-xl tabular-nums">{value}</p>
            </div>
          ))}
        </motion.div>

        {/* Alert panels */}
        <motion.div {...FADE(0.1)} className="grid md:grid-cols-2 gap-4">
          <OwedPanel songs={songs} />
          <ProGapPanel songs={songs} />
        </motion.div>

        {/* Filters */}
        <motion.div {...FADE(0.15)} className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input className="pl-8 pr-3 py-2 border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 w-48"
              placeholder="Search songs…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <select className="border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-amber-400"
            value={filterSt} onChange={e => setFilterSt(e.target.value)}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select className="border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-amber-400"
            value={filterLbl} onChange={e => setFilterLbl(e.target.value)}>
            <option value="all">All Labels</option>
            {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select className="border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-amber-400"
            value={filterAdv} onChange={e => setFilterAdv(e.target.value)}>
            <option value="all">All Advances</option>
            <option value="owed">Owed only</option>
            <option value="received">Received only</option>
          </select>

          {(search || filterSt !== "all" || filterLbl !== "all" || filterAdv !== "all") && (
            <button onClick={() => { setSearch(""); setFilterSt("all"); setFilterLbl("all"); setFilterAdv("all"); }}
              className="text-gray-400 hover:text-gray-700 text-xs underline transition-colors">Clear</button>
          )}

          <span className="ml-auto text-gray-400 text-[11px]">{filtered.length} of {songs.length}</span>
        </motion.div>

        {/* Table */}
        <motion.div {...FADE(0.2)} className="border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <TH k="title"    className="pl-4">Song</TH>
                <TH k="year">Year</TH>
                <TH k="streams">Streams</TH>
                <th className="px-3 py-2.5 text-left text-[10px] tracking-[0.12em] text-gray-400 uppercase font-bold">Splits</th>
                <TH k="label">Label</TH>
                <TH k="advance">Advance</TH>
                <th className="px-3 py-2.5 text-left text-[10px] tracking-[0.12em] text-gray-400 uppercase font-bold">
                  <span className="flex items-center gap-1">
                    PRO
                    <span className="text-[8px] text-gray-300 font-normal">Pub·MLC·BMI·ST·Mstr</span>
                  </span>
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] tracking-[0.12em] text-gray-400 uppercase font-bold">Status</th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <SongRow key={s.id} song={s} onEdit={setEditing} onUpdate={updateSong} />
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-gray-300 text-sm">No songs match your filters</p>
            </div>
          )}
        </motion.div>

        {/* Legend */}
        <motion.div {...FADE(0.25)} className="flex items-center gap-4 text-[10px] text-gray-400">
          <span className="font-bold">PRO legend:</span>
          {["Pub Claimed","MLC","BMI","SongTrust","Master"].map((l, i) => (
            <span key={i}>{i + 1}={l}</span>
          ))}
        </motion.div>

      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <EditPanel key={editing.id} song={editing} onSave={updateSong} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
