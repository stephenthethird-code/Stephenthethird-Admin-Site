/**
 * Explorer.jsx  —  Untitled-style track grid
 *
 * Groups 1,779 beats by folder (1BEATS / new songs:records / DEMOS / Root).
 * Click any card → MetadataSidebar slides in from the right.
 * Search bar + BPM filter chips at the top.
 */

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Search, X, SlidersHorizontal, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { useBeats }         from "../hooks/useBeats";
import MetadataSidebar      from "./MetadataSidebar";

const ease = [0.22, 1, 0.36, 1];

// ── How we determine a track's folder from its filename / path ───────────────
function getFolder(beat) {
  if (beat.folder) return beat.folder;
  const p = (beat.path || beat.filename || "").toLowerCase();
  if (p.includes("1beats"))              return "1BEATS";
  if (p.includes("new songs") || p.includes("records")) return "NEW SONGS & RECORDS";
  if (p.includes("demos"))               return "DEMOS";
  return "ROOT";
}

const FOLDER_ORDER = ["1BEATS", "NEW SONGS & RECORDS", "DEMOS", "ROOT"];

const BPM_FILTERS = [
  { label: "All",       min: 0,   max: Infinity },
  { label: "< 90",      min: 0,   max: 89       },
  { label: "90–120",    min: 90,  max: 120      },
  { label: "121–150",   min: 121, max: 150      },
  { label: "151–180",   min: 151, max: 180      },
  { label: "> 180",     min: 181, max: Infinity },
];

const PAGE_SIZE = 72;

// ── Single track card ────────────────────────────────────────────────────────
function TrackCard({ beat, index, isSelected, onClick }) {
  const name   = beat.name || beat.filename || "untitled";
  const bpm    = beat.bpm ?? null;
  const collab = beat.collaborators || beat.artists;
  const hasCover = !!(beat.coverArt || beat.cover);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 12) * 0.025, duration: 0.4, ease }}
      className={`group text-left w-full flex flex-col transition-colors duration-150 ${
        isSelected ? "ring-1 ring-amber-400/50" : ""
      }`}
    >
      {/* Cover art square */}
      <div className={`relative w-full aspect-square overflow-hidden flex items-center justify-center mb-0 transition-all duration-200 ${
        hasCover ? "bg-gray-100" : "bg-white"
      } group-hover:bg-gray-100`}>
        {hasCover ? (
          <img src={beat.coverArt || beat.cover} alt={name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-200" />
        ) : (
          /* Generative cover — gradient based on track index */
          <div className="w-full h-full" style={{
            background: `linear-gradient(135deg, ${GRAD_PAIRS[index % GRAD_PAIRS.length][0]} 0%, ${GRAD_PAIRS[index % GRAD_PAIRS.length][1]} 100%)`,
            opacity: 0.7,
          }} />
        )}

        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
              <path d="M1 1l10 6-10 6V1z"/>
            </svg>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
        )}
      </div>

      {/* Track info below cover */}
      <div className="pt-2.5 pb-1 px-0">
        <p className="text-white/85 text-xs font-medium leading-snug capitalize truncate">{name}</p>
        {collab && <p className="text-gray-500 text-[10px] truncate mt-0.5">{collab}</p>}
        {bpm && <p className="text-gray-300 text-[10px] mt-0.5">{bpm} bpm</p>}
      </div>
    </motion.button>
  );
}

// Subtle gradients for tracks without artwork
const GRAD_PAIRS = [
  ["#1a1a2e","#16213e"], ["#0f3460","#1a1a2e"], ["#161616","#2d2d2d"],
  ["#1e1e2e","#2d1b69"], ["#0a0a0a","#1a0a0a"], ["#0d1117","#1a2233"],
  ["#14141f","#1f1428"], ["#0a1628","#162847"], ["#1a1410","#2e2010"],
  ["#0e1a0e","#1a2e1a"],
];

// ── Folder group header ──────────────────────────────────────────────────────
function FolderGroup({ name, count, isOpen, onToggle, children }) {
  return (
    <div className="mb-10">
      <button onClick={onToggle}
        className="flex items-center gap-3 mb-5 group w-full text-left">
        {isOpen
          ? <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
          : <Folder     size={14} className="text-gray-500 flex-shrink-0" />}
        <span className="text-gray-500 text-[11px] tracking-[0.2em] uppercase font-medium group-hover:text-gray-900 transition-colors">
          {name}
        </span>
        <span className="text-gray-300 text-[10px]">({count})</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto">
          <ChevronDown size={12} className="text-gray-300" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function Explorer() {
  const { beats, loading, isLive } = useBeats();

  const [query,      setQuery]      = useState("");
  const [bpmIdx,     setBpmIdx]     = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [openFolders,setOpenFolders]= useState(new Set(FOLDER_ORDER));
  const [selected,   setSelected]   = useState(null);
  const [page,       setPage]       = useState(1);

  const activeBpm = BPM_FILTERS[bpmIdx];

  // Filter
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return beats.filter(b => {
      const name  = (b.name || b.filename || "").toLowerCase();
      const collab= (b.collaborators || b.artists || "").toLowerCase();
      const matchQ= !q || name.includes(q) || collab.includes(q);
      const bpm   = b.bpm ?? null;
      const matchB= bpmIdx === 0 || (bpm !== null && bpm >= activeBpm.min && bpm <= activeBpm.max);
      return matchQ && matchB;
    });
  }, [beats, query, bpmIdx, activeBpm]);

  // Group by folder
  const grouped = useMemo(() => {
    const map = {};
    FOLDER_ORDER.forEach(f => { map[f] = []; });
    filtered.slice(0, page * PAGE_SIZE).forEach(b => {
      const f = getFolder(b);
      if (!map[f]) map[f] = [];
      map[f].push(b);
    });
    return map;
  }, [filtered, page]);

  function toggleFolder(name) {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <>
      <section id="explorer" className="bg-white py-28 md:py-36 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Heading */}
          <motion.div ref={ref} initial={{ opacity:0, y:32 }} animate={inView ? {opacity:1,y:0} : {}}
            transition={{ duration:0.65, ease }} className="mb-14">
            <p className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-4">Archive</p>
            <h2 className="text-gray-900 font-black uppercase leading-none mb-5"
              style={{ fontSize:"clamp(2.6rem,7vw,5.5rem)", letterSpacing:"-0.025em" }}>
              Bounces
            </h2>
            <p className="text-white/38 text-sm leading-relaxed max-w-lg">
              {beats.length.toLocaleString()}+ original productions — beats, records, and sessions from the vault.
              {!isLive && <span className="text-gray-300"> (Preview — start S3 Hub for full library)</span>}
            </p>
          </motion.div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search title, collaborator…"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm pl-10 pr-9 py-2.5 placeholder:text-gray-300 focus:outline-none focus:border-amber-400/40 transition-colors" />
              <AnimatePresence>
                {query && (
                  <motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
                    onClick={() => { setQuery(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900">
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 border text-[11px] tracking-[0.15em] uppercase transition-colors ${
                showFilter ? "border-amber-400/40 text-amber-400" : "border-gray-200 text-white/35 hover:border-gray-300"}`}>
              <SlidersHorizontal size={12} /> Filter
            </button>
          </div>

          {/* BPM filter chips */}
          <AnimatePresence>
            {showFilter && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                transition={{duration:0.22,ease}} className="overflow-hidden">
                <div className="flex flex-wrap gap-2 py-3 mb-1">
                  <span className="text-gray-400 text-[10px] tracking-[0.18em] uppercase self-center mr-1">BPM:</span>
                  {BPM_FILTERS.map((f, i) => (
                    <button key={f.label} onClick={() => { setBpmIdx(i); setPage(1); }}
                      className={`text-[10px] px-3 py-1.5 border tracking-[0.1em] uppercase transition-colors ${
                        bpmIdx === i ? "border-amber-400/50 text-amber-400 bg-amber-400/5" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-gray-300 text-[10px] tracking-[0.2em] uppercase mb-10">
            {filtered.length.toLocaleString()} tracks
          </p>

          {/* Folder groups */}
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {Array.from({length:24}).map((_,i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-100 mb-2" />
                  <div className="h-2.5 bg-gray-100 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-gray-50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-300 text-sm tracking-widest uppercase">No tracks found</div>
          ) : (
            FOLDER_ORDER.map(folderName => {
              const tracks = grouped[folderName] ?? [];
              if (tracks.length === 0) return null;
              return (
                <FolderGroup key={folderName} name={folderName} count={tracks.length}
                  isOpen={openFolders.has(folderName)} onToggle={() => toggleFolder(folderName)}>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {tracks.map((beat, i) => (
                      <TrackCard key={beat.id ?? i} beat={beat} index={i}
                        isSelected={selected?.id === beat.id}
                        onClick={() => setSelected(prev => prev?.id === beat.id ? null : beat)} />
                    ))}
                  </div>
                </FolderGroup>
              );
            })
          )}

          {/* Load more */}
          {filtered.length > page * PAGE_SIZE && (
            <div className="text-center mt-12">
              <button onClick={() => setPage(p => p+1)}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-8 py-3 transition-colors">
                <ChevronDown size={13} />
                Load more ({(filtered.length - page * PAGE_SIZE).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sliding metadata sidebar */}
      <MetadataSidebar track={selected} onClose={() => setSelected(null)} />
    </>
  );
}
