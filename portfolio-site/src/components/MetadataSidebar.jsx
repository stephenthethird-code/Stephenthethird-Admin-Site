/**
 * MetadataSidebar.jsx
 *
 * Slides in from the right when a track is selected in the Explorer.
 * Shows: cover art, title, BPM, collaborators, session notes, Spotify credits.
 */

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Music2, Clock, Users } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

function CoverArt({ src, alt }) {
  return (
    <div className="w-full aspect-square bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center mb-6">
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display="none"; }} />
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <Music2 size={36} />
          <span className="text-[10px] tracking-widest uppercase">No artwork</span>
        </div>
      )}
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-200">
      <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-gray-500 text-[9px] tracking-[0.18em] uppercase mb-0.5">{label}</p>
        <p className="text-white/75 text-sm leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

export default function MetadataSidebar({ track, onClose }) {
  const overlayRef = useRef(null);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  const credits = track?.credits ?? {};
  const hasCredits = credits.producers?.length || credits.songwriters?.length || credits.engineers?.length;

  return (
    <AnimatePresence>
      {track && (
        <>
          {/* Dark overlay */}
          <motion.div ref={overlayRef} onClick={handleOverlayClick}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" />

          {/* Sidebar panel */}
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.38, ease }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-gray-50 border-l border-gray-200 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <span className="text-gray-500 text-[10px] tracking-[0.25em] uppercase">Session Info</span>
              <button onClick={onClose}
                className="text-gray-500 hover:text-gray-900 transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">

              {/* Cover art */}
              <CoverArt src={track.coverArt || track.cover} alt={track.name || track.filename} />

              {/* Title */}
              <h2 className="text-gray-900 font-black uppercase leading-tight mb-1"
                style={{ fontSize: "clamp(1.1rem, 3vw, 1.4rem)", letterSpacing: "-0.01em" }}>
                {track.name || track.filename || "Untitled"}
              </h2>

              {/* Folder tag */}
              {track.folder && (
                <span className="inline-block text-[9px] px-2.5 py-1 border border-amber-400/30 text-amber-400 tracking-[0.12em] uppercase mb-5">
                  {track.folder}
                </span>
              )}

              {/* Meta rows */}
              <div className="mb-6">
                <MetaRow icon={Clock} label="BPM"           value={track.bpm ? `${track.bpm} BPM` : null} />
                <MetaRow icon={Users} label="Collaborators" value={track.collaborators || track.artists} />
                {track.date && (
                  <MetaRow icon={Clock} label="Date" value={new Date(track.date).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })} />
                )}
              </div>

              {/* Session notes */}
              {track.notes && (
                <div className="mb-6">
                  <p className="text-gray-500 text-[9px] tracking-[0.25em] uppercase mb-3">Session Notes</p>
                  <p className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-amber-400/25 pl-4">
                    {track.notes}
                  </p>
                </div>
              )}

              {/* Spotify credits */}
              {hasCredits && (
                <div className="mb-6 p-4 border border-gray-200 bg-white/[0.02]">
                  <p className="text-gray-500 text-[9px] tracking-[0.25em] uppercase mb-4">Credits</p>
                  <div className="space-y-3">
                    {[
                      ["Produced by",   credits.producers],
                      ["Written by",    credits.songwriters],
                      ["Engineered by", credits.engineers],
                    ].map(([label, list]) => list?.length > 0 && (
                      <div key={label}>
                        <p className="text-gray-300 text-[9px] tracking-[0.18em] uppercase mb-1">{label}</p>
                        <p className="text-gray-500 text-xs">{list.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                  {track.spotifyUrl && (
                    <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-4 text-[10px] text-amber-400/55 hover:text-amber-400 tracking-[0.12em] uppercase transition-colors">
                      <ExternalLink size={11} /> Listen on Spotify
                    </a>
                  )}
                </div>
              )}

              {/* Images / artwork */}
              {track.images?.length > 0 && (
                <div className="mb-6">
                  <p className="text-gray-500 text-[9px] tracking-[0.25em] uppercase mb-3">Session Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {track.images.map((img, i) => (
                      <div key={i} className="aspect-square bg-gray-100 border border-gray-200 overflow-hidden">
                        <img src={img} alt={`Session ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
