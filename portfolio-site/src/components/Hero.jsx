import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white">

      {/* Radial amber glow */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(251,191,36,0.06) 0%, transparent 70%)" }} />

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.022]"
        style={{ backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)", backgroundSize: "88px 88px" }} />

      {/* Corner marks */}
      <div className="absolute top-0 left-0 w-24 h-24 border-l border-t border-gray-200" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-r border-b border-gray-200" />

      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">

        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.55em" }}
          animate={{ opacity: 1, letterSpacing: "0.32em" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="text-amber-400/75 text-[10px] uppercase tracking-[0.32em] mb-10 select-none">
          Producer · Multi-Instrumentalist · Songwriter
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.15, ease }}>
          <h1 className="text-gray-900 font-black uppercase leading-[0.88] select-none"
            style={{ fontSize: "clamp(4.5rem, 15.5vw, 12.5rem)", letterSpacing: "-0.03em" }}>
            Stephen
          </h1>
          <h1 className="font-black uppercase leading-[0.88] select-none"
            style={{ fontSize: "clamp(4.5rem, 15.5vw, 12.5rem)", letterSpacing: "-0.03em" }}>
            <span style={{ WebkitTextStroke: "1px rgba(255,255,255,0.18)", color: "transparent" }}>the</span>
            <span className="text-amber-400">Third</span>
          </h1>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.52 }}
          className="text-white/22 text-xs tracking-[0.25em] uppercase mt-10 select-none">
          New York City — 1,779 Bounces &amp; Counting
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.72 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {[
            { value: "1,779+", label: "Original Tracks" },
            { value: "30+",    label: "Artists" },
            { value: "Hip-Hop · R&B · Pop", label: "Genres" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-gray-900 font-bold text-xl tracking-tight">{value}</div>
              <div className="text-gray-400 text-[10px] tracking-[0.18em] uppercase mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.98 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <a href="#catalog"
            className="px-9 py-3.5 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors duration-200">
            View Catalog
          </a>
          <a href="#credits"
            className="px-9 py-3.5 border border-gray-200 text-gray-700 text-[11px] tracking-[0.18em] uppercase hover:border-white/40 hover:text-gray-900 transition-all duration-200">
            Credits
          </a>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-300 select-none">
        <span className="text-[9px] tracking-[0.28em] uppercase">Scroll</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <ChevronDown size={14} />
        </motion.div>
      </motion.div>
    </section>
  );
}
