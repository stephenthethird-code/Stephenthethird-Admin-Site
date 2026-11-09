/**
 * AdminCredits.jsx  →  /admin/credits
 * Editable credits/catalog list. Click any row to edit title, artist, roles, Spotify URL, etc.
 */

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Save, Trash2, Edit3,
  ExternalLink, Star, RotateCcw, Check, Music,
  Download, ListMusic, AlertCircle, Loader,
} from "lucide-react";
import AdminShell  from "../components/admin/AdminShell";
import creditsRaw  from "../data/creditsData";

const API = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type:"spring", stiffness:300, damping:30 };

const ROLE_OPTIONS = ["Producer","Co-Producer","Songwriter","Co-Writer","Mixing Engineer","Mastering Engineer","Featured Artist","Executive Producer","A&R"];

const BLANK = {
  title:"", artist:"", featuring:"", year: new Date().getFullYear(),
  roles:[], genre:"", spotifyUrl:"", highlighted:false, description:"", cover:"",
};

const inputCls  = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";
const selectCls = inputCls + " cursor-pointer";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function EditPanel({ credit, isNew, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({ ...BLANK, ...credit });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); }

  function toggleRole(r) {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setTimeout(() => {
      onSave({ ...form, id: form.id || Date.now() });
      setSaved(true);
      setTimeout(() => { setSaved(false); if (isNew) onClose(); }, 1500);
      setSaving(false);
    }, 400);
  }

  return (
    <motion.div
      key={credit?.id ?? "new"}
      initial={{ x: 60, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:60, opacity:0 }}
      transition={SPRING}
      className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <p className="text-gray-500 text-xs flex items-center gap-2">
          <Edit3 size={11} className="text-amber-400" />
          {isNew ? "New Credit" : (form.title || "Edit Credit")}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Cover */}
        <Field label="Cover URL or filename">
          <input className={inputCls} value={form.cover} onChange={e => set("cover", e.target.value)}
            placeholder="/images/track.jpg" />
          {form.cover && (
            <img src={form.cover} alt="" className="mt-2 w-full aspect-square object-cover opacity-80" />
          )}
        </Field>

        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="Track name" autoFocus={isNew} />
        </Field>

        <Field label="Artist">
          <input className={inputCls} value={form.artist} onChange={e => set("artist", e.target.value)}
            placeholder="Artist name" />
        </Field>

        <Field label="Featuring">
          <input className={inputCls} value={form.featuring} onChange={e => set("featuring", e.target.value)}
            placeholder="Feat. …" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Year">
            <input className={inputCls} type="number" value={form.year} onChange={e => set("year", e.target.value)}
              min="2000" max="2030" />
          </Field>
          <Field label="Genre">
            <input className={inputCls} value={form.genre} onChange={e => set("genre", e.target.value)}
              placeholder="Hip-Hop" />
          </Field>
        </div>

        <Field label="Your Roles">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ROLE_OPTIONS.map(r => (
              <button key={r} onClick={() => toggleRole(r)}
                className={`text-[10px] px-2.5 py-1 border transition-all ${
                  form.roles.includes(r)
                    ? "border-amber-400/40 bg-amber-400/5 text-amber-400"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>{r}</button>
            ))}
          </div>
        </Field>

        <Field label="Spotify URL">
          <input className={inputCls} value={form.spotifyUrl ?? ""} onChange={e => set("spotifyUrl", e.target.value)}
            placeholder="https://open.spotify.com/track/…" />
        </Field>

        <Field label="Description">
          <textarea className={inputCls + " resize-none"} rows={3}
            value={form.description ?? ""} onChange={e => set("description", e.target.value)}
            placeholder="Context, story, notes…" />
        </Field>

        <button onClick={() => set("highlighted", !form.highlighted)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 border transition-all ${
            form.highlighted ? "border-amber-400/30 bg-amber-400/5" : "border-gray-200 hover:border-gray-200"
          }`}>
          <Star size={13} className={form.highlighted ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
          <span className={`text-sm ${form.highlighted ? "text-amber-400" : "text-gray-400"}`}>
            Featured / Highlighted
          </span>
          {form.highlighted && <Check size={11} className="ml-auto text-amber-400" />}
        </button>
      </div>

      <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
        <button onClick={handleSave} disabled={saving || !form.title.trim()}
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

// ── Spotify Import Modal ──────────────────────────────────────────────────────
function SpotifyImportModal({ onImport, onClose }) {
  const [url,      setUrl]     = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const [tracks,   setTracks]  = useState([]);
  const [playlist, setPlaylist]= useState("");
  const [selected, setSelected]= useState(new Set());
  const [step,     setStep]    = useState("url"); // url | preview

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/api/spotify/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.needs_setup) {
          setError("Spotify API not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file, then restart the backend.");
        } else {
          setError(data.error || "Failed to fetch playlist.");
        }
        return;
      }
      setTracks(data.tracks || []);
      setPlaylist(data.playlist || "Playlist");
      setSelected(new Set(data.tracks.map((_, i) => i)));
      setStep("preview");
    } catch (e) {
      setError(`Could not reach backend (${e.message}). Make sure it's running on port 5050.`);
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    setSelected(prev => prev.size === tracks.length ? new Set() : new Set(tracks.map((_, i) => i)));
  }

  function toggle(i) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleImport() {
    const toImport = tracks
      .filter((_, i) => selected.has(i))
      .map(t => ({
        id:          Date.now() + Math.random(),
        title:       t.title,
        artist:      t.artist,
        year:        t.year,
        roles:       ["Producer"],
        spotifyUrl:  t.spotifyUrl,
        cover:       t.coverUrl,
        genre:       "",
        featuring:   "",
        description: "",
        highlighted: false,
      }));
    onImport(toImport);
  }

  const SPRING_LOCAL = { type:"spring", stiffness:300, damping:28 };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}>
      <motion.div
        initial={{ scale:0.96, y:12 }} animate={{ scale:1, y:0 }} exit={{ scale:0.96, y:12 }}
        transition={SPRING_LOCAL}
        className="bg-white border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-gray-900 text-sm font-black flex items-center gap-2">
            <ListMusic size={14} className="text-green-500" />
            Import from Spotify
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={15}/></button>
        </div>

        <div className="px-5 py-5">
          {step === "url" ? (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-2">
                  Spotify Playlist, Album, or Track URL
                </label>
                <input
                  className="w-full border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-400 placeholder:text-gray-300"
                  placeholder="https://open.spotify.com/playlist/…"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFetch()}
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2.5 rounded text-red-600 text-xs">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-gray-400 text-[10px]">
                Works with public playlists, albums, or individual tracks. Requires <code className="bg-gray-100 px-1">SPOTIFY_CLIENT_ID</code> + <code className="bg-gray-100 px-1">SPOTIFY_CLIENT_SECRET</code> in your backend <code className="bg-gray-100 px-1">.env</code>.
              </p>
              <button
                onClick={handleFetch}
                disabled={loading || !url.trim()}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white text-xs font-black tracking-widest uppercase py-3 hover:bg-green-600 transition-colors disabled:opacity-40">
                {loading ? <Loader size={13} className="animate-spin"/> : <Download size={13}/>}
                {loading ? "Fetching…" : "Fetch Tracks"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-700 text-sm font-bold">"{playlist}"</p>
                <span className="text-gray-400 text-[10px]">{tracks.length} tracks · {selected.size} selected</span>
              </div>
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <button onClick={toggleAll} className="text-[10px] text-amber-500 hover:text-amber-600 underline">
                  {selected.size === tracks.length ? "Deselect all" : "Select all"}
                </button>
                <button onClick={() => { setStep("url"); setTracks([]); setError(""); }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline ml-auto">
                  ← Change URL
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {tracks.map((t, i) => (
                  <button key={i} onClick={() => toggle(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all ${
                      selected.has(i) ? "border-green-300 bg-green-50" : "border-gray-100 hover:border-gray-200"
                    }`}>
                    {t.coverUrl
                      ? <img src={t.coverUrl} alt="" className="w-8 h-8 object-cover flex-shrink-0 rounded-sm"/>
                      : <div className="w-8 h-8 bg-gray-100 flex items-center justify-center flex-shrink-0 rounded-sm"><Music size={12} className="text-gray-300"/></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-xs font-medium truncate">{t.title}</p>
                      <p className="text-gray-400 text-[10px] truncate">{t.artist}{t.year ? ` · ${t.year}` : ""}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${selected.has(i) ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                      {selected.has(i) && <Check size={10} className="text-white"/>}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-3 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-40">
                <Download size={13}/> Import {selected.size} Track{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminCredits() {
  const [credits,       setCredits]       = useState(creditsRaw);
  const [query,         setQuery]         = useState("");
  const [panel,         setPanel]         = useState(null);
  const [importModal,   setImportModal]   = useState(false);

  const visible = useMemo(() => {
    if (!query) return credits;
    const q = query.toLowerCase();
    return credits.filter(c =>
      (c.title ?? "").toLowerCase().includes(q) ||
      (c.artist ?? "").toLowerCase().includes(q)
    );
  }, [credits, query]);

  function handleSave(updated) {
    setCredits(prev => {
      const idx = prev.findIndex(c => c.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [updated, ...prev];
    });
  }

  function handleDelete(id) {
    setCredits(prev => prev.filter(c => c.id !== id));
    setPanel(null);
  }

  function handleBulkImport(newCredits) {
    setCredits(prev => [...newCredits, ...prev]);
    setImportModal(false);
  }

  return (
    <AdminShell>
      <div className="flex h-full overflow-hidden" style={{ height:"calc(100vh - 0px)" }}>
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">Catalog</p>
              <h2 className="text-gray-900 font-black text-xl" style={{ letterSpacing:"-0.02em" }}>
                Credits
                <span className="text-gray-400 font-normal text-sm ml-2">{visible.length}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setImportModal(true)}
                className="flex items-center gap-2 border border-gray-200 text-gray-500 text-xs font-bold tracking-widest uppercase px-4 py-2 hover:border-green-400 hover:text-green-500 transition-colors">
                <ListMusic size={12} /> Import Playlist
              </button>
              <button onClick={() => setPanel({ credit: null, isNew: true })}
                className="flex items-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-400 hover:text-black transition-colors">
                <Plus size={12} /> Add Credit
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search title, artist…"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm pl-8 pr-3 py-2 focus:outline-none focus:border-amber-400/30 placeholder:text-gray-300 transition-colors" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {visible.map((c, i) => {
              const isActive = panel?.credit?.id === c.id;
              return (
                <motion.div key={c.id}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: Math.min(i*0.02, 0.25), duration:0.3, ease:EASE }}
                  onClick={() => setPanel({ credit: c, isNew: false })}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-gray-100 cursor-pointer group transition-all ${
                    isActive ? "bg-gray-100 border-l-2 border-l-amber-400" : "hover:bg-gray-50"
                  }`}>
                  {/* Cover */}
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 overflow-hidden">
                    {c.cover ? (
                      <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={12} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-gray-700 text-sm font-medium truncate group-hover:text-gray-900 transition-colors">
                        "{c.title}"
                      </p>
                      {c.highlighted && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{c.artist} {c.year ? `· ${c.year}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-shrink-0 hidden md:flex">
                    {(c.roles || []).slice(0,2).map(r => (
                      <span key={r} className="text-[9px] px-2 py-0.5 border border-gray-200 text-gray-400 uppercase tracking-wide">{r}</span>
                    ))}
                  </div>
                  {c.spotifyUrl && (
                    <a href={c.spotifyUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-gray-300 hover:text-green-400 transition-colors flex-shrink-0">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {panel && (
            <EditPanel
              key={panel.credit?.id ?? "new"}
              credit={panel.credit ?? {}}
              isNew={panel.isNew}
              onSave={handleSave}
              onClose={() => setPanel(null)}
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Spotify Import Modal */}
      <AnimatePresence>
        {importModal && (
          <SpotifyImportModal
            onImport={handleBulkImport}
            onClose={() => setImportModal(false)}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
