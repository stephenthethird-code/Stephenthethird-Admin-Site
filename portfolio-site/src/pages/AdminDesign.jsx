/**
 * AdminDesign.jsx  →  /admin/design
 *
 * Figma-style Design Engine. Three-panel layout:
 *   Left  — Section tree + Theme drafts
 *   Center — Tabbed property controls (Colors · Typography · Layout · Presets)
 *   Right  — Live iframe preview of localhost:5173
 *
 * Uses Framer Motion spring physics throughout.
 * Sends postMessage to iframe on every change for real-time preview.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  RotateCcw, LogOut, Check, Eye, EyeOff, GripVertical,
  Palette, Type, LayoutGrid, Layers, Plus, Trash2,
  Users, ChevronRight, RefreshCw, Send, Maximize2, Monitor, Columns
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth  } from "../context/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 300, damping: 30 };
const EASE   = [0.22, 1, 0.36, 1];

const FONT_OPTIONS = [
  "Inter", "Helvetica Neue", "Georgia", "Playfair Display",
  "Courier New", "Space Grotesk", "DM Sans", "Syne",
];

const COLOR_KEYS = [
  { key: "background",  label: "Background",   group: "Base"   },
  { key: "surface",     label: "Surface",       group: "Base"   },
  { key: "accent",      label: "Accent",        group: "Accent" },
  { key: "accentHover", label: "Accent Hover",  group: "Accent" },
  { key: "text",        label: "Primary Text",  group: "Text"   },
];

const SECTION_LABELS = {
  hero:     "Hero",
  explorer: "Bounces / Explorer",
  credits:  "Credits / Catalog",
  contact:  "Contact",
};

const TABS = [
  { id: "colors",    label: "Colors",    Icon: Palette    },
  { id: "type",      label: "Type",      Icon: Type       },
  { id: "layouts",   label: "Layouts",   Icon: Columns    },
  { id: "layout",    label: "Order",     Icon: LayoutGrid },
  { id: "presets",   label: "Presets",   Icon: Layers     },
];

const SITE_LAYOUTS = [
  {
    id: "untitled",
    name: "[untitled]",
    subtitle: "Dark file-explorer grid",
    description: "Minimal OS-style interface. Beat browser with BPM, key, and metadata sidebar.",
    preview: (
      <div className="w-full h-full bg-white flex flex-col p-2 gap-1.5 overflow-hidden">
        <div className="h-3 bg-gray-100 rounded-sm w-2/3" />
        <div className="flex gap-1.5 flex-1">
          <div className="w-1/3 bg-gray-100 rounded-sm" />
          <div className="flex-1 flex flex-col gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-2.5 bg-gray-100 rounded-sm" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "editorial",
    name: "Editorial",
    subtitle: "Magazine release grid",
    description: "Groundwerk / SoundFynd-inspired. Featured releases with cover art, editorial header.",
    preview: (
      <div className="w-full h-full bg-white flex flex-col p-2 gap-1.5 overflow-hidden">
        <div className="h-2.5 bg-gray-100 rounded-sm w-full" />
        <div className="flex-1 grid grid-cols-2 gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`rounded-sm ${i === 0 ? "col-span-2 row-span-1 bg-amber-400/20" : "bg-gray-100"}`} />
          ))}
        </div>
        <div className="h-1.5 bg-gray-50 rounded-sm w-full" />
      </div>
    ),
  },
  {
    id: "portfolio",
    name: "Portfolio",
    subtitle: "Minimalist full-bleed",
    description: "Jake Marsh-inspired. Full-bleed parallax hero, clean credits list, minimal contact.",
    preview: (
      <div className="w-full h-full bg-gray-900 flex flex-col overflow-hidden">
        <div className="flex-1 relative flex items-end p-2">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-black opacity-80" />
          <div className="relative z-10">
            <div className="h-1 bg-amber-400/60 rounded-sm w-8 mb-1" />
            <div className="h-3 bg-white/60 rounded-sm w-16" />
          </div>
        </div>
        <div className="p-2 flex flex-col gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-2 bg-gray-100 rounded-sm flex-shrink-0" style={{ width: `${70 - i * 15}%` }} />
          ))}
        </div>
      </div>
    ),
  },
];

const PRESET_THEMES = [
  {
    name: "Studio Noir",
    colors: { background:"#050505", surface:"#0d0d0d", accent:"#fbbf24", accentHover:"#fcd34d", text:"#ffffff" },
    fonts:  { heading:"Inter", body:"Inter" },
  },
  {
    name: "Midnight Blue",
    colors: { background:"#020817", surface:"#0f172a", accent:"#60a5fa", accentHover:"#93c5fd", text:"#f1f5f9" },
    fonts:  { heading:"Inter", body:"Inter" },
  },
  {
    name: "Warm Analog",
    colors: { background:"#0a0806", surface:"#1a1208", accent:"#fb923c", accentHover:"#fdba74", text:"#fef3c7" },
    fonts:  { heading:"Playfair Display", body:"Inter" },
  },
  {
    name: "Clean Slate",
    colors: { background:"#fafafa", surface:"#f4f4f5", accent:"#18181b", accentHover:"#3f3f46", text:"#09090b" },
    fonts:  { heading:"Helvetica Neue", body:"Inter" },
  },
  {
    name: "Deep Forest",
    colors: { background:"#030a05", surface:"#0a1a0c", accent:"#4ade80", accentHover:"#86efac", text:"#f0fdf4" },
    fonts:  { heading:"DM Sans", body:"DM Sans" },
  },
];

// ─── Color row with hex input + swatch ───────────────────────────────────────
function ColorControl({ colorKey, label, value, onChange }) {
  const [hex, setHex] = useState(value);

  useEffect(() => { setHex(value); }, [value]);

  function handleHexChange(e) {
    const v = e.target.value;
    setHex(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
  }

  function handlePickerChange(e) {
    setHex(e.target.value);
    onChange(e.target.value);
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-200 group">
      <span className="text-white/55 text-sm">{label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="text"
          value={hex}
          onChange={handleHexChange}
          maxLength={7}
          className="w-20 bg-gray-100 border border-gray-200 text-gray-600 text-xs font-mono px-2 py-1 focus:outline-none focus:border-amber-400/40 transition-colors text-center"
        />
        <label className="cursor-pointer relative">
          <div
            className="w-7 h-7 border border-gray-300 hover:border-white/40 transition-colors"
            style={{ backgroundColor: value }}
          />
          <input type="color" value={value} onChange={handlePickerChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>
      </div>
    </div>
  );
}

// ─── Draggable section row ────────────────────────────────────────────────────
function SectionRow({ id, index, label, dragging, dragOver, onDragStart, onDragOver, onDragEnd }) {
  const isActive = dragging === index;
  const isTarget = dragOver === index && dragging !== index;

  return (
    <motion.div
      layout
      transition={SPRING}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 px-3 py-2.5 rounded cursor-grab active:cursor-grabbing transition-all select-none ${
        isActive  ? "opacity-40" :
        isTarget  ? "bg-amber-400/10 border border-amber-400/25" :
        "hover:bg-gray-100 border border-transparent"
      }`}
    >
      <GripVertical size={13} className="text-gray-300 flex-shrink-0" />
      <span className="text-gray-400 text-[10px] tabular-nums w-3">{index + 1}</span>
      <span className="text-white/75 text-sm">{label}</span>
    </motion.div>
  );
}

// ─── Draft theme card ─────────────────────────────────────────────────────────
function DraftCard({ draft, onApply, onDelete, onSubmit, isSuperAdmin, onPublish }) {
  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      className="p-3 border border-gray-200 bg-white/[0.02] mb-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1">
          {Object.values(draft.colors).slice(0,4).map((c,i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor:c }} />
          ))}
        </div>
        <span className="text-gray-500 text-xs font-medium truncate flex-1">{draft.name}</span>
        <span className={`text-[9px] px-1.5 py-0.5 border tracking-widest uppercase ${
          draft.status === "published" ? "border-green-400/30 text-green-400 bg-green-400/10" :
          draft.status === "pending"   ? "border-amber-400/30 text-amber-400 bg-amber-400/10" :
          "border-gray-200 text-gray-400"
        }`}>{draft.status}</span>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onApply(draft)}
          className="text-[9px] px-2 py-1 border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-colors tracking-widest uppercase">
          Preview
        </button>
        {draft.status === "draft" && (
          <button onClick={() => onSubmit(draft.id)}
            className="text-[9px] px-2 py-1 border border-amber-400/25 text-amber-400/60 hover:text-amber-400 hover:border-amber-400/50 transition-colors tracking-widest uppercase flex items-center gap-1">
            <Send size={9} /> Submit
          </button>
        )}
        {isSuperAdmin && draft.status === "pending" && (
          <button onClick={() => onPublish(draft.id)}
            className="text-[9px] px-2 py-1 border border-green-400/30 text-green-400/70 hover:text-green-400 hover:border-green-400/50 transition-colors tracking-widest uppercase flex items-center gap-1">
            <Check size={9} /> Publish
          </button>
        )}
        <button onClick={() => onDelete(draft.id)}
          className="ml-auto text-[9px] p-1 text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
      {draft.author && <p className="text-gray-300 text-[9px] mt-2">by {draft.author}</p>}
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminDesign() {
  const { theme, setColor, setFont, setLayout, reorderSections, resetTheme, applyFullTheme } = useTheme();
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate  = useNavigate();
  const iframeRef = useRef(null);

  const [activeTab,  setActiveTab]  = useState("colors");
  const [saved,      setSaved]      = useState(false);
  const [previewOn,  setPreviewOn]  = useState(true);
  const [dragging,   setDragging]   = useState(null);
  const [dragOver,   setDragOver]   = useState(null);
  const [newDraftName, setNewDraftName] = useState("");
  const [drafts,     setDrafts]     = useState([
    { id: 1, name: "Dark Studio (Current)", colors: { ...theme.colors }, fonts: { ...theme.fonts }, status: "published", author: "Stephen" },
  ]);

  // Notify iframe of theme change
  const postToIframe = useCallback((t) => {
    if (!previewOn) return;
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "S3_THEME", theme: t }, "*");
    } catch {}
  }, [previewOn]);

  useEffect(() => { postToIframe(theme); }, [theme, postToIframe]);

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleColor(key, val) {
    setColor(key, val);
    showSaved();
  }

  function handleFont(key, val) {
    setFont(key, val);
    showSaved();
  }

  function onDragEnd() {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      const next = [...theme.sectionOrder];
      const item = next.splice(dragging, 1)[0];
      next.splice(dragOver, 0, item);
      reorderSections(next);
      showSaved();
    }
    setDragging(null);
    setDragOver(null);
  }

  function applyPreset(preset) {
    applyFullTheme({ ...theme, colors: preset.colors, fonts: preset.fonts });
    showSaved();
  }

  function saveDraft() {
    if (!newDraftName.trim()) return;
    setDrafts(prev => [...prev, {
      id: Date.now(),
      name: newDraftName.trim(),
      colors: { ...theme.colors },
      fonts:  { ...theme.fonts  },
      status: "draft",
      author: user?.name,
    }]);
    setNewDraftName("");
  }

  function deleteDraft(id)  { setDrafts(prev => prev.filter(d => d.id !== id)); }
  function submitDraft(id)  { setDrafts(prev => prev.map(d => d.id === id ? { ...d, status:"pending" } : d)); }
  function publishDraft(id) {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    applyFullTheme({ ...theme, colors: draft.colors, fonts: draft.fonts });
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status:"published" } : d));
    showSaved();
  }

  function applyDraftPreview(draft) {
    applyFullTheme({ ...theme, colors: draft.colors, fonts: draft.fonts });
  }

  function refreshIframe() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 text-[10px] tracking-[0.3em] uppercase">Design Engine</span>
          <span className="text-gray-300 text-[10px]">{user?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {saved && (
              <motion.span initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                className="flex items-center gap-1 text-[10px] text-amber-400 mr-2">
                <Check size={11} /> Saved
              </motion.span>
            )}
          </AnimatePresence>
          <button onClick={() => navigate("/admin/contacts")}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gray-500 hover:text-amber-400 border border-gray-200 hover:border-amber-400/30 px-3 py-1.5 transition-colors">
            <Users size={11} /> Contacts
          </button>
          <button onClick={resetTheme}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={() => setPreviewOn(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase border px-3 py-1.5 transition-colors ${
              previewOn ? "border-amber-400/30 text-amber-400" : "border-gray-200 text-gray-400 hover:text-gray-900"}`}>
            {previewOn ? <Eye size={11} /> : <EyeOff size={11} />} Preview
          </button>
          <button onClick={() => { logout(); navigate("/"); }}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-900 border border-gray-200 px-3 py-1.5 transition-colors">
            <LogOut size={11} /> Logout
          </button>
        </div>
      </div>

      {/* ── Three-panel body ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Layers + Drafts (200px) */}
        <div className="w-48 flex-shrink-0 border-r border-gray-200 flex flex-col overflow-y-auto bg-gray-50">
          <div className="px-3 pt-4 pb-2">
            <p className="text-gray-400 text-[9px] tracking-[0.25em] uppercase mb-2">Sections</p>
            {theme.sectionOrder.map((id, i) => (
              <SectionRow key={id} id={id} index={i} label={SECTION_LABELS[id] ?? id}
                dragging={dragging} dragOver={dragOver}
                onDragStart={setDragging} onDragOver={setDragOver} onDragEnd={onDragEnd} />
            ))}
          </div>

          <div className="border-t border-gray-200 px-3 pt-4 flex-1">
            <p className="text-gray-400 text-[9px] tracking-[0.25em] uppercase mb-3">Theme Drafts</p>
            <AnimatePresence>
              {drafts.map(d => (
                <DraftCard key={d.id} draft={d}
                  onApply={applyDraftPreview}
                  onDelete={deleteDraft}
                  onSubmit={submitDraft}
                  onPublish={publishDraft}
                  isSuperAdmin={isSuperAdmin} />
              ))}
            </AnimatePresence>

            {/* New draft */}
            <div className="mt-3 space-y-1.5">
              <input value={newDraftName} onChange={e => setNewDraftName(e.target.value)}
                placeholder="Draft name…"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-xs px-2.5 py-1.5 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors" />
              <button onClick={saveDraft}
                className="w-full flex items-center justify-center gap-1.5 text-[9px] tracking-widest uppercase text-white/35 hover:text-amber-400 border border-gray-200 hover:border-amber-400/30 py-1.5 transition-colors">
                <Plus size={10} /> Save Current as Draft
              </button>
            </div>
          </div>
        </div>

        {/* CENTER — Property controls */}
        <div className="flex-1 overflow-y-auto border-r border-gray-200">

          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-200 px-4 bg-white sticky top-0 z-10">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase px-4 py-3 border-b-2 transition-all ${
                  activeTab === id ? "border-amber-400 text-amber-400" : "border-transparent text-gray-500 hover:text-gray-900"
                }`}>
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>

          <div className="px-6 py-6">

            {/* COLORS TAB */}
            {activeTab === "colors" && (
              <motion.div key="colors" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...SPRING}}>
                <p className="text-gray-400 text-[9px] tracking-[0.3em] uppercase mb-4">Global Colors</p>
                <div className="space-y-0">
                  {COLOR_KEYS.map(({ key, label }) => (
                    <ColorControl key={key} colorKey={key} label={label}
                      value={theme.colors[key]}
                      onChange={(val) => handleColor(key, val)} />
                  ))}
                </div>

                {/* Live swatch */}
                <div className="mt-6 p-4 border border-gray-200"
                  style={{ backgroundColor: theme.colors.background }}>
                  <p style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
                    className="text-xs font-black tracking-widest uppercase mb-2 opacity-40">Preview</p>
                  <p style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
                    className="text-xl font-black uppercase">stephenthethird</p>
                  <button style={{ backgroundColor: theme.colors.accent, color: theme.colors.background }}
                    className="mt-3 text-[10px] font-black tracking-widest uppercase px-4 py-1.5">
                    Accent Button
                  </button>
                </div>
              </motion.div>
            )}

            {/* TYPOGRAPHY TAB */}
            {activeTab === "type" && (
              <motion.div key="type" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...SPRING}}>
                <p className="text-gray-400 text-[9px] tracking-[0.3em] uppercase mb-4">Typography</p>
                <div className="space-y-3">
                  {[["heading","Heading / Display"],["body","Body / UI"]].map(([k, label]) => (
                    <div key={k} className="bg-gray-50 border border-gray-200 px-4 py-3">
                      <p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-3">{label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {FONT_OPTIONS.map(f => (
                          <button key={f} onClick={() => handleFont(k, f)}
                            className={`text-xs px-3 py-2 border text-left transition-colors ${
                              theme.fonts[k] === f
                                ? "border-amber-400/50 text-amber-400 bg-amber-400/5"
                                : "border-gray-200 text-white/45 hover:border-gray-300"
                            }`}
                            style={{ fontFamily: f }}>
                            {f}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-gray-400 text-[10px]">Current: <span className="text-gray-500">{theme.fonts[k]}</span></p>
                      <p className="mt-1 text-2xl font-black uppercase" style={{ fontFamily: theme.fonts[k], color: theme.colors.text, opacity: 0.8 }}>
                        Aa Bb Cc
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* LAYOUTS TAB — site-wide layout switcher */}
            {activeTab === "layouts" && (
              <motion.div key="layouts" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...SPRING}}>
                <p className="text-gray-400 text-[9px] tracking-[0.3em] uppercase mb-1">Site Layout</p>
                <p className="text-gray-300 text-xs mb-6">Switch the entire site between three visual identities. Changes apply instantly.</p>
                <div className="space-y-3">
                  {SITE_LAYOUTS.map(layout => {
                    const isActive = (theme.layout ?? "untitled") === layout.id;
                    return (
                      <div
                        key={layout.id}
                        onClick={() => { setLayout(layout.id); showSaved(); }}
                        className={`flex gap-4 p-4 border cursor-pointer group transition-all ${
                          isActive
                            ? "border-amber-400/40 bg-amber-400/[0.04]"
                            : "border-gray-200 bg-white/[0.02] hover:border-gray-200"
                        }`}
                      >
                        {/* Mini preview */}
                        <div className="w-24 h-16 flex-shrink-0 border border-gray-200 overflow-hidden rounded-sm">
                          {layout.preview}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-medium ${isActive ? "text-amber-400" : "text-white/75 group-hover:text-gray-900"} transition-colors`}>
                              {layout.name}
                            </p>
                            {isActive && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-400 tracking-widest uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-white/35 text-xs mb-1">{layout.subtitle}</p>
                          <p className="text-gray-300 text-[10px] leading-relaxed">{layout.description}</p>
                        </div>
                        <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-colors ${isActive ? "text-amber-400" : "text-gray-300 group-hover:text-gray-400"}`} />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* SECTION ORDER TAB */}
            {activeTab === "layout" && (
              <motion.div key="order" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...SPRING}}>
                <p className="text-gray-400 text-[9px] tracking-[0.3em] uppercase mb-2">Section Order</p>
                <p className="text-gray-300 text-xs mb-4">Drag rows to reorder sections on the public site.</p>
                <div className="space-y-1">
                  {theme.sectionOrder.map((id, i) => (
                    <SectionRow key={id} id={id} index={i} label={SECTION_LABELS[id] ?? id}
                      dragging={dragging} dragOver={dragOver}
                      onDragStart={setDragging} onDragOver={setDragOver} onDragEnd={onDragEnd} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* PRESETS TAB */}
            {activeTab === "presets" && (
              <motion.div key="presets" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{...SPRING}}>
                <p className="text-gray-400 text-[9px] tracking-[0.3em] uppercase mb-4">Theme Presets</p>
                <div className="space-y-2">
                  {PRESET_THEMES.map(preset => (
                    <div key={preset.name}
                      className="flex items-center gap-4 p-4 border border-gray-200 bg-white/[0.02] hover:border-gray-200 transition-colors cursor-pointer group"
                      onClick={() => applyPreset(preset)}>
                      {/* Color swatches */}
                      <div className="flex gap-1">
                        {Object.values(preset.colors).map((c,i) => (
                          <div key={i} className="w-4 h-4 rounded-sm border border-gray-200" style={{ backgroundColor:c }} />
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm font-medium group-hover:text-gray-900 transition-colors">{preset.name}</p>
                        <p className="text-gray-400 text-xs">{preset.fonts.heading}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-400 transition-colors" />
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 border border-gray-200 bg-white/[0.02]">
                  <p className="text-gray-400 text-[9px] tracking-[0.25em] uppercase mb-3">CSS Variables Reference</p>
                  <div className="font-mono text-xs text-white/35 space-y-1">
                    {[
                      ["--color-bg",          theme.colors.background],
                      ["--color-surface",     theme.colors.surface],
                      ["--color-accent",      theme.colors.accent],
                      ["--color-accent-hover",theme.colors.accentHover],
                      ["--color-text",        theme.colors.text],
                      ["--font-heading",      `"${theme.fonts.heading}"`],
                      ["--font-body",         `"${theme.fonts.body}"`],
                    ].map(([k,v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-amber-400/50">{k}:</span>
                        <span>{v};</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT — Live Preview iframe */}
        {previewOn && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "45%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={SPRING}
            className="flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Monitor size={12} className="text-gray-400" />
                <span className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">Live Preview</span>
                <span className="text-gray-300 text-[10px]">localhost:5173</span>
              </div>
              <button onClick={refreshIframe}
                className="text-gray-300 hover:text-gray-900 transition-colors p-1">
                <RefreshCw size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                ref={iframeRef}
                src="http://localhost:5173"
                title="Live Preview"
                className="w-full h-full border-0"
                style={{ transform: "scale(1)", transformOrigin: "top left" }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
