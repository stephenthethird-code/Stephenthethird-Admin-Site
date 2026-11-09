/**
 * AdminAnalytics.jsx  →  /admin/analytics
 * Overview: catalog income, streams, PRO gaps, project pipeline, follow-up todos.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Music2, TrendingUp, DollarSign, AlertTriangle, Layers,
  Clock, CheckCircle2, Activity, BarChart2, ChevronRight,
  Wifi, FileMusic, Star,
} from "lucide-react";
import AdminShell       from "../components/admin/AdminShell";
import { useAdminData } from "../context/AdminDataContext";
import { CATALOG, TOTAL_STREAMS } from "../data/catalogData";
import { TYPE_COLORS, PROJECT_COLS } from "../data/projectsStore";

const EASE = [0.22, 1, 0.36, 1];
const FADE = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: EASE, delay },
});

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function fmtMoney(n) {
  if (n == null || n === 0) return "$0";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Mini bar ──────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color = "#f59e0b" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: EASE }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ Icon, color, value, label, sub, delay = 0 }) {
  return (
    <motion.div {...FADE(delay)}
      className="bg-white border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: color + "18" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">{label}</span>
      </div>
      <p className="text-gray-900 font-black text-3xl tabular-nums">{value}</p>
      {sub && <p className="text-gray-400 text-[10px]">{sub}</p>}
    </motion.div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, Icon, children, delay = 0, action }) {
  return (
    <motion.div {...FADE(delay)} className="bg-white border border-gray-200">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-amber-500" />
          <h3 className="text-gray-900 text-[11px] font-black tracking-[0.2em] uppercase">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  executed:     { label: "Released", color: "#10b981" },
  waiting:      { label: "Waiting",  color: "#f59e0b" },
  not_released: { label: "Unreleased", color: "#6b7280" },
};

export default function AdminAnalytics() {
  const adminData = useAdminData();
  const projects  = adminData?.projects  ?? [];
  const followups = adminData?.followups ?? [];

  // ── Catalog-derived stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalStreams    = TOTAL_STREAMS;
    const advReceived    = CATALOG.filter(s => s.advanceStatus === "received").reduce((a, s) => a + (s.advance || 0), 0);
    const advWaiting     = CATALOG.filter(s => s.advanceStatus === "waiting").reduce((a, s) => a + (s.advance || 0), 0);
    const proGaps        = CATALOG.filter(s => s.status === "executed" && (!s.claimedPub || !s.mlc)).length;
    const releasedCount  = CATALOG.filter(s => s.streams != null).length;
    const activeProjects = projects.filter(p => p.col === "current").length;
    const pendingTodos   = followups.filter(f => f.status === "pending").length;
    return { totalStreams, advReceived, advWaiting, proGaps, releasedCount, activeProjects, pendingTodos };
  }, [projects, followups]);

  // ── Top songs by streams ──────────────────────────────────────────────────
  const topSongs = useMemo(() =>
    [...CATALOG]
      .filter(s => s.streams != null)
      .sort((a, b) => (b.streams || 0) - (a.streams || 0))
      .slice(0, 8)
  , []);
  const maxStreams = topSongs[0]?.streams || 1;

  // ── Catalog status breakdown ──────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const map = {};
    CATALOG.forEach(s => { map[s.status] = (map[s.status] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);

  // ── Advances by artist ────────────────────────────────────────────────────
  const advByArtist = useMemo(() => {
    const map = {};
    CATALOG.filter(s => s.advance > 0).forEach(s => {
      if (!map[s.artist]) map[s.artist] = { received: 0, waiting: 0 };
      if (s.advanceStatus === "received") map[s.artist].received += s.advance;
      if (s.advanceStatus === "waiting")  map[s.artist].waiting  += s.advance;
    });
    return Object.entries(map)
      .sort((a, b) => (b[1].received + b[1].waiting) - (a[1].received + a[1].waiting))
      .slice(0, 6);
  }, []);
  const maxAdv = Math.max(...advByArtist.map(([, v]) => v.received + v.waiting), 1);

  // ── PRO registration gaps ─────────────────────────────────────────────────
  const proGaps = useMemo(() =>
    CATALOG.filter(s => s.status === "executed" && (!s.claimedPub || !s.mlc || !s.bmi))
      .slice(0, 6)
  , []);

  // ── Project pipeline ──────────────────────────────────────────────────────
  const pipelineCols = useMemo(() =>
    PROJECT_COLS.map(col => ({
      ...col,
      count: projects.filter(p => p.col === col.id).length,
      projects: projects.filter(p => p.col === col.id).slice(0, 3),
    }))
  , [projects]);

  const COL_COLORS = { current:"#10b981", upcoming:"#3b82f6", hold:"#f59e0b", past:"#6b7280" };

  // ── Follow-ups ────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const overdue = useMemo(() =>
    followups.filter(f => f.status === "pending" && f.due_date && f.due_date < today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5)
  , [followups, today]);

  const upcoming = useMemo(() =>
    followups.filter(f => f.status === "pending" && f.due_date && f.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5)
  , [followups, today]);

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-7xl">

        {/* Header */}
        <motion.div {...FADE(0)}>
          <h1 className="text-gray-900 font-black text-lg tracking-tight">Analytics</h1>
          <p className="text-gray-400 text-xs mt-0.5">Catalog income, streams, PRO status, projects & to-dos</p>
        </motion.div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard Icon={Wifi}         color="#f59e0b" value={fmt(stats.totalStreams)}  label="Total Streams"    sub={`${stats.releasedCount} songs`}          delay={0.05} />
          <StatCard Icon={DollarSign}   color="#10b981" value={fmtMoney(stats.advReceived)} label="Advances In"  sub="received"                                 delay={0.1}  />
          <StatCard Icon={Clock}        color="#f97316" value={fmtMoney(stats.advWaiting)}  label="Money Owed"   sub="waiting on payment"                       delay={0.15} />
          <StatCard Icon={AlertTriangle} color="#ef4444" value={stats.proGaps}           label="PRO Gaps"        sub="missing claims"                          delay={0.2}  />
          <StatCard Icon={Music2}       color="#8b5cf6" value={CATALOG.length}            label="Catalog Size"   sub="total songs"                              delay={0.25} />
          <StatCard Icon={Layers}       color="#3b82f6" value={stats.activeProjects}      label="Active Projects" sub="in current"                             delay={0.3}  />
          <StatCard Icon={CheckCircle2} color="#6b7280" value={stats.pendingTodos}        label="Open To-Dos"    sub="follow-ups pending"                       delay={0.35} />
        </div>

        {/* Row 2: Top Songs + Status breakdown */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Top songs by streams */}
          <div className="md:col-span-2">
            <Section title="Top Songs by Streams" Icon={TrendingUp} delay={0.1}>
              <div className="space-y-3">
                {topSongs.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-gray-300 text-[10px] tabular-nums w-4 text-right">{i + 1}</span>
                    <div className="min-w-0 w-40 flex-shrink-0">
                      <p className="text-gray-700 text-xs truncate font-medium">{s.title}</p>
                      <p className="text-gray-400 text-[10px] truncate">{s.artist}</p>
                    </div>
                    <MiniBar value={s.streams} max={maxStreams} color="#f59e0b" />
                    <span className="text-gray-900 text-xs font-bold tabular-nums w-12 text-right">{fmt(s.streams)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Catalog status */}
          <Section title="Catalog Status" Icon={FileMusic} delay={0.15}>
            <div className="space-y-4">
              {statusBreakdown.map(([status, count]) => {
                const cfg = STATUS_CFG[status] || { label: status, color: "#6b7280" };
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <span className="text-gray-600 text-xs w-20 flex-shrink-0">{cfg.label}</span>
                    <MiniBar value={count} max={CATALOG.length} color={cfg.color} />
                    <span className="text-gray-900 text-xs font-bold tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}

              {/* Publishing claim coverage */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase">Pub Claim Coverage</p>
                {[
                  { label: "Pub Claimed", key: "claimedPub", color: "#10b981" },
                  { label: "MLC Filed",   key: "mlc",        color: "#3b82f6" },
                  { label: "BMI Filed",   key: "bmi",        color: "#8b5cf6" },
                ].map(({ label, key, color }) => {
                  const n = CATALOG.filter(s => s[key]).length;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-gray-500 text-[10px] w-20 flex-shrink-0">{label}</span>
                      <MiniBar value={n} max={CATALOG.length} color={color} />
                      <span className="text-gray-600 text-[10px] tabular-nums w-8 text-right">{n}/{CATALOG.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        {/* Row 3: Advances by Artist + PRO Gaps */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Advances breakdown */}
          <Section title="Advances by Artist" Icon={DollarSign} delay={0.2}>
            {advByArtist.length === 0
              ? <p className="text-gray-300 text-xs">No advance data</p>
              : (
                <div className="space-y-3">
                  {advByArtist.map(([artist, vals]) => {
                    const total = vals.received + vals.waiting;
                    return (
                      <div key={artist}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600 text-xs truncate max-w-[160px]">{artist}</span>
                          <div className="flex gap-2 items-center flex-shrink-0">
                            {vals.received > 0 && <span className="text-[10px] text-green-500 font-bold">+{fmtMoney(vals.received)}</span>}
                            {vals.waiting  > 0 && <span className="text-[10px] text-orange-400 font-bold">⏳{fmtMoney(vals.waiting)}</span>}
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(vals.received / maxAdv) * 100}%` }}
                            transition={{ duration: 0.8, ease: EASE }}
                            className="h-full bg-green-400 rounded-l-full"
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(vals.waiting / maxAdv) * 100}%` }}
                            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
                            className="h-full bg-orange-400 rounded-r-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-gray-400 text-[10px]">Received</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-gray-400 text-[10px]">Waiting</span></div>
                  </div>
                </div>
              )}
          </Section>

          {/* PRO Gaps */}
          <Section title="PRO Registration Gaps" Icon={AlertTriangle} delay={0.25}>
            {proGaps.length === 0
              ? <p className="text-gray-300 text-xs">All songs registered ✓</p>
              : (
                <div className="space-y-2.5">
                  {proGaps.map(s => (
                    <div key={s.id} className="flex items-start gap-3 border border-gray-100 p-2.5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-700 text-xs font-medium truncate">{s.title}</p>
                        <p className="text-gray-400 text-[10px]">{s.artist} · {s.label}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {!s.claimedPub && <span className="bg-red-50 text-red-400 text-[9px] px-1.5 py-0.5 rounded">No Pub</span>}
                          {!s.mlc        && <span className="bg-orange-50 text-orange-400 text-[9px] px-1.5 py-0.5 rounded">No MLC</span>}
                          {!s.bmi        && <span className="bg-yellow-50 text-yellow-600 text-[9px] px-1.5 py-0.5 rounded">No BMI</span>}
                        </div>
                      </div>
                      <span className="text-gray-400 text-[10px] flex-shrink-0">{fmt(s.streams)}</span>
                    </div>
                  ))}
                  {CATALOG.filter(s => s.status === "executed" && (!s.claimedPub || !s.mlc || !s.bmi)).length > 6 && (
                    <p className="text-amber-500 text-[10px] flex items-center gap-1">
                      <ChevronRight size={10} />
                      {CATALOG.filter(s => s.status === "executed" && (!s.claimedPub || !s.mlc || !s.bmi)).length - 6} more gaps — see Income tab
                    </p>
                  )}
                </div>
              )}
          </Section>
        </div>

        {/* Row 4: Project pipeline */}
        <Section title="Project Pipeline" Icon={Layers} delay={0.3}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipelineCols.map(col => (
              <div key={col.id} className="border border-gray-100 p-3 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold" style={{ color: COL_COLORS[col.id] }}>{col.label}</span>
                  <span className="text-gray-900 text-sm font-black tabular-nums">{col.count}</span>
                </div>
                {col.projects.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color || "#6b7280" }} />
                    <span className="text-gray-500 text-[10px] truncate">{p.title}</span>
                  </div>
                ))}
                {col.count === 0 && <p className="text-gray-300 text-[10px]">No projects</p>}
                {col.count > 3 && <p className="text-gray-300 text-[10px]">+{col.count - 3} more</p>}
              </div>
            ))}
          </div>
        </Section>

        {/* Row 5: Follow-up todos */}
        <div className="grid md:grid-cols-2 gap-4">

          <Section title="Overdue To-Dos" Icon={Clock} delay={0.35}>
            {overdue.length === 0
              ? <p className="text-gray-300 text-xs">Nothing overdue 🎉</p>
              : (
                <div className="space-y-2.5">
                  {overdue.map(f => (
                    <div key={f.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-gray-700 text-xs truncate">{f.title}</p>
                        <p className="text-red-400 text-[10px]">{f.due_date} · {f.contact_name || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </Section>

          <Section title="Upcoming To-Dos" Icon={CheckCircle2} delay={0.4}>
            {upcoming.length === 0
              ? <p className="text-gray-300 text-xs">No upcoming tasks</p>
              : (
                <div className="space-y-2.5">
                  {upcoming.map(f => (
                    <div key={f.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-gray-700 text-xs truncate">{f.title}</p>
                        <p className="text-gray-400 text-[10px]">{f.due_date} · {f.contact_name || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </Section>
        </div>

        {/* Artist Social Stats — Placeholder */}
        <motion.div {...FADE(0.45)} className="bg-white border border-dashed border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star size={14} className="text-amber-400" />
            <div>
              <p className="text-gray-700 text-xs font-bold">Artist Social Media Analytics</p>
              <p className="text-gray-400 text-[10px]">Instagram, TikTok, Spotify for Artists — requires API setup</p>
            </div>
          </div>
          <span className="text-gray-300 text-[10px] tracking-widest uppercase">Coming Soon</span>
        </motion.div>

      </div>
    </AdminShell>
  );
}
