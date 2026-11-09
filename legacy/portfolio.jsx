import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search, X, ExternalLink, ChevronDown,
  Mail, Instagram, Music2, Disc3, Mic2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CREDITS DATA
// Source: portfolio_data.json + manually verified from Spotify / search
// Add new entries here as you land placements. "highlighted: true" = featured row.
// ─────────────────────────────────────────────────────────────────────────────
const creditsData = [
  {
    id: 1,
    title: "crying inside my room",
    artist: "overtonight",
    featuring: "Boysarerollingmusic & Stephenthethird",
    year: 2025,
    roles: ["Producer", "Songwriter"],
    genre: "Indie / Alternative",
    spotifyUrl: "https://open.spotify.com/track/6A73sJlj047eyjzeytrWzD",
    cover: "crying_inside_my_room.jpg",
    highlighted: true,
    description: "Released on Spotify & Apple Music. Part of the album 'it's over tonight'.",
  },
  {
    id: 2,
    title: "ECSTASY",
    artist: "Joony",
    featuring: "Stephenthethird",
    year: 2025,
    roles: ["Producer"],
    genre: "Hip-Hop / R&B",
    spotifyUrl: null,
    cover: "ecstasy_cover.jpg",
    highlighted: false,
    description: "Session produced by Stephenthethird.",
  },
  {
    id: 3,
    title: "SHADOW OVER TONIGHT",
    artist: "Overtonight",
    featuring: "P. Don, Stephen, Chaos",
    year: 2025,
    roles: ["Producer", "Songwriter"],
    genre: "R&B / Pop",
    spotifyUrl: null,
    cover: "shadow_cover.jpg",
    highlighted: false,
    description: "Collaborative production session.",
  },
  {
    id: 4,
    title: "HOLD ME DOWN",
    artist: "Kaycyy",
    featuring: "Stephenthethird",
    year: 2025,
    roles: ["Producer"],
    genre: "Hip-Hop",
    spotifyUrl: null,
    cover: "hold_me_down_cover.jpg",
    highlighted: false,
    description: "Beat produced and arranged by Stephenthethird.",
  },
  {
    id: 5,
    title: "SUNDOWN",
    artist: "Zenaide Castellano Pucci",
    featuring: "Stephenthethird",
    year: 2025,
    roles: ["Producer", "Songwriter"],
    genre: "Pop / R&B",
    spotifyUrl: null,
    cover: "sundown_cover.jpg",
    highlighted: false,
    description: "Studio collaboration between Zenaide and Stephenthethird.",
  },
  {
    id: 6,
    title: "wish you well",
    artist: "Stephenthethird",
    featuring: "Max Kruger, Farsight, Kat Lightning, Boysarerolling",
    year: 2024,
    roles: ["Producer", "Songwriter", "Artist"],
    genre: "Pop / Alternative",
    spotifyUrl: null,
    cover: "wish_you_well_cover.jpg",
    highlighted: false,
    description: "198 BPM — multi-artist collaborative record.",
  },
  {
    id: 7,
    title: "last night MIA",
    artist: "Don Mills",
    featuring: "Stephenthethird",
    year: 2024,
    roles: ["Producer"],
    genre: "Hip-Hop / Rap",
    spotifyUrl: null,
    cover: "last_night_mia_cover.jpg",
    highlighted: false,
    description: "92 BPM session with Don Mills.",
  },
  {
    id: 8,
    title: "thru the floor",
    artist: "Farsight",
    featuring: "Stephenthethird",
    year: 2024,
    roles: ["Producer", "Co-Producer"],
    genre: "Alternative / Electronic",
    spotifyUrl: null,
    cover: "thru_the_floor_cover.jpg",
    highlighted: false,
    description: "170 BPM — high-energy electronic collab.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK BEATS — shown if localhost:5050 is unreachable
// Pulled from actual bounce filenames / terminal log
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_BEATS = [
  { id: 1,  name: "cabin in the woods",      bpm: 120, collaborators: "stephenthethird",                  date: "2025-01-15" },
  { id: 2,  name: "solvent",                  bpm: 142, collaborators: "stephenthethird",                  date: "2025-02-03" },
  { id: 3,  name: "sinewave",                 bpm: 138, collaborators: "stephenthethird",                  date: "2025-01-28" },
  { id: 4,  name: "diaries",                  bpm: 148, collaborators: "stephenthethird",                  date: "2025-03-10" },
  { id: 5,  name: "beachdays",                bpm: 141, collaborators: "stephenthethird",                  date: "2025-02-20" },
  { id: 6,  name: "welcome",                  bpm: 120, collaborators: "boys, ffar, stephen",             date: "2025-01-05" },
  { id: 7,  name: "oh no",                    bpm: 81,  collaborators: "stephenthethird, ffarsight",       date: "2024-12-14" },
  { id: 8,  name: "FREEFROMBELOW",            bpm: 151, collaborators: "stephenthethird",                  date: "2025-03-01" },
  { id: 9,  name: "thru the floor v2",        bpm: 170, collaborators: "Farsight, Stephenthethird",        date: "2024-11-30" },
  { id: 10, name: "HAPPYTRAP",                bpm: 154, collaborators: "Stephen, Evan, Marko",             date: "2024-12-20" },
  { id: 11, name: "imgonnasavethis",          bpm: 88,  collaborators: "stephen, samiyy",                  date: "2025-01-10" },
  { id: 12, name: "DREAMON",                  bpm: 128, collaborators: "stephenthethird",                  date: "2025-02-14" },
  { id: 13, name: "ECSTASY",                  bpm: null, collaborators: "Joony, Stephenthethird",          date: "2025-03-05" },
  { id: 14, name: "HOLD ME DOWN",             bpm: 123, collaborators: "Kaycyy, Stephen",                  date: "2025-02-28" },
  { id: 15, name: "SUNDOWN",                  bpm: 80,  collaborators: "Zenaide, Stephen",                 date: "2025-03-15" },
  { id: 16, name: "TRUSTNO(ONE)",             bpm: 110, collaborators: "stephenthethird",                  date: "2024-12-01" },
  { id: 17, name: "BOSSUP",                   bpm: 124, collaborators: "VVD, Stephen",                     date: "2024-11-15" },
  { id: 18, name: "Good Ass Day",             bpm: 113, collaborators: "Stephenthethird x Artclass",       date: "2025-01-22" },
  { id: 19, name: "wish you well",            bpm: 198, collaborators: "MaxKruger, Stephen, Farsight",     date: "2024-10-30" },
  { id: 20, name: "EYEZ BLEED",               bpm: 169, collaborators: "Stephen x Don Mills",              date: "2024-12-08" },
  { id: 21, name: "AA3",                      bpm: 160, collaborators: "MikeWavvs, Stephenthethird",       date: "2025-01-18" },
  { id: 22, name: "SOON!",                    bpm: 166, collaborators: "NDK, Stephen, SLXSH",              date: "2025-02-10" },
  { id: 23, name: "tardy",                    bpm: 145, collaborators: "VVD, stephenthethird",             date: "2024-11-20" },
  { id: 24, name: "LOOKALIKE",                bpm: 165, collaborators: "Stephen, Emman",                   date: "2025-03-20" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Wraps a section with InView-triggered stagger animation */
function AnimatedSection({ children, className = "", id }) {
  const ref  = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Role pill */
function RolePill({ role, amber = false }) {
  return (
    <span
      className={`inline-block text-[10px] px-2.5 py-1 tracking-[0.12em] uppercase border ${
        amber
          ? "border-amber-400/40 text-amber-400"
          : "border-white/10 text-white/35"
      }`}
    >
      {role}
    </span>
  );
}

/** Section label + heading block (reused across sections) */
function SectionHeading({ eyebrow, headline, body }) {
  return (
    <>
      <motion.p
        variants={fadeUp}
        className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-4"
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        custom={1}
        className="text-white font-black uppercase leading-none mb-5"
        style={{
          fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
          letterSpacing: "-0.025em",
        }}
      >
        {headline}
      </motion.h2>
      {body && (
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-white/38 text-sm leading-relaxed max-w-lg"
        >
          {body}
        </motion.p>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/85 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <a href="#" className="flex items-center gap-2 group">
          <span className="text-white font-black text-sm tracking-[0.25em] uppercase">
            S<span className="text-amber-400">3</span>
          </span>
          <span className="text-white/20 text-xs tracking-[0.1em] uppercase hidden sm:inline">
            Stephenthethird
          </span>
        </a>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            ["#catalog",  "Catalog"],
            ["#credits",  "Credits"],
            ["#contact",  "Contact"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-white/40 hover:text-white text-[11px] tracking-[0.2em] uppercase transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="#contact"
          className="text-[11px] tracking-[0.18em] uppercase px-5 py-2 border border-amber-400/30 text-amber-400 hover:bg-amber-400 hover:text-black transition-all duration-200"
        >
          Inquiries
        </a>
      </div>
    </motion.nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_60%,rgba(251,191,36,0.055)_0%,transparent_70%)]" />

      {/* Grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: "90px 90px",
        }}
      />

      {/* Top-left corner decoration */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-white/[0.06]" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-white/[0.06]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.32em" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="text-amber-400/80 text-[10px] uppercase tracking-[0.32em] mb-10"
        >
          Producer · Multi-Instrumentalist · Songwriter
        </motion.p>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="text-white font-black uppercase leading-[0.88] select-none"
            style={{
              fontSize: "clamp(4.5rem, 16vw, 14rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Stephen
          </h1>
          <h1
            className="font-black uppercase leading-[0.88] select-none"
            style={{
              fontSize: "clamp(4.5rem, 16vw, 14rem)",
              letterSpacing: "-0.03em",
              WebkitTextStroke: "1px rgba(255,255,255,0.18)",
              color: "transparent",
            }}
          >
            the
            <span
              className="text-amber-400"
              style={{ WebkitTextStroke: "0px" }}
            >
              Third
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-white/25 text-xs tracking-[0.25em] uppercase mt-10"
        >
          New York City — 1,779 Bounces &amp; Counting
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-14 gap-y-6"
        >
          {[
            { value: "1,779+",              label: "Original Tracks"  },
            { value: "30+",                 label: "Artists"          },
            { value: "Hip-Hop · R&B · Pop", label: "Genres"           },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-white font-bold text-xl tracking-tight">{value}</div>
              <div className="text-white/25 text-[10px] tracking-[0.18em] uppercase mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.95 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#catalog"
            className="px-9 py-3.5 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors duration-200"
          >
            View Catalog
          </a>
          <a
            href="#credits"
            className="px-9 py-3.5 border border-white/15 text-white text-[11px] tracking-[0.18em] uppercase hover:border-white/40 transition-colors duration-200"
          >
            Credits
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/15"
      >
        <span className="text-[9px] tracking-[0.25em] uppercase">Scroll</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <ChevronDown size={14} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG / BOUNCES
// ─────────────────────────────────────────────────────────────────────────────
function Catalog() {
  const [beats,   setBeats]   = useState(FALLBACK_BEATS);
  const [search,  setSearch]  = useState("");
  const [apiLive, setApiLive] = useState(false);

  // Try to pull live data from the S3 Hub (localhost:5050)
  useEffect(() => {
    const controller = new AbortController();
    fetch("http://localhost:5050/api/beats", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBeats(data);
          setApiLive(true);
        }
      })
      .catch(() => {
        // Silently fall back — FALLBACK_BEATS already set
      });
    return () => controller.abort();
  }, []);

  const filtered = beats.filter((b) => {
    const q = search.toLowerCase();
    const name  = (b.name  || b.filename || "").toLowerCase();
    const collab = (b.collaborators || b.artists || "").toLowerCase();
    return name.includes(q) || collab.includes(q);
  });

  return (
    <section id="catalog" className="bg-[#070707] py-28 md:py-36 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <AnimatedSection className="mb-14">
          <SectionHeading
            eyebrow="Archive"
            headline="Bounces"
            body={`A living archive of ${beats.length.toLocaleString()}+ original productions — beats, records, and sessions from the vault.${
              apiLive ? "" : " (Preview mode — connect to S3 Hub for full playback)"
            }`}
          />
        </AnimatedSection>

        {/* Search bar */}
        <div className="relative max-w-sm mb-3">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, collaborator…"
            className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm pl-10 pr-10 py-3 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors duration-200 rounded-none"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white"
              >
                <X size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Count */}
        <p className="text-white/20 text-[10px] tracking-[0.2em] uppercase mb-8">
          {filtered.length.toLocaleString()} tracks
        </p>

        {/* Beat grid */}
        <AnimatedSection className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-white/[0.04]">
          {filtered.slice(0, 60).map((beat, i) => (
            <BeatCard key={beat.id ?? i} beat={beat} index={i} />
          ))}
        </AnimatedSection>

        {filtered.length > 60 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white/20 text-[10px] tracking-[0.2em] uppercase mt-10"
          >
            Showing 60 of {filtered.length.toLocaleString()} — open S3 Hub for full library
          </motion.p>
        )}
      </div>
    </section>
  );
}

function BeatCard({ beat, index }) {
  const name  = beat.name || beat.filename || "untitled";
  const bpm   = beat.bpm ?? null;
  const collab = beat.collaborators || beat.artists || "—";

  return (
    <motion.div
      variants={fadeUp}
      custom={index % 6}
      className="bg-[#0C0C0C] p-5 group hover:bg-[#131313] transition-colors duration-200 cursor-default"
    >
      {/* Accent bar */}
      <div className="h-px w-5 bg-amber-400/35 mb-4 group-hover:w-10 group-hover:bg-amber-400 transition-all duration-300 ease-out" />

      <p className="text-white text-sm font-medium leading-snug capitalize truncate mb-3">
        {name}
      </p>

      <div className="space-y-1">
        {bpm && (
          <p className="text-white/25 text-[10px] tracking-wide">{bpm} bpm</p>
        )}
        <p className="text-white/18 text-[10px] truncate">{collab}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDITS / PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────
function Credits() {
  const [open, setOpen] = useState(null);
  const featured = creditsData.filter((c) => c.highlighted);
  const rest      = creditsData.filter((c) => !c.highlighted);

  return (
    <section id="credits" className="bg-[#050505] py-28 md:py-36 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <AnimatedSection className="mb-16">
          <SectionHeading
            eyebrow="Portfolio"
            headline="Credits"
            body="Production and songwriting work across artists, genres, and sessions. Updated as new placements drop."
          />
        </AnimatedSection>

        {/* ── FEATURED CREDIT ────────────────────────────── */}
        {featured.map((c) => (
          <FeaturedCredit key={c.id} credit={c} />
        ))}

        {/* ── DIVIDER ────────────────────────────────────── */}
        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-white/20 text-[10px] tracking-[0.25em] uppercase">Full List</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* ── CREDITS LIST ───────────────────────────────── */}
        <AnimatedSection className="divide-y divide-white/[0.05]">
          {rest.map((credit, i) => (
            <CreditRow
              key={credit.id}
              credit={credit}
              index={i}
              isOpen={open === credit.id}
              onToggle={() => setOpen(open === credit.id ? null : credit.id)}
            />
          ))}
        </AnimatedSection>

        {/* Add-more CTA */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
          className="text-white/15 text-[10px] tracking-[0.2em] uppercase mt-12 text-center"
        >
          More credits added as placements are confirmed —{" "}
          <a href="#contact" className="text-amber-400/60 hover:text-amber-400 transition-colors">
            drop a link
          </a>
        </motion.p>
      </div>
    </section>
  );
}

// ── Featured Card (top placement) ─────────────────────────────────────────────
function FeaturedCredit({ credit }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden border border-white/[0.08] hover:border-amber-400/20 transition-colors duration-400 group mb-2"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.04] via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-12">

        {/* Cover art */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 bg-white/[0.04] border border-white/[0.06] overflow-hidden">
          <img
            src={credit.cover}
            alt={credit.title}
            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.innerHTML = `
                <div class="w-full h-full flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.4)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                </div>`;
            }}
          />
          {/* "FEATURED" badge */}
          <div className="absolute top-0 left-0 bg-amber-400 text-black text-[8px] font-black tracking-[0.15em] uppercase px-2 py-0.5">
            Featured
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-400 text-[10px] tracking-[0.22em] uppercase">{credit.year}</span>
            <span className="text-white/15">·</span>
            <span className="text-white/30 text-[10px] tracking-wider">{credit.genre}</span>
          </div>

          <h3
            className="text-white font-black uppercase leading-tight mb-1"
            style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)", letterSpacing: "-0.01em" }}
          >
            {credit.title}
          </h3>

          <p className="text-white/45 text-sm mb-1">{credit.artist}</p>
          <p className="text-white/25 text-xs mb-5">ft. {credit.featuring}</p>

          <p className="text-white/30 text-sm mb-6 max-w-md leading-relaxed">
            {credit.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {credit.roles.map((r) => <RolePill key={r} role={r} amber />)}
            {credit.spotifyUrl && (
              <a
                href={credit.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white tracking-[0.12em] uppercase transition-colors ml-2"
              >
                <ExternalLink size={11} />
                Spotify
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Credits List Row (accordion) ───────────────────────────────────────────────
function CreditRow({ credit, index, isOpen, onToggle }) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-6 py-5 text-left group hover:bg-white/[0.015] transition-colors duration-150 px-1"
      >
        {/* Year */}
        <span className="text-white/20 text-[10px] tracking-[0.15em] uppercase w-10 flex-shrink-0 tabular-nums">
          {credit.year}
        </span>

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <span className="text-white font-semibold text-sm group-hover:text-white transition-colors truncate block">
            {credit.title}
          </span>
          <span className="text-white/35 text-xs">{credit.artist}</span>
        </div>

        {/* Roles (desktop) */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {credit.roles.map((r) => (
            <RolePill key={r} role={r} amber={isOpen} />
          ))}
        </div>

        {/* Genre */}
        <span className="hidden lg:block text-white/20 text-[10px] tracking-wider flex-shrink-0 w-36 text-right">
          {credit.genre}
        </span>

        {/* Expand icon */}
        <div className="flex-shrink-0 ml-2">
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 flex items-center justify-center"
          >
            <span className="block w-3 h-px bg-white/30 relative">
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 block h-3 w-px bg-white/30"
                style={{ transition: "opacity 0.2s", opacity: isOpen ? 0 : 1 }}
              />
            </span>
          </motion.div>
        </div>
      </button>

      {/* Expanded detail panel */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-16 pr-4 pb-6 pt-1 border-l border-amber-400/15 ml-1">
              <p className="text-white/25 text-xs mb-1">ft. {credit.featuring}</p>
              <p className="text-white/35 text-sm leading-relaxed max-w-xl mb-4">
                {credit.description}
              </p>

              {/* Mobile roles */}
              <div className="flex flex-wrap gap-2 mb-3 md:hidden">
                {credit.roles.map((r) => <RolePill key={r} role={r} amber />)}
              </div>

              {credit.spotifyUrl && (
                <a
                  href={credit.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-amber-400/50 hover:text-amber-400 tracking-[0.12em] uppercase transition-colors"
                >
                  <ExternalLink size={11} />
                  Listen on Spotify
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section
      id="contact"
      className="bg-[#070707] py-28 md:py-36 px-6 border-t border-white/[0.05]"
    >
      <div className="max-w-7xl mx-auto">
        <AnimatedSection className="text-center">
          <motion.p
            variants={fadeUp}
            className="text-amber-400 text-[10px] tracking-[0.35em] uppercase mb-6"
          >
            Get In Touch
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-white font-black uppercase leading-none mb-8"
            style={{
              fontSize: "clamp(2.8rem, 8vw, 6rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Work Together
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-white/35 text-sm leading-relaxed max-w-md mx-auto mb-14"
          >
            Available for production, co-writes, sync placements, and sessions.
            Based in New York City.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="mailto:contact@stephenthethird.com"
              className="flex items-center gap-2.5 px-9 py-4 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors duration-200"
            >
              <Mail size={13} />
              Email
            </a>
            <a
              href="https://instagram.com/stephenthethird"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-9 py-4 border border-white/15 text-white text-[11px] tracking-[0.18em] uppercase hover:border-white/40 transition-colors duration-200"
            >
              <Instagram size={13} />
              Instagram
            </a>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-black border-t border-white/[0.05] py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-white/15 text-[10px] tracking-[0.22em] uppercase">
          © {new Date().getFullYear()} Stephenthethird · New York City
        </span>
        <div className="flex items-center gap-5">
          <a
            href="https://open.spotify.com/playlist/1XgTbRLuT8tYNiwVs6cT2K"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/15 hover:text-amber-400 transition-colors duration-200"
          >
            <Disc3 size={14} />
          </a>
          <a
            href="https://instagram.com/stephenthethird"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/15 hover:text-amber-400 transition-colors duration-200"
          >
            <Instagram size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased">
      <Nav />
      <Hero />
      <Catalog />
      <Credits />
      <Contact />
      <Footer />
    </div>
  );
}
