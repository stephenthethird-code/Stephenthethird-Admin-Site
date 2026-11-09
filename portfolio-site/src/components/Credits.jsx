import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ExternalLink } from "lucide-react";
import creditsData from "../data/creditsData";

const ease   = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.65, ease } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

function InView({ children, className = "", id }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div ref={ref} id={id} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={className}>
      {children}
    </motion.div>
  );
}

function Pill({ role, amber }) {
  return (
    <span className={`inline-block text-[10px] px-2.5 py-1 tracking-[0.12em] uppercase border font-medium ${
      amber ? "border-amber-400/40 text-amber-400" : "border-gray-200 text-white/35"}`}>
      {role}
    </span>
  );
}

function Cover({ src, alt }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
      {!err
        ? <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-cover" />
        : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.4"><circle cx="12" cy="12" r="10"/><path d="M9 12h6M12 9v6"/></svg>
      }
    </div>
  );
}

function FeaturedCard({ credit }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.article ref={ref} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease }}
      className="relative overflow-hidden border border-gray-200 hover:border-amber-400/20 transition-colors duration-300 group mb-2">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.045) 0%,transparent 55%)" }} />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-12">
        <div className="relative flex-shrink-0">
          <Cover src={credit.cover} alt={credit.title} />
          <span className="absolute top-0 left-0 bg-amber-400 text-black text-[8px] font-black tracking-[0.1em] uppercase px-2 py-0.5">
            Featured
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-400 text-[10px] tracking-[0.22em] uppercase font-medium">{credit.year}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 text-[10px]">{credit.genre}</span>
          </div>
          <h3 className="text-gray-900 font-black uppercase leading-tight mb-1"
            style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)", letterSpacing: "-0.01em" }}>
            {credit.title}
          </h3>
          <p className="text-white/45 text-sm mb-1">{credit.artist}</p>
          <p className="text-gray-400 text-xs mb-5">ft. {credit.featuring}</p>
          <p className="text-white/32 text-sm leading-relaxed max-w-xl mb-6">{credit.description}</p>

          {credit.credits && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 border border-gray-200 bg-white/[0.02]">
              {[["Produced by", credit.credits.producers], ["Written by", credit.credits.songwriters], ["Engineered by", credit.credits.engineers]].map(([label, list]) =>
                list?.length > 0 && (
                  <div key={label}>
                    <p className="text-white/22 text-[9px] tracking-[0.18em] uppercase mb-1.5">{label}</p>
                    <p className="text-white/55 text-xs leading-relaxed">{list.join(", ")}</p>
                  </div>
                )
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {credit.roles.map(r => <Pill key={r} role={r} amber />)}
            {credit.spotifyUrl && (
              <a href={credit.spotifyUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-900 tracking-[0.12em] uppercase transition-colors ml-2">
                <ExternalLink size={11} /> Spotify
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CreditRow({ credit, index, isOpen, onToggle }) {
  return (
    <motion.div variants={fadeUp} custom={index} className="border-b border-gray-200 last:border-0">
      <button onClick={onToggle}
        className="w-full flex items-center gap-5 py-5 px-1 text-left hover:bg-gray-100/[0.02] transition-colors duration-150">
        <span className="text-white/22 text-[10px] tracking-[0.15em] uppercase w-10 flex-shrink-0">{credit.year}</span>
        <div className="flex-1 min-w-0">
          <span className="text-white/90 font-semibold text-sm truncate block">{credit.title}</span>
          <span className="text-white/35 text-xs">{credit.artist}</span>
        </div>
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {credit.roles.map(r => <Pill key={r} role={r} amber={isOpen} />)}
        </div>
        <span className="hidden lg:block text-gray-300 text-[10px] flex-shrink-0 w-40 text-right">{credit.genre}</span>
        <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 ml-2 text-gray-400">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="7" y1="1" x2="7" y2="13"/>
            <line x1="1" y1="7" x2="13" y2="7" style={{ opacity: isOpen ? 0 : 1, transition: "opacity 0.2s" }}/>
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div key="p" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease }} className="overflow-hidden">
            <div className="pl-[3.75rem] pr-4 pb-6 pt-1 border-l-2 border-amber-400/20 ml-1">
              <p className="text-white/22 text-xs mb-2">ft. {credit.featuring}</p>
              <p className="text-white/38 text-sm leading-relaxed max-w-xl mb-4">{credit.description}</p>
              {credit.credits && (
                <div className="flex flex-wrap gap-6 mb-4 text-xs">
                  {[["Produced by", credit.credits.producers], ["Written by", credit.credits.songwriters]].map(([label, list]) =>
                    list?.length > 0 && (
                      <div key={label}>
                        <p className="text-white/22 text-[9px] tracking-[0.18em] uppercase mb-1">{label}</p>
                        <p className="text-white/55">{list.join(", ")}</p>
                      </div>
                    )
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-3 md:hidden">
                {credit.roles.map(r => <Pill key={r} role={r} amber />)}
              </div>
              {credit.spotifyUrl && (
                <a href={credit.spotifyUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-amber-400/55 hover:text-amber-400 tracking-[0.12em] uppercase transition-colors">
                  <ExternalLink size={11} /> Listen on Spotify
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Credits() {
  const [openId, setOpenId] = useState(null);
  const featured = creditsData.filter(c => c.highlighted);
  const rest      = creditsData.filter(c => !c.highlighted);

  return (
    <section id="credits" className="bg-white py-28 md:py-36 px-6">
      <div className="max-w-7xl mx-auto">
        <InView className="mb-16">
          <motion.p variants={fadeUp} className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-4">Portfolio</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-gray-900 font-black uppercase leading-none mb-5"
            style={{ fontSize: "clamp(2.6rem,7vw,5.5rem)", letterSpacing: "-0.025em" }}>
            Credits
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-white/38 text-sm leading-relaxed max-w-lg">
            Production and songwriting work across artists, genres, and sessions. Updated as new placements drop.
          </motion.p>
        </InView>

        {featured.map(c => <FeaturedCard key={c.id} credit={c} />)}

        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-white/18 text-[10px] tracking-[0.28em] uppercase">Full List</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <InView>
          {rest.map((credit, i) => (
            <CreditRow key={credit.id} credit={credit} index={i}
              isOpen={openId === credit.id}
              onToggle={() => setOpenId(openId === credit.id ? null : credit.id)} />
          ))}
        </InView>

        <p className="text-gray-300 text-[10px] tracking-[0.2em] uppercase mt-12 text-center">
          More credits added as placements are confirmed —{" "}
          <a href="#contact" className="text-amber-400/55 hover:text-amber-400 transition-colors">drop a link</a>
        </p>
      </div>
    </section>
  );
}
