/**
 * LayoutPortfolio.jsx  — "Jake Marsh" minimalist style
 *
 * Clean, sparse portfolio. Full-bleed hero image, centered nav, light/dark toggle.
 * Swaps in when theme.layout === "portfolio"
 */

import { useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Instagram, Music, Mail, ChevronDown } from "lucide-react";
import creditsData from "../data/creditsData";

const ease = [0.22, 1, 0.36, 1];

// ── Nav ───────────────────────────────────────────────────────────────────
function PortfolioNav() {
  const links = ["Music","Credits","Contact"];
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5">
      <nav className="flex items-center gap-8">
        {links.slice(0,2).map(l => (
          <a key={l} href={`#${l.toLowerCase()}`}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors tracking-wide">{l}</a>
        ))}
      </nav>
      <a href="#" className="text-gray-900 text-sm font-bold tracking-widest">S3</a>
      <nav className="flex items-center gap-8">
        <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors tracking-wide">Contact</a>
        <a href="https://instagram.com/stephenthethird" target="_blank" rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 transition-colors">
          <Instagram size={16} />
        </a>
      </nav>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────
function PortfolioHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start","end start"] });
  const y = useTransform(scrollYProgress, [0,1], ["0%","30%"]);

  return (
    <section ref={ref} className="relative h-screen overflow-hidden flex items-end">
      {/* Parallax bg */}
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        {/* Placeholder — swap with <img src="/portrait.jpg" /> when you have the photo */}
        <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] via-[#0d0d0d] to-[#050505]">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <span className="font-black text-[20vw] uppercase tracking-tighter text-gray-900">S3</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </motion.div>

      {/* Hero text */}
      <div className="relative z-10 px-10 pb-20 w-full">
        <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.9, ease, delay:0.2 }}>
          <p className="text-gray-400 text-xs tracking-[0.4em] uppercase mb-4">
            Producer · Multi-Instrumentalist · Songwriter
          </p>
          <h1 className="text-gray-900 font-black uppercase leading-none mb-6"
            style={{ fontSize:"clamp(3rem,10vw,8rem)", letterSpacing:"-0.03em" }}>
            Stephen<br/>
            <span className="text-amber-400">theThird</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">New York City</p>
        </motion.div>

        <motion.a href="#music" initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:1.2, duration:0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 hover:text-gray-900 transition-colors flex flex-col items-center gap-2">
          <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
          <motion.div animate={{ y:[0,6,0] }} transition={{ repeat:Infinity, duration:1.6 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.a>
      </div>
    </section>
  );
}

// ── Credits list ──────────────────────────────────────────────────────────
function CreditEntry({ credit, index }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-40px 0px" });

  return (
    <motion.div ref={ref} initial={{ opacity:0, x:-20 }}
      animate={inView ? { opacity:1, x:0 } : {}}
      transition={{ delay: index * 0.05, duration: 0.5, ease }}
      className="flex items-center gap-8 py-6 border-b border-gray-200 group hover:border-amber-400/20 transition-colors">
      <span className="text-gray-300 text-xs font-mono w-8 flex-shrink-0">
        {String(index + 1).padStart(2,"0")}
      </span>
      {credit.coverArt && (
        <img src={credit.coverArt} alt={credit.title}
          className="w-12 h-12 object-cover flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white/85 font-medium text-base group-hover:text-gray-900 transition-colors">
          "{credit.title}"
        </h3>
        <p className="text-white/35 text-sm mt-0.5">{credit.artist}</p>
      </div>
      <span className="text-gray-300 text-xs tracking-[0.15em] uppercase flex-shrink-0">{credit.role ?? "Producer"}</span>
      {credit.highlighted && (
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
      )}
    </motion.div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────
export default function LayoutPortfolio() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <PortfolioNav />
      <PortfolioHero />

      {/* Music section */}
      <section id="music" className="max-w-3xl mx-auto px-8 py-24">
        <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.7, ease }}>
          <p className="text-gray-500 text-xs tracking-[0.4em] uppercase mb-2">Music</p>
          <h2 className="text-gray-900 font-black uppercase text-4xl mb-3"
            style={{ letterSpacing:"-0.02em" }}>Songs by Stephen</h2>
          <div className="w-8 h-px bg-amber-400 mb-12" />
        </motion.div>

        <div className="space-y-0">
          {creditsData.map((c, i) => <CreditEntry key={c.id ?? i} credit={c} index={i} />)}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-gray-200 max-w-3xl mx-auto px-8 py-24">
        <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.7, ease }}>
          <p className="text-gray-500 text-xs tracking-[0.4em] uppercase mb-2">Contact</p>
          <h2 className="text-gray-900 font-black uppercase text-4xl mb-8"
            style={{ letterSpacing:"-0.02em" }}>Get In Touch</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-10 max-w-sm">
            Available for production, co-writes, sync placements, and sessions.
            Based in New York City.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="mailto:contact@stephenthethird.com"
              className="inline-flex items-center gap-2.5 text-sm text-black bg-white px-8 py-3.5 font-medium hover:bg-amber-400 transition-colors">
              <Mail size={14} /> contact@stephenthethird.com
            </a>
            <a href="https://instagram.com/stephenthethird" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-sm text-gray-500 border border-gray-200 px-8 py-3.5 hover:border-white/40 hover:text-gray-900 transition-colors">
              <Instagram size={14} /> @stephenthethird
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-gray-200 px-10 py-8 flex items-center justify-between">
        <span className="text-gray-300 text-xs tracking-widest">© {new Date().getFullYear()} Stephen Fealy III</span>
        <span className="text-gray-200 text-xs tracking-widest">New York City</span>
      </footer>
    </div>
  );
}
