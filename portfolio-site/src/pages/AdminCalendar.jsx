/**
 * AdminCalendar.jsx  →  /admin/calendar
 * Studio session booking & scheduling:
 * · Monthly calendar with session blocks
 * · Booking request form (name, date, time, type, notes)
 * · Session status management: pending / confirmed / cancelled
 * · Side panel: upcoming sessions list
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock,
  Music2, Mic2, Sliders, Users, Calendar, CheckCircle2,
  Circle, XCircle, Trash2,
} from "lucide-react";
import AdminShell from "../components/admin/AdminShell";

const EASE = [0.22, 1, 0.36, 1];
const FADE = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: EASE, delay },
});

// ── Session types ─────────────────────────────────────────────────────────────
const SESSION_TYPES = [
  { id: "recording",  label: "Recording",   Icon: Mic2,    color: "#f59e0b" },
  { id: "mixing",     label: "Mixing",      Icon: Sliders, color: "#3b82f6" },
  { id: "collab",     label: "Collab",      Icon: Users,   color: "#ec4899" },
  { id: "production", label: "Production",  Icon: Music2,  color: "#10b981" },
  { id: "other",      label: "Other",       Icon: Calendar,color: "#6b7280" },
];

const TYPE_MAP = Object.fromEntries(SESSION_TYPES.map(t => [t.id, t]));

const STATUS_CFG = {
  pending:   { label: "Pending",   color: "#f59e0b", Icon: Circle       },
  confirmed: { label: "Confirmed", color: "#10b981", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#ef4444", Icon: XCircle      },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); } // 0=Sun
function padDate(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}
const today = () => new Date().toISOString().slice(0, 10);

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_SESSIONS = [
  { id: 1, name: "Don Toliver",  type: "collab",     date: "2026-05-05", time: "14:00", status: "confirmed", notes: "Bring stems from Atlantic session." },
  { id: 2, name: "Kaycyy",       type: "recording",  date: "2026-05-12", time: "11:00", status: "confirmed", notes: "3 songs, tracking vocals." },
  { id: 3, name: "Beat Demo",    type: "production", date: "2026-05-15", time: "16:00", status: "pending",   notes: "Sending loop packs to management." },
  { id: 4, name: "BEAM Mix",     type: "mixing",     date: "2026-05-20", time: "13:00", status: "pending",   notes: "NBA 2K sync final mix." },
];

let _nextId = 100;

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK = { name: "", type: "recording", date: "", time: "12:00", notes: "" };

// ── BookingModal ──────────────────────────────────────────────────────────────
function BookingModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!form.name.trim() || !form.date) return;
    onSave({ ...form, name: form.name.trim() });
  }

  return (
    <motion.div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="bg-white border border-gray-200 shadow-xl w-full max-w-md"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-black text-sm tracking-tight">Book Session</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Artist / client name */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Artist / Client *</label>
            <input
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
              placeholder="e.g. Don Toliver"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>

          {/* Session type */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-2">Session Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map(t => (
                <button key={t.id}
                  onClick={() => set("type", t.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 border text-xs transition-all ${
                    form.type === t.id
                      ? "border-transparent text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                  style={form.type === t.id ? { background: t.color } : {}}>
                  <t.Icon size={11} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Date *</label>
              <input
                type="date"
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
                value={form.date}
                onChange={e => set("date", e.target.value)}
              />
            </div>
            <div>
              <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Time</label>
              <input
                type="time"
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400"
                value={form.time}
                onChange={e => set("time", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-gray-400 text-[10px] tracking-[0.15em] uppercase block mb-1">Notes</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400 resize-none"
              placeholder="Session goals, equipment, bring stems, etc."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={!form.name.trim() || !form.date}
            className="flex-1 py-2.5 bg-gray-900 text-white text-xs hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Save Session
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Session detail panel ──────────────────────────────────────────────────────
function SessionPanel({ session, onClose, onUpdate, onDelete }) {
  const t   = TYPE_MAP[session.type] || TYPE_MAP.other;
  const st  = STATUS_CFG[session.status] || STATUS_CFG.pending;

  return (
    <motion.div {...FADE(0)}
      className="bg-white border border-gray-200 p-5 flex flex-col gap-4 h-full overflow-y-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-gray-900 font-black text-sm">{session.name}</h3>
          <p className="text-gray-400 text-[10px] mt-0.5">{formatDate(session.date)} · {session.time || "—"}</p>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-600 mt-0.5"><X size={15} /></button>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2 p-3 border border-gray-100">
        <t.Icon size={14} style={{ color: t.color }} />
        <span className="text-gray-700 text-xs">{t.label}</span>
      </div>

      {/* Status */}
      <div>
        <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase mb-2">Status</p>
        <div className="flex gap-2">
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button key={key}
              onClick={() => onUpdate({ status: key })}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-[11px] transition-all ${
                session.status === key ? "border-transparent text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={session.status === key ? { background: cfg.color } : {}}>
              <cfg.Icon size={11} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      {session.notes && (
        <div>
          <p className="text-gray-400 text-[10px] tracking-[0.15em] uppercase mb-1.5">Notes</p>
          <p className="text-gray-600 text-xs leading-relaxed">{session.notes}</p>
        </div>
      )}

      {/* Delete */}
      <button onClick={() => { onDelete(session.id); onClose(); }}
        className="flex items-center gap-2 text-red-400 hover:text-red-600 text-xs mt-auto pt-4 border-t border-gray-100 transition-colors">
        <Trash2 size={12} /> Delete session
      </button>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminCalendar() {
  const now    = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sessions, setSessions] = useState(SEED_SESSIONS);
  const [booking,  setBooking]  = useState(null);  // null | { prefill }
  const [selected, setSelected] = useState(null);  // session id

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const days     = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);  // 0=Sun
  const cells    = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    return arr;
  }, [year, month, days, firstDay]);

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function addSession(form) {
    const s = { id: _nextId++, ...form, status: "pending" };
    setSessions(p => [s, ...p]);
    setBooking(null);
  }

  function updateSession(id, patch) {
    setSessions(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function deleteSession(id) {
    setSessions(p => p.filter(s => s.id !== id));
    if (selected === id) setSelected(null);
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const selectedSession = sessions.find(s => s.id === selected);

  // Upcoming sessions (sorted)
  const upcomingSessions = useMemo(() =>
    sessions
      .filter(s => s.date >= today() && s.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 8)
  , [sessions]);

  return (
    <AdminShell>
      <div className="flex h-full">

        {/* ── Left: Calendar ─────────────────────────────────────────────── */}
        <div className="flex-1 p-6 overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-gray-900 font-black text-lg tracking-tight">Calendar</h1>
              <p className="text-gray-400 text-xs mt-0.5">Studio sessions & booking</p>
            </div>
            <button onClick={() => setBooking({})}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-xs hover:bg-amber-500 transition-colors">
              <Plus size={13} /> Book Session
            </button>
          </div>

          {/* Month nav */}
          <div className="flex items-center gap-4 mb-4">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-900 transition-colors"><ChevronLeft size={18} /></button>
            <h2 className="text-gray-900 font-black text-base tracking-tight w-44 text-center">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-900 transition-colors"><ChevronRight size={18} /></button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] tracking-[0.1em] text-gray-400 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="bg-gray-50 min-h-[90px]" />;
              const dateStr = padDate(year, month, day);
              const daySessions = sessionsByDate[dateStr] || [];
              const isToday = dateStr === today();
              return (
                <div key={dateStr}
                  className={`bg-white min-h-[90px] p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-amber-50/40 transition-colors ${isToday ? "ring-1 ring-inset ring-amber-400" : ""}`}
                  onClick={() => setBooking({ date: dateStr })}>
                  <span className={`text-xs font-bold self-end px-1 rounded ${isToday ? "bg-amber-400 text-white" : "text-gray-400"}`}>
                    {day}
                  </span>
                  {daySessions.slice(0, 3).map(s => {
                    const t  = TYPE_MAP[s.type] || TYPE_MAP.other;
                    const st = STATUS_CFG[s.status] || STATUS_CFG.pending;
                    return (
                      <button key={s.id}
                        onClick={e => { e.stopPropagation(); setSelected(s.id); }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white truncate transition-opacity hover:opacity-80"
                        style={{ background: t.color + (s.status === "cancelled" ? "66" : "dd") }}>
                        {s.time && <span className="opacity-70">{s.time} · </span>}{s.name}
                      </button>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <span className="text-gray-400 text-[9px] pl-1">+{daySessions.length - 3} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Sidebar ──────────────────────────────────────────────── */}
        <div className="w-64 border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <SessionPanel
                key={selectedSession.id}
                session={selectedSession}
                onClose={() => setSelected(null)}
                onUpdate={patch => updateSession(selectedSession.id, patch)}
                onDelete={deleteSession}
              />
            ) : (
              <motion.div key="list" {...FADE(0)} className="flex flex-col h-full overflow-y-auto">
                <div className="px-4 py-4 border-b border-gray-100">
                  <p className="text-gray-900 text-xs font-black tracking-[0.15em] uppercase">Upcoming</p>
                </div>
                {upcomingSessions.length === 0
                  ? <p className="text-gray-300 text-xs p-4">No upcoming sessions</p>
                  : (
                    <div className="divide-y divide-gray-50">
                      {upcomingSessions.map(s => {
                        const t  = TYPE_MAP[s.type] || TYPE_MAP.other;
                        const st = STATUS_CFG[s.status] || STATUS_CFG.pending;
                        return (
                          <button key={s.id}
                            onClick={() => setSelected(s.id)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.color }} />
                            <div className="min-w-0">
                              <p className="text-gray-800 text-xs font-medium truncate">{s.name}</p>
                              <p className="text-gray-400 text-[10px]">{formatDate(s.date)}</p>
                              <span className="text-[9px] font-bold" style={{ color: st.color }}>{st.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Booking modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {booking !== null && (
          <BookingModal
            initial={booking}
            onSave={addSession}
            onClose={() => setBooking(null)}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
