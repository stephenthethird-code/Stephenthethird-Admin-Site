/**
 * LayoutEditorial.jsx  — "Groundwerk / SoundFynd" style
 *
 * Magazine editorial grid layout. Featured releases hero + artist grid.
 * Swaps in when theme.layout === "editorial"
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useBeats } from "../hooks/useBeats";
import creditsData from "../data/creditsData";
import { Mail, Instagram } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

// ── Featured release card ─────────────────────────────────────────────────
function ReleaseCard({ credit, index }) {
  const isLarge = index === 0;
  const colors  = ["#1a1a1a","#111","#0f0f0f","#161616","#0a0a0a","#141414","#0d0d0d","#181818"];
  const bg      = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease }}
      className={`group relative overflow-hidden cursor-pointer ${isLarge ? "col-span-2 row-span-2" : ""}`}
      style={{ backgroundColor: bg }}
    >
      {/* Cover art */}
      <div className={`w-full ${isLarge ? "aspect-[4/3]" : "aspect-square"} overflow-hidden`}>
        {credit.coverArt ? (
          <img src={credit.coverArt} alt={credit.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${credit.accentColor ?? "#1a1a1a"} 0%, #050505 100%)` }}>
            <span className="text-gray-200 text-6xl font-black uppercase tracking-tighter">
              {credit.title?.slice(0,2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-gray-400 text-[9px] tracking-[0.25em] uppercase mb-1">
          {credit.role ?? "Produced by S3"}
        </p>
        <h3 className="text-gray-900 font-black uppercase leading-tight text-sm group-hover:text-amber-400 transition-colors"
          style={{ letterSpacing: "-0.01em" }}>
          "{credit.title}"
        </h3>
        <p className="text-gray-400 text-xs mt-0.5">{credit.artist}</p>
      </div>
    </motion.div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ children, className = "" }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease }}>
      <div className={className}>{children}</div>
    </motion.div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────
function EditorialNav() {
  return (
    <header className="border-b border-gray-200 px-8 py-5 flex items-center justify-between">
      <nav className="flex items-center gap-8">
        {["Catalog","Credits","Shows","Contact"].map(l => (
          <a key={l} href={`#${l.toLowerCase()}`}
            className="text-[11px] tracking-[0.2em] uppercase text-gray-400 hover:text-gray-900 transition-colors">
            {l}
          </a>
        ))}
      </nav>
      <span className="text-gray-900 font-black text-sm tracking-[0.15em] uppercase">STEPHENTHETHIRD</span>
      <a href="https://instagram.com/stephenthethird" target="_blank" rel="noopener noreferrer"
        className="text-[11px] tracking-[0.2em] uppercase text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-2">
        <Instagram size={13} /> Follow
      </a>
    </header>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────
export default function LayoutEditorial() {
  const { beats } = useBeats();
  const featured  = creditsData.slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <EditorialNav />

      {/* Featured Releases Hero */}
      <section id="catalog" className="px-8 py-14">
        <Section>
          <div className="flex items-end justify-between mb-8">
            <h1 className="font-black uppercase leading-none"
              style={{ fontSize:"clamp(2rem,6vw,5rem)", letterSpacing:"-0.03em" }}>
              <span className="text-gray-900">FEATURED </span>
              <span className="text-amber-400">RELEASES</span>
            </h1>
            <p className="text-gray-300 text-[10px] tracking-[0.3em] uppercase mb-2">
              {beats.length.toLocaleString()}+ Productions
            </p>
          </div>
        </Section>

        {/* Editorial grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
          {featured.map((credit, i) => (
            <div key={credit.id ?? i} className="bg-white">
              <ReleaseCard credit={credit} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* Stats banner */}
      <section className="border-y border-gray-200 py-8 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { n: `${beats.length.toLocaleString()}+`, l: "Original Productions" },
            { n: "30+",                               l: "Artists Worked With" },
            { n: "NYC",                               l: "Based" },
          ].map(s => (
            <div key={s.l}>
              <p className="text-amber-400 font-black text-2xl tabular-nums">{s.n}</p>
              <p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credits list */}
      <section id="credits" className="px-8 py-16">
        <Section className="mb-8">
          <p className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-2">Portfolio</p>
          <h2 className="text-gray-900 font-black uppercase text-4xl leading-none" style={{ letterSpacing:"-0.02em" }}>
            ALL CREDITS
          </h2>
        </Section>
        <div className="space-y-0 border-t border-gray-200">
          {creditsData.map((c, i) => (
            <motion.div key={c.id ?? i}
              initial={{ opacity:0, x:-12 }} whileInView={{ opacity:1, x:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.04, duration:0.4, ease }}
              className="flex items-center gap-6 py-4 border-b border-gray-100 group hover:bg-gray-100/[0.02] transition-colors px-2">
              <span className="text-gray-300 text-xs w-6 tabular-nums">{String(i+1).padStart(2,"0")}</span>
              <div className="flex-1">
                <span className="text-gray-700 text-sm font-medium group-hover:text-gray-900 transition-colors">"{c.title}"</span>
                <span className="text-white/35 text-sm ml-3">{c.artist}</span>
              </div>
              <span className="text-gray-300 text-[10px] tracking-[0.15em] uppercase">{c.role ?? "Producer"}</span>
              {c.highlighted && (
                <span className="text-[9px] px-2 py-0.5 border border-amber-400/30 text-amber-400 tracking-widest uppercase">Featured</span>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-8 py-20 border-t border-gray-200 text-center">
        <Section>
          <p className="text-gray-500 text-[10px] tracking-[0.35em] uppercase mb-4">Book A Session</p>
          <h2 className="text-gray-900 font-black uppercase mb-8"
            style={{ fontSize:"clamp(2rem,6vw,4.5rem)", letterSpacing:"-0.025em" }}>
            Let's Work
          </h2>
          <div className="flex items-center justify-center gap-4">
            <a href="mailto:contact@stephenthethird.com"
              className="flex items-center gap-2 px-8 py-3.5 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors">
              <Mail size={13} /> Email
            </a>
            <a href="https://instagram.com/stephenthethird" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 border border-gray-200 text-gray-900 text-[11px] tracking-[0.18em] uppercase hover:border-white/40 transition-colors">
              <Instagram size={13} /> Instagram
            </a>
          </div>
        </Section>
      </section>

      <footer className="border-t border-gray-200 py-8 px-8 flex items-center justify-between">
        <span className="text-gray-300 text-[10px] tracking-[0.2em] uppercase">© {new Date().getFullYear()} Stephenthethird</span>
        <span className="text-gray-200 text-[10px] tracking-[0.2em] uppercase">New York City</span>
      </footer>
    </div>
  );
}
