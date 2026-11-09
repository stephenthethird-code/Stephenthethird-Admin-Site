/**
 * AdminTracks.jsx  →  /admin/tracks
 *
 * Full beat library manager:
 *  • Searchable / filterable list (name, BPM, key, genre, collab)
 *  • Click any row to open a full edit panel
 *  • Edit: name, BPM, key, genre, collaborators, notes, inner circle flag
 *  • Cover art: file-picker + drag-drop upload
 *  • Add new track via "+ New Track" button
 *  • Batch select → bulk tag (genre, inner_circle)
 *  • API-first (Flask localhost:5050), graceful fallback to sampleBeats
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { withToken } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, Plus, Star, Upload,
  X, Check, Edit3, Trash2, ChevronDown,
  Music2, Image as ImageIcon, Save, RotateCcw,
  CheckSquare, Square, Tag, HardDrive, Cloud,
  FolderOpen, FolderInput, ChevronRight, File,
  Loader2, CheckCircle2, AlertCircle, Zap,
} from "lucide-react";
import AdminShell  from "../components/admin/AdminShell";
import sampleBeats from "../data/sampleBeats";

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type: "spring", stiffness: 300, damping: 30 };
const API    = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const KEY_OPTIONS  = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const KEY_MODES    = ["Major","Minor","Dorian","Mixolydian"];
const GENRE_OPTIONS = [
  "Hip-Hop","Trap","R&B","Pop","Drill","Afrobeats","Dancehall","Lo-fi",
  "Alternative","Indie","Soul","Electronic","House","Ambient","Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiGetTracks() {
  const r = await fetch(`${API}/api/tracks`, { signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new Error("non-200");
  return r.json();
}

async function apiUpdateTrack(id, data) {
  const r = await fetch(`${API}/api/tracks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("update failed");
  return r.json();
}

async function apiCreateTrack(data) {
  const r = await fetch(`${API}/api/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("create failed");
  return r.json();
}

async function apiUploadCover(trackId, file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entity_type", "track");
  if (trackId) fd.append("entity_id", trackId);
  const r = await fetch(`${API}/api/upload/image`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("upload failed");
  return r.json();
}

// ── Cover art uploader ────────────────────────────────────────────────────────
function CoverUploader({ current, onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [preview,  setPreview]  = useState(current || null);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload(file, url);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      className={`relative w-full aspect-square border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-all overflow-hidden ${
        dragging ? "border-amber-400 bg-amber-400/5" : "border-gray-200 hover:border-amber-400/40 bg-gray-50"
      }`}
    >
      {preview ? (
        <>
          <img src={preview} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload size={20} className="text-gray-900" />
            <span className="text-gray-900 text-xs ml-2">Replace</span>
          </div>
        </>
      ) : (
        <>
          <ImageIcon size={24} className={dragging ? "text-amber-400" : "text-gray-300"} />
          <p className="text-gray-500 text-xs mt-2 text-center px-4">
            {dragging ? "Drop to upload" : "Click or drag cover art"}
          </p>
          <p className="text-gray-300 text-[10px] mt-1">PNG, JPG, WEBP · max 25MB</p>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="text-gray-400 text-[10px] tracking-[0.2em] uppercase block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";
const selectCls = inputCls + " appearance-none cursor-pointer";

// ── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ track, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({
    name:         track.name         ?? "",
    bpm:          track.bpm          ?? "",
    key_sig:      track.key_sig      ?? track.key ?? "",
    genre:        track.genre        ?? "",
    collaborators:track.collaborators?? "",
    notes:        track.notes        ?? "",
    inner_circle: track.inner_circle ?? 0,
    featured:     track.featured     ?? 0,
    cover_art:    track.cover_art    ?? track.cover ?? null,
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSavedState]  = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    try {
      let coverUrl = form.cover_art;
      if (pendingFile) {
        try {
          const res = await apiUploadCover(track.id, pendingFile);
          coverUrl = res.url;
        } catch {
          // keep local preview URL if API unavailable
        }
      }
      const payload = { ...form, cover_art: coverUrl, bpm: form.bpm ? Number(form.bpm) : null };
      try {
        await apiUpdateTrack(track.id, payload);
      } catch {
        // silent — local state update still proceeds
      }
      onSave({ ...track, ...payload });
      setSavedState(true);
      setTimeout(() => setSavedState(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      key="editpanel"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0,  opacity: 1 }}
      exit={{    x: 40, opacity: 0 }}
      transition={SPRING}
      className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <p className="text-gray-500 text-xs font-medium truncate flex-1 mr-2">
          <Edit3 size={11} className="inline mr-1.5 text-amber-400" />
          {form.name || "Untitled"}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Cover art */}
        <Field label="Cover Art">
          <CoverUploader
            current={form.cover_art}
            onUpload={(file, preview) => {
              setPendingFile(file);
              set("cover_art", preview);
            }}
          />
        </Field>

        {/* Name */}
        <Field label="Track Name">
          <input className={inputCls} value={form.name}
            onChange={e => set("name", e.target.value)} placeholder="untitled" />
        </Field>

        {/* BPM + Key */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="BPM">
            <input className={inputCls} type="number" min="40" max="300"
              value={form.bpm} onChange={e => set("bpm", e.target.value)} placeholder="120" />
          </Field>
          <Field label="Key">
            <select className={selectCls} value={form.key_sig}
              onChange={e => set("key_sig", e.target.value)}>
              <option value="">—</option>
              {KEY_OPTIONS.flatMap(k => KEY_MODES.map(m => (
                <option key={`${k}${m}`} value={`${k} ${m}`}>{k} {m}</option>
              )))}
            </select>
          </Field>
        </div>

        {/* Genre */}
        <Field label="Genre">
          <select className={selectCls} value={form.genre}
            onChange={e => set("genre", e.target.value)}>
            <option value="">— Select —</option>
            {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>

        {/* Collaborators */}
        <Field label="Collaborators">
          <input className={inputCls} value={form.collaborators}
            onChange={e => set("collaborators", e.target.value)}
            placeholder="e.g. Joony, Kaycyy" />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea className={inputCls + " resize-none"} rows={3}
            value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Recorded at studio, needs mastering…" />
        </Field>

        {/* Flags */}
        <div className="space-y-2">
          {[
            { key: "inner_circle", label: "Inner Circle", color: "text-amber-400" },
            { key: "featured",     label: "Featured",     color: "text-blue-400"  },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => set(key, form[key] ? 0 : 1)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 border transition-all ${
                form[key]
                  ? "border-amber-400/30 bg-amber-400/5"
                  : "border-gray-200 hover:border-gray-200"
              }`}>
              {form[key]
                ? <Star size={13} className="text-amber-400 fill-amber-400" />
                : <Star size={13} className="text-gray-300" />}
              <span className={`text-sm ${form[key] ? color : "text-gray-400"}`}>{label}</span>
              {form[key] && <Check size={11} className="ml-auto text-amber-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-400 hover:text-black transition-colors disabled:opacity-50">
          {saving ? <RotateCcw size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
        <button onClick={() => onDelete(track.id)}
          className="px-3 py-2.5 border border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ── New track modal ───────────────────────────────────────────────────────────
function NewTrackModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: "", bpm: "", key_sig: "", genre: "", collaborators: "" });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    const payload = { ...form, bpm: form.bpm ? Number(form.bpm) : null, inner_circle: 0, featured: 0 };
    try { await apiCreateTrack(payload); } catch {}
    onSave({ ...payload, id: Date.now() });
    onClose();
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale:0.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95 }}
        transition={SPRING}
        className="w-full max-w-sm bg-white border border-gray-200 p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-gray-900 text-sm font-medium">New Track</p>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900"><X size={15} /></button>
        </div>
        <div className="space-y-4">
          <Field label="Track Name">
            <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="untitled" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="BPM">
              <input className={inputCls} type="number" value={form.bpm}
                onChange={e => set("bpm", e.target.value)} placeholder="120" />
            </Field>
            <Field label="Key">
              <select className={selectCls} value={form.key_sig} onChange={e => set("key_sig", e.target.value)}>
                <option value="">—</option>
                {KEY_OPTIONS.flatMap(k => KEY_MODES.map(m => (
                  <option key={`${k}${m}`} value={`${k} ${m}`}>{k} {m}</option>
                )))}
              </select>
            </Field>
          </div>
          <Field label="Genre">
            <select className={selectCls} value={form.genre} onChange={e => set("genre", e.target.value)}>
              <option value="">— Select —</option>
              {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Collaborators">
            <input className={inputCls} value={form.collaborators}
              onChange={e => set("collaborators", e.target.value)} placeholder="Joony, Kaycyy…" />
          </Field>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={submit}
            className="flex-1 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-400 hover:text-black transition-colors">
            Create
          </button>
          <button onClick={onClose}
            className="px-4 border border-gray-200 text-gray-400 hover:text-gray-900 text-xs transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Batch tag bar ─────────────────────────────────────────────────────────────
function BatchBar({ selected, onClear, onTag }) {
  const [genre, setGenre] = useState("");
  const [ic,    setIc]    = useState(false);

  return (
    <motion.div initial={{ y: 60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:60, opacity:0 }}
      transition={SPRING}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white border border-gray-200 px-5 py-3 z-40 shadow-2xl">
      <span className="text-amber-400 text-xs font-black tabular-nums">{selected.length}</span>
      <span className="text-gray-400 text-xs">selected</span>
      <div className="w-px h-4 bg-gray-100" />
      <select value={genre} onChange={e => setGenre(e.target.value)}
        className="bg-gray-100 border border-gray-200 text-gray-600 text-xs px-2 py-1 focus:outline-none">
        <option value="">Set genre…</option>
        {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={ic} onChange={e => setIc(e.target.checked)}
          className="accent-amber-400" />
        <span className="text-gray-400 text-xs">Inner Circle</span>
      </label>
      <button onClick={() => onTag({ genre: genre || undefined, inner_circle: ic ? 1 : undefined })}
        className="flex items-center gap-1.5 bg-amber-400 text-black text-[10px] font-black tracking-widest uppercase px-4 py-1.5 hover:bg-amber-300 transition-colors">
        <Tag size={10} /> Apply
      </button>
      <button onClick={onClear} className="text-gray-400 hover:text-gray-900 transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  VIRTUAL EXPLORER — Source toggle + Cloud browser + Batch uploader
// ══════════════════════════════════════════════════════════════════════════════

const SOURCES = [
  { id: "local",    label: "Local",    Icon: HardDrive,   color: "#6b7280" },
  { id: "dropbox",  label: "Dropbox",  Icon: Cloud,       color: "#0061ff" },
  { id: "drive",    label: "Drive",    Icon: Cloud,       color: "#10b981" },
  { id: "upload",   label: "Upload",   Icon: FolderInput, color: "#f59e0b" },
];

const AUDIO_EXTS = new Set([".mp3",".wav",".aiff",".aif",".flac",".m4a",".ogg"]);

// ── Source toggle bar ─────────────────────────────────────────────────────────
function SourceToggle({ active, onChange }) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-6 flex-shrink-0">
      {SOURCES.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase border-b-2 transition-all ${
            active === s.id
              ? "border-amber-400 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}>
          <s.Icon size={11} style={active === s.id ? { color: s.color } : {}} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Cloud file browser (Dropbox & Drive) ──────────────────────────────────────
function CloudBrowser({ source, onImport }) {
  const endpoint = source === "dropbox"
    ? `${API}/api/cloud/dropbox/browse`
    : `${API}/api/cloud/gdrive/browse`;
  const authUrl  = source === "dropbox"
    ? withToken(`${API}/api/cloud/dropbox/auth`)
    : withToken(`${API}/api/cloud/gdrive/auth`);

  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [path,     setPath]     = useState(source === "dropbox" ? "" : "root");
  const [crumbs,   setCrumbs]   = useState([{ name: "Root", path: source === "dropbox" ? "" : "root" }]);
  const [playing,  setPlaying]  = useState(null);
  const audioRef = useRef(null);

  useEffect(() => { loadFiles(path); }, [path, source]);

  async function loadFiles(p) {
    setLoading(true); setError(null);
    try {
      const param = source === "dropbox" ? `path=${encodeURIComponent(p)}` : `folderId=${p}`;
      const r = await fetch(`${endpoint}?${param}`);
      const d = await r.json();
      if (!r.ok) {
        if (d.auth_url) setError({ type: "auth", url: d.auth_url });
        else setError({ type: "err", msg: d.error || "Failed to load" });
        return;
      }
      setFiles(d);
    } catch {
      setError({ type: "err", msg: "Backend offline — start Flask on port 5050" });
    } finally { setLoading(false); }
  }

  function openFolder(file) {
    const next = source === "dropbox" ? file.path || path + "/" + file.name : file.id;
    setCrumbs(c => [...c, { name: file.name, path: next }]);
    setPath(next);
  }

  function navCrumb(idx) {
    const crumb = crumbs[idx];
    setCrumbs(c => c.slice(0, idx + 1));
    setPath(crumb.path);
  }

  async function playFile(file) {
    if (playing === file.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    try {
      const param = source === "dropbox" ? `path=${encodeURIComponent(file.path || "")}` : `fileId=${file.id}`;
      const r = await fetch(`${API}/api/cloud/${source === "dropbox" ? "dropbox" : "gdrive"}/stream?${param}`);
      const d = await r.json();
      if (d.url && audioRef.current) {
        audioRef.current.src = d.url;
        audioRef.current.play();
        setPlaying(file.id);
      }
    } catch {}
  }

  const isAudio = f => {
    const ext = "." + (f.name || "").split(".").pop().toLowerCase();
    return AUDIO_EXTS.has(ext);
  };

  if (error?.type === "auth") return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Cloud size={32} className="text-gray-200" />
      <p className="text-gray-500 text-sm font-medium capitalize">{source} not connected</p>
      <a href={error.url} target="_blank" rel="noreferrer"
        className="bg-gray-900 text-white text-xs px-5 py-2.5 hover:bg-amber-500 transition-colors">
        Connect {source === "dropbox" ? "Dropbox" : "Google Drive"} →
      </a>
    </div>
  );

  if (error?.type === "err") return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle size={24} className="text-gray-300" />
      <p className="text-gray-400 text-sm">{error.msg}</p>
      <button onClick={() => loadFiles(path)} className="text-xs text-amber-500 underline">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ChevronRight size={10} className="text-gray-300" />}
            <button onClick={() => navCrumb(i)}
              className={`text-xs transition-colors ${i === crumbs.length - 1 ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-700"}`}>
              {c.name}
            </button>
          </span>
        ))}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        )}
        {!loading && files.length === 0 && (
          <div className="text-center py-20">
            <FolderOpen size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Empty folder</p>
          </div>
        )}
        {!loading && files.map(f => {
          const audio = isAudio(f);
          const isPlaying = playing === f.id;
          return (
            <div key={f.id || f.name}
              className="flex items-center gap-3 px-6 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 flex-shrink-0">
                {f.type === "folder"
                  ? <FolderOpen size={14} className="text-amber-400" />
                  : <Music2 size={14} className={audio ? "text-gray-600" : "text-gray-300"} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm truncate">{f.name}</p>
                {f.size > 0 && (
                  <p className="text-gray-400 text-[10px]">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                )}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {f.type === "folder" && (
                  <button onClick={() => openFolder(f)}
                    className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 border border-gray-200 hover:border-gray-300 transition-colors">
                    Open
                  </button>
                )}
                {audio && (
                  <button onClick={() => playFile(f)}
                    className={`text-xs px-2 py-1 border transition-colors ${
                      isPlaying ? "border-amber-400 text-amber-500" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {isPlaying ? "■ Stop" : "▶ Preview"}
                  </button>
                )}
                {audio && (
                  <button onClick={() => onImport(f, source)}
                    className="text-xs bg-gray-900 text-white px-2 py-1 hover:bg-amber-500 transition-colors">
                    Import
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
    </div>
  );
}

// ── Batch uploader ────────────────────────────────────────────────────────────
function BatchUploader({ onComplete }) {
  const [dragging,  setDragging]  = useState(false);
  const [project,   setProject]   = useState("");
  const [files,     setFiles]     = useState([]);   // {file, status, result}
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  function addFiles(incoming) {
    const audio = Array.from(incoming).filter(f => {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      return AUDIO_EXTS.has(ext);
    });
    setFiles(prev => [
      ...prev,
      ...audio.filter(a => !prev.find(p => p.file.name === a.name))
              .map(f => ({ file: f, status: "queued", result: null }))
    ]);
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.file.name !== name));
  }

  async function handleUpload() {
    if (!files.length || uploading) return;
    setUploading(true);

    // Upload in batches of 5
    const BATCH = 5;
    const updated = [...files];

    for (let i = 0; i < updated.length; i += BATCH) {
      const batch = updated.slice(i, i + BATCH);
      const fd = new FormData();
      batch.forEach(f => fd.append("files", f.file));
      fd.append("project_title", project || "Uploaded");
      fd.append("auto_analyze", "true");

      // Mark batch as uploading
      batch.forEach((_, j) => { updated[i + j] = { ...updated[i + j], status: "uploading" }; });
      setFiles([...updated]);

      try {
        const r = await fetch(`${API}/api/upload/batch`, { method: "POST", body: fd });
        const d = await r.json();
        const saved = d.files || [];
        batch.forEach((_, j) => {
          updated[i + j] = {
            ...updated[i + j],
            status: saved[j]?.status === "saved" ? "done" : "error",
            result: saved[j] || null,
          };
        });
      } catch {
        batch.forEach((_, j) => { updated[i + j] = { ...updated[i + j], status: "error" }; });
      }
      setFiles([...updated]);
    }

    setUploading(false);
    const saved = updated.filter(f => f.status === "done").map(f => f.result).filter(Boolean);
    if (saved.length && onComplete) onComplete(saved);
  }

  const doneCount  = files.filter(f => f.status === "done").length;
  const errorCount = files.filter(f => f.status === "error").length;

  const StatusIcon = ({ status }) => {
    if (status === "done")      return <CheckCircle2 size={12} className="text-green-500" />;
    if (status === "uploading") return <Loader2 size={12} className="animate-spin text-amber-400" />;
    if (status === "error")     return <AlertCircle size={12} className="text-red-400" />;
    return <div className="w-3 h-3 rounded-full border border-gray-200" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">

      {/* Project assignment */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1.5">
            Assign to Project (optional)
          </label>
          <input
            className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
            placeholder="e.g. Don Toliver Collab, Kaycyy EP…"
            value={project}
            onChange={e => setProject(e.target.value)}
          />
        </div>
        {files.length > 0 && (
          <button onClick={handleUpload} disabled={uploading}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-xs font-bold hover:bg-amber-500 disabled:opacity-40 transition-colors self-end">
            {uploading
              ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
              : <><Upload size={12} /> Upload {files.length} file{files.length !== 1 ? "s" : ""}</>
            }
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-10 transition-all ${
          dragging ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300 bg-gray-50"
        }`}>
        <FolderInput size={28} className={dragging ? "text-amber-400" : "text-gray-300"} />
        <p className="text-gray-500 text-sm mt-3 font-medium">
          {dragging ? "Drop to add" : "Drag & drop audio files here"}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          MP3, WAV, AIFF, FLAC, M4A · 100+ files at once supported
        </p>
        <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
          <Zap size={10} /> Auto-tags BPM, key, genre, and instruments on upload
        </p>
        <input ref={inputRef} type="file" multiple accept="audio/*" className="hidden"
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="flex-1 overflow-y-auto border border-gray-200 bg-white">
          {/* Summary bar */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50 text-[10px] text-gray-500">
            <span>{files.length} files queued</span>
            {doneCount  > 0 && <span className="text-green-500">{doneCount} uploaded</span>}
            {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
            {uploading && (
              <span className="text-amber-500">
                {files.filter(f=>f.status==="uploading").length} uploading…
              </span>
            )}
            <button onClick={() => setFiles([])}
              className="ml-auto text-gray-300 hover:text-gray-600 transition-colors">
              Clear all
            </button>
          </div>
          {files.map(({ file, status, result }) => (
            <div key={file.name}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 group">
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-xs truncate">{file.name}</p>
                {result && (
                  <p className="text-gray-400 text-[10px]">
                    {[result.bpm && `${result.bpm} BPM`, result.key, result.genre]
                      .filter(Boolean).join(" · ")}
                    {result.analysis === "queued" &&
                      <span className="text-amber-400 ml-1">· analyzing…</span>}
                  </p>
                )}
              </div>
              <span className="text-gray-300 text-[10px] flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {status === "queued" && (
                <button onClick={() => removeFile(file.name)}
                  className="opacity-0 group-hover:opacity-100 text-gray-200 hover:text-red-400 transition-all">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminTracks() {
  const [tracks,   setTracks]   = useState(sampleBeats);
  const [loading,  setLoading]  = useState(true);
  const [isLive,   setIsLive]   = useState(false);
  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState(null); // editing track
  const [checked,  setChecked]  = useState([]);   // batch selection
  const [showNew,  setShowNew]  = useState(false);
  const [filter,   setFilter]   = useState({ genre: "", innerCircle: false });
  const [sortBy,   setSortBy]   = useState("id"); // id | bpm | name

  // Load from API
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGetTracks();
        if (Array.isArray(data) && data.length > 0) {
          setTracks(data);
          setIsLive(true);
        }
      } catch { /* fallback to sampleBeats */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Filtered + sorted list
  const visible = useMemo(() => {
    let arr = tracks.filter(t => {
      if (filter.innerCircle && !t.inner_circle) return false;
      if (filter.genre && t.genre !== filter.genre) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (t.name         ?? "").toLowerCase().includes(q) ||
        (t.collaborators?? "").toLowerCase().includes(q) ||
        (t.genre        ?? "").toLowerCase().includes(q) ||
        String(t.bpm ?? "").includes(q)
      );
    });
    if (sortBy === "bpm")  arr = [...arr].sort((a,b) => (b.bpm ?? 0) - (a.bpm ?? 0));
    if (sortBy === "name") arr = [...arr].sort((a,b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return arr;
  }, [tracks, query, filter, sortBy]);

  function handleSave(updated) {
    setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (selected?.id === updated.id) setSelected(updated);
  }

  function handleDelete(id) {
    setTracks(prev => prev.filter(t => t.id !== id));
    setSelected(null);
  }

  function handleNew(track) {
    setTracks(prev => [track, ...prev]);
  }

  function toggleCheck(id) {
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleBatchTag(updates) {
    setTracks(prev => prev.map(t =>
      checked.includes(t.id) ? { ...t, ...updates } : t
    ));
    // Also attempt API batch update
    fetch(`${API}/api/tracks/batch-tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_ids: checked, updates }),
    }).catch(() => {});
    setChecked([]);
  }

  const allChecked = visible.length > 0 && visible.every(t => checked.includes(t.id));

  // ── Source state (Virtual Explorer) ──────────────────────────────────────────
  const [source, setSource] = useState("local");

  function handleCloudImport(file, src) {
    const newTrack = {
      id:           Date.now(),
      name:         file.name.replace(/\.[^.]+$/, ""),
      bpm:          null,
      key_sig:      "",
      genre:        "",
      collaborators:"",
      notes:        `Imported from ${src === "dropbox" ? "Dropbox" : "Google Drive"}`,
      inner_circle: 0,
      featured:     0,
      cover_art:    null,
      source:       src,
      cloud_path:   file.path || file.id || "",
    };
    setTracks(prev => [newTrack, ...prev]);
    setSource("local");   // switch back so they can see + edit the newly-imported track
    setSelected(newTrack);
  }

  function handleBatchComplete(savedFiles) {
    const newTracks = savedFiles.map(f => ({
      id:           f.id ?? Date.now() + Math.random(),
      name:         f.name ?? f.filename?.replace(/\.[^.]+$/, "") ?? "Untitled",
      bpm:          f.bpm  ?? null,
      key_sig:      f.key  ?? "",
      genre:        f.genre ?? "",
      collaborators:"",
      notes:        f.project_title ? `Uploaded · ${f.project_title}` : "Uploaded",
      inner_circle: 0,
      featured:     0,
      cover_art:    null,
      source:       "upload",
    }));
    setTracks(prev => [...newTracks, ...prev]);
    setSource("local");
  }

  return (
    <AdminShell>
      <div className="flex h-full overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>

        {/* Left: track list */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 bg-white">
            <div className="flex-1">
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">Tracks</p>
              <h2 className="text-gray-900 font-black text-xl" style={{ letterSpacing:"-0.02em" }}>
                Beat Library
                <span className="text-gray-400 font-normal text-sm ml-2 tabular-nums">
                  {visible.length}/{tracks.length}
                  {isLive && <span className="text-green-400 ml-1.5 text-[9px]">● LIVE</span>}
                </span>
              </h2>
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-400 hover:text-black transition-colors flex-shrink-0">
              <Plus size={12} /> New Track
            </button>
          </div>

          {/* Source toggle */}
          <SourceToggle active={source} onChange={setSource} />

          {/* Local library view */}
          {source === "local" && (
            <>
              {/* Search + filters */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 bg-gray-50">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search tracks, collabs, BPM…"
                    className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm pl-8 pr-3 py-2 focus:outline-none focus:border-amber-400/30 placeholder:text-gray-300 transition-colors"
                  />
                </div>
                <select value={filter.genre} onChange={e => setFilter(f => ({ ...f, genre: e.target.value }))}
                  className="bg-gray-100 border border-gray-200 text-gray-400 text-xs px-3 py-2 focus:outline-none">
                  <option value="">All genres</option>
                  {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={() => setFilter(f => ({ ...f, innerCircle: !f.innerCircle }))}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 border transition-all ${
                    filter.innerCircle
                      ? "border-amber-400/40 text-amber-400 bg-amber-400/5"
                      : "border-gray-200 text-gray-400 hover:border-gray-200"
                  }`}>
                  <Star size={11} className={filter.innerCircle ? "fill-amber-400" : ""} />
                  IC
                </button>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="bg-gray-100 border border-gray-200 text-gray-400 text-xs px-3 py-2 focus:outline-none">
                  <option value="id">Newest</option>
                  <option value="name">A→Z</option>
                  <option value="bpm">BPM ↓</option>
                </select>
              </div>

              {/* Select-all row */}
              <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
                <button onClick={() => setChecked(allChecked ? [] : visible.map(t => t.id))}
                  className="text-gray-300 hover:text-gray-900 transition-colors">
                  {allChecked ? <CheckSquare size={13} className="text-amber-400" /> : <Square size={13} />}
                </button>
                <span className="text-gray-300 text-[10px] tracking-[0.15em] uppercase">
                  {checked.length > 0 ? `${checked.length} selected` : "Select all"}
                </span>
              </div>

              {/* Track rows */}
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-20">
                    <RotateCcw size={18} className="text-gray-300 animate-spin" />
                  </div>
                )}
                {!loading && visible.length === 0 && (
                  <div className="text-center py-20">
                    <Music2 size={28} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No tracks found</p>
                  </div>
                )}
                {!loading && visible.map((track, i) => {
                  const isChecked = checked.includes(track.id);
                  const isEditing = selected?.id === track.id;
                  return (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.3, ease: EASE }}
                      className={`flex items-center gap-4 px-6 py-3.5 border-b border-gray-100 group transition-all cursor-pointer ${
                        isEditing ? "bg-gray-100 border-l-2 border-l-amber-400" :
                        isChecked ? "bg-amber-400/[0.03]" :
                        "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelected(isEditing ? null : track)}
                    >
                      {/* Checkbox */}
                      <div onClick={e => { e.stopPropagation(); toggleCheck(track.id); }}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-900 transition-colors">
                        {isChecked
                          ? <CheckSquare size={13} className="text-amber-400" />
                          : <Square size={13} />}
                      </div>

                      {/* Cover art */}
                      <div className="w-9 h-9 flex-shrink-0 bg-gray-100 overflow-hidden">
                        {track.cover_art || track.cover ? (
                          <img src={track.cover_art || track.cover} alt=""
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music2 size={12} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Name + collab */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium transition-colors ${
                          isEditing ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"
                        }`}>
                          {track.name || <span className="text-gray-300 italic">untitled</span>}
                        </p>
                        {track.collaborators && (
                          <p className="text-gray-500 text-xs truncate">{track.collaborators}</p>
                        )}
                      </div>

                      {/* Genre */}
                      {track.genre && (
                        <span className="text-gray-300 text-[10px] tracking-[0.1em] uppercase flex-shrink-0 hidden sm:block">
                          {track.genre}
                        </span>
                      )}

                      {/* BPM */}
                      {track.bpm && (
                        <span className="text-gray-400 text-xs tabular-nums flex-shrink-0 w-14 text-right">
                          {track.bpm} BPM
                        </span>
                      )}

                      {/* Key */}
                      {(track.key_sig || track.key) && (
                        <span className="text-gray-400 text-[10px] flex-shrink-0 w-16 text-right hidden md:block">
                          {track.key_sig || track.key}
                        </span>
                      )}

                      {/* Inner circle dot */}
                      {(track.inner_circle === 1 || track.inner_circle === true) && (
                        <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                      )}

                      {/* Source badge for imported tracks */}
                      {track.source && track.source !== "upload" && (
                        <span className="text-[9px] text-gray-300 uppercase tracking-widest flex-shrink-0 hidden lg:block">
                          {track.source}
                        </span>
                      )}

                      {/* Edit caret */}
                      <ChevronDown size={12}
                        className={`text-gray-300 flex-shrink-0 transition-transform ${isEditing ? "rotate-180 text-amber-400" : "group-hover:text-gray-400"}`} />
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* Cloud browser views */}
          {(source === "dropbox" || source === "drive") && (
            <div className="flex-1 overflow-hidden">
              <CloudBrowser source={source} onImport={handleCloudImport} />
            </div>
          )}

          {/* Batch uploader view */}
          {source === "upload" && (
            <div className="flex-1 overflow-hidden">
              <BatchUploader onComplete={handleBatchComplete} />
            </div>
          )}

        </div>

        {/* Right: edit panel (only visible in local view) */}
        <AnimatePresence>
          {selected && source === "local" && (
            <EditPanel
              key={selected.id}
              track={selected}
              onSave={handleSave}
              onClose={() => setSelected(null)}
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>
      </div>

      {/* New track modal */}
      <AnimatePresence>
        {showNew && (
          <NewTrackModal onSave={handleNew} onClose={() => setShowNew(false)} />
        )}
      </AnimatePresence>

      {/* Batch tag bar */}
      <AnimatePresence>
        {checked.length > 0 && (
          <BatchBar
            selected={checked}
            onClear={() => setChecked([])}
            onTag={handleBatchTag}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
