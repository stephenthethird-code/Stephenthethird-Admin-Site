/**
 * AdminDashboard.jsx  →  /admin
 * Hyper-functional command center:
 * · Stats (contacts, IC, tracks, active projects, pending follow-ups)
 * · Active Projects with contact chips — click any project to open in Whiteboard
 * · Recent Tracks
 * · Inner Circle spotlight
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, Star, Music2, Plus, Send,
  ArrowRight, Music, Clock, MessageSquare, Zap,
  ChevronRight, LayoutGrid, CheckCircle2, Calendar,
  Mail, Globe, DollarSign, TrendingUp, Activity, ChevronLeft,
} from "lucide-react";
import AdminShell        from "../components/admin/AdminShell";
import sampleBeats       from "../data/sampleBeats";
import { contactsData }  from "../data/contactsData";
import { useProjects, TYPE_COLORS, PROJECT_COLS } from "../data/projectsStore";
import { CATALOG }       from "../data/catalogData";

const EASE = [0.22, 1, 0.36, 1];

const TIER_COLOR = { 1:"#f59e0b", 2:"#3b82f6", 3:"#6b7280", 4:"#10b981", 5:"#ef4444" };
const TIER_LABEL = { 1:"Inner Circle", 2:"Collaborator", 3:"Network", 4:"Target", 5:"Blacklist" };

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, duration = 1100 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{val.toLocaleString()}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ Icon, iconColor, value, label, sub, onClick, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.45, ease:EASE, delay }}
      onClick={onClick}
      className={`bg-gray-50 border border-gray-200 p-5 flex flex-col items-center gap-1.5 hover:border-white/[0.14] transition-all ${onClick?"cursor-pointer":""}`}
    >
      <Icon size={20} style={{ color: iconColor }} />
      <p className="text-gray-900 font-black text-3xl tabular-nums mt-0.5"><Counter target={value} /></p>
      <p className="text-gray-500 text-[9px] tracking-[0.25em] uppercase">{label}</p>
      {sub && <p className="text-gray-300 text-[9px]">{sub}</p>}
    </motion.div>
  );
}

// ── Project card with contacts ────────────────────────────────────────────────
function ProjectCard({ project, contactIds, onClick }) {
  const tc       = TYPE_COLORS[project.type] || "#6b7280";
  const contacts = useMemo(() => contactIds.map(id => contactsData.find(c => c.id === id)).filter(Boolean), [contactIds]);
  const visible  = contacts.slice(0, 5);
  const overflow = contacts.length - visible.length;

  function daysLabel(d) {
    if (!d) return null;
    const diff = Math.round((new Date(d) - new Date()) / 86400000);
    if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, cls: "text-red-400" };
    if (diff === 0) return { text: "Due today",    cls: "text-amber-400" };
    if (diff <= 7)  return { text: `${diff}d left`, cls: "text-amber-300" };
    return { text: new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}), cls: "text-gray-500" };
  }

  const due = daysLabel(project.deadline);

  return (
    <motion.div
      whileHover={{ borderColor: "rgba(255,255,255,0.12)" }}
      onClick={onClick}
      className="bg-gray-50 border border-gray-200 p-4 cursor-pointer transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-gray-700 text-sm font-medium group-hover:text-gray-900 transition-colors truncate">{project.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-black tracking-wide px-1.5 py-0.5" style={{background:`${tc}22`,color:tc}}>{project.type}</span>
            <span className="text-gray-300 text-[9px] capitalize">{project.col}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {due && <span className={`text-[9px] ${due.cls}`}>{due.text}</span>}
          <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Contact chips */}
      {contacts.length > 0 ? (
        <div className="flex items-center gap-1 flex-wrap">
          {visible.map(c => {
            const col = TIER_COLOR[c.tier] || "#6b7280";
            return (
              <div key={c.id} title={`${c.name} · ${TIER_LABEL[c.tier]}`}
                className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-0.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                  style={{background:`${col}22`,border:`1px solid ${col}44`,color:col}}>
                  {c.name?.charAt(0)}
                </div>
                <span className="text-gray-400 text-[10px] truncate max-w-[70px]">{c.name.split(" ")[0]}</span>
              </div>
            );
          })}
          {overflow > 0 && (
            <div className="bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
              +{overflow}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-300 text-[10px] italic">No contacts assigned — open to add</p>
      )}

      {project.notes && (
        <p className="text-gray-300 text-[10px] mt-2 truncate">{project.notes}</p>
      )}
    </motion.div>
  );
}

// ── Mini Calendar Widget ──────────────────────────────────────────────────────
function MiniCalendar({ projects, followups }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  // Collect events: project deadlines + pending follow-ups
  const eventsByDate = useMemo(() => {
    const map = {};
    const addEvt = (dateStr, evt) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate();
        if (!map[key]) map[key] = [];
        map[key].push(evt);
      }
    };
    projects.forEach(p => addEvt(p.deadline, { label: p.title, color: p.color || "#f59e0b", type: "project" }));
    (followups||[]).filter(f=>f.status!=="done").forEach(f => addEvt(f.due_date, { label: f.title, color: "#3b82f6", type: "followup" }));
    return map;
  }, [projects, followups, month, year]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="bg-gray-50 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <p className="text-gray-400 text-xs font-medium flex items-center gap-2">
          <Calendar size={12} className="text-amber-400"/> Calendar
        </p>
        <div className="flex items-center gap-2">
          <span className="text-gray-700 text-xs font-black">{MONTHS[month]} {year}</span>
          <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1)}}
            className="text-gray-400 hover:text-gray-900 p-0.5 transition-colors"><ChevronLeft size={11}/></button>
          <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1)}}
            className="text-gray-400 hover:text-gray-900 p-0.5 transition-colors"><ChevronRight size={11}/></button>
        </div>
      </div>

      <div className="p-3">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
            <div key={d} className="text-center text-[9px] text-gray-300 font-black py-0.5">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            const evts = d ? (eventsByDate[d] || []) : [];
            const projEvts = evts.filter(e=>e.type==="project");
            const fuEvts   = evts.filter(e=>e.type==="followup");
            return (
              <div key={i} className={`min-h-[34px] p-0.5 rounded-sm transition-colors relative ${
                !d ? "" :
                isToday(d) ? "bg-amber-400/15 ring-1 ring-amber-400/40" :
                evts.length ? "bg-gray-100 hover:bg-gray-100" : "hover:bg-gray-100"
              }`}>
                {d && (
                  <>
                    <p className={`text-[9px] text-center font-medium leading-none mb-0.5 ${isToday(d)?"text-amber-600 font-black":"text-gray-500"}`}>{d}</p>
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {projEvts.slice(0,2).map((e,j)=>(
                        <div key={j} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:e.color}} title={e.label}/>
                      ))}
                      {fuEvts.slice(0,2).map((e,j)=>(
                        <div key={j} className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{background:"#3b82f6"}} title={e.label}/>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"/><span className="text-[8px] text-gray-400">Deadline</span></div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-sm bg-blue-400"/><span className="text-[8px] text-gray-400">Follow-up</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm ring-1 ring-amber-400/40 bg-amber-400/15"/><span className="text-[8px] text-gray-400">Today</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Inner Circle spotlight ────────────────────────────────────────────────────
function ICSpotlight() {
  const ic = useMemo(() =>
    contactsData.filter(c => c.tier === 1).slice(0, 6),
    []
  );

  return (
    <div className="flex flex-wrap gap-2">
      {ic.map(c => (
        <div key={c.id} className="flex items-center gap-2 bg-gray-100 border border-amber-400/10 px-3 py-2 hover:border-amber-400/25 transition-colors">
          <div className="w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-[10px] font-black text-amber-400 flex-shrink-0">
            {c.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white/75 text-xs truncate">{c.name}</p>
            <p className="text-gray-500 text-[9px] truncate">{c.role}{c.location ? ` · ${c.location}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { projects, followups = [], getProjectContacts } = useProjects();

  // Stats
  const totalContacts  = contactsData.length;
  const icContacts     = contactsData.filter(c => c.tier === 1).length;
  const trackCount     = sampleBeats.length;
  const activeProjects = projects.filter(p => p.col === "current" || p.col === "upcoming").length;

  // Revenue stats from catalog
  const revenueStats = useMemo(() => {
    try {
      const saved = localStorage.getItem("s3_income_songs_v1");
      const overrides = saved ? JSON.parse(saved) : {};
      const songs = CATALOG.map(s => overrides[s.id] ? { ...s, ...overrides[s.id] } : s);
      const received = songs.filter(s => s.advanceStatus === "received" && s.advance > 0)
        .reduce((sum, s) => sum + s.advance, 0);
      const owed = songs.filter(s => s.advanceStatus === "waiting" && s.advance > 0)
        .reduce((sum, s) => sum + s.advance, 0);
      const totalStreams = songs.reduce((sum, s) => sum + (s.streams || 0), 0);
      return { received, owed, totalStreams };
    } catch { return { received: 0, owed: 0, totalStreams: 0 }; }
  }, []);

  // Active projects sorted by deadline
  const activeProjectList = useMemo(() =>
    projects
      .filter(p => p.col === "current" || p.col === "upcoming")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }),
    [projects]
  );

  const recentTracks = useMemo(() =>
    [...sampleBeats].sort((a,b)=>(b.id??0)-(a.id??0)).slice(0,6),
    []
  );

  // Top 3 upcoming deadlines
  const upcomingDeadlines = useMemo(() =>
    projects
      .filter(p => p.deadline && p.col !== "past")
      .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0,4),
    [projects]
  );

  function fmtMoney(n) { if (!n) return "$0"; return n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n.toLocaleString()}`; }
  function fmtStreams(n) { if (!n) return "0"; return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toLocaleString(); }

  const stats = [
    { Icon: DollarSign,   iconColor:"#10b981", value:revenueStats.received, label:"Revenue Received", sub:`$${revenueStats.owed.toLocaleString()} owed`, onClick:()=>navigate("/admin/income") },
    { Icon: TrendingUp,   iconColor:"#60a5fa", value:Math.round(revenueStats.totalStreams/1000000*10)/10, label:"Total Streams (M)", sub:"across all catalog", onClick:()=>navigate("/admin/income") },
    { Icon: Music2,       iconColor:"#a78bfa", value:CATALOG.length,        label:"Catalog Songs",    sub:`${trackCount} beats`, onClick:()=>navigate("/admin/tracks") },
    { Icon: LayoutGrid,   iconColor:"#34d399", value:activeProjects,        label:"Active Projects",  onClick:()=>navigate("/admin/whiteboard") },
  ];

  return (
    <AdminShell>
      <div className="px-8 py-7 max-w-6xl">

        {/* Header */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE}} className="mb-7">
          <p className="text-gray-300 text-[9px] tracking-[0.35em] uppercase mb-1">Studio OS</p>
          <h1 className="text-gray-900 font-black text-3xl" style={{letterSpacing:"-0.025em"}}>Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, Stephen.</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {stats.map((s,i)=><StatCard key={s.label} {...s} delay={i*0.07}/>)}
        </div>

        {/* Quick actions */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE,delay:0.28}}
          className="flex flex-wrap gap-2 mb-7">
          <button onClick={()=>navigate("/admin/contacts")}
            className="flex items-center gap-2 bg-amber-400 text-black text-xs font-black tracking-widest uppercase px-5 py-2.5 hover:bg-amber-300 transition-colors">
            <Plus size={13}/> Add Contact
          </button>
          {[
            {Icon:LayoutGrid,  label:"New Project",    path:"/admin/whiteboard"},
            {Icon:Music2,      label:"Add Track",      path:"/admin/tracks"},
            {Icon:Mail,        label:"Send Email",     path:"/admin/gmail"},
            {Icon:Globe,       label:"Web Inbox",      path:"/admin/web-inbox"},
            {Icon:CheckCircle2,label:"Follow-Ups",     path:"/admin/followups"},
          ].map(a=>(
            <button key={a.label} onClick={()=>navigate(a.path)}
              className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100/[0.09] text-xs px-4 py-2.5 transition-all">
              <a.Icon size={13}/> {a.label}
            </button>
          ))}
        </motion.div>

        {/* ── Active Projects ──────────────────────────────────────────── */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE,delay:0.35}} className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-[10px] tracking-[0.25em] uppercase flex items-center gap-2">
              <Zap size={11} className="text-amber-400"/> Active Projects
            </p>
            <button onClick={()=>navigate("/admin/whiteboard")}
              className="text-[10px] text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1">
              Manage all <ChevronRight size={11}/>
            </button>
          </div>

          {activeProjectList.length === 0 ? (
            <div className="border border-gray-200 bg-gray-50 px-6 py-10 text-center">
              <LayoutGrid size={28} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-gray-400 text-sm">No active projects</p>
              <button onClick={()=>navigate("/admin/whiteboard")}
                className="mt-3 text-[10px] tracking-widest uppercase text-amber-400/50 hover:text-amber-400 transition-colors">
                + Create one →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeProjectList.map((p,i)=>(
                <motion.div key={p.id}
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  transition={{delay:0.38+i*0.06, duration:0.35, ease:EASE}}>
                  <ProjectCard
                    project={p}
                    contactIds={getProjectContacts(p.id)}
                    onClick={()=>navigate("/admin/whiteboard")}
                  />
                </motion.div>
              ))}
              {/* Add project card */}
              <motion.button
                initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                transition={{delay:0.38+activeProjectList.length*0.06,duration:0.35,ease:EASE}}
                onClick={()=>navigate("/admin/whiteboard")}
                className="bg-gray-50 border border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 hover:border-amber-400/30 hover:bg-gray-100/[0.02] transition-all min-h-[100px] group">
                <Plus size={18} className="text-gray-300 group-hover:text-amber-400 transition-colors"/>
                <p className="text-gray-300 text-xs group-hover:text-gray-400 transition-colors">New Project</p>
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* ── Three-col: Calendar + Recent Tracks + Inner Circle ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Calendar */}
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE,delay:0.48}}>
            <MiniCalendar projects={projects} followups={followups??[]}/>

            {/* Upcoming deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className="mt-3 bg-gray-50 border border-gray-200">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-gray-400 text-[10px] font-medium flex items-center gap-1.5"><Clock size={10} className="text-amber-400"/> Upcoming</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {upcomingDeadlines.map(p=>{
                    const diff = Math.round((new Date(p.deadline)-new Date())/86400000);
                    const tc   = TYPE_COLORS[p.type]||"#6b7280";
                    return (
                      <div key={p.id} onClick={()=>navigate("/admin/whiteboard")}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-gray-100 cursor-pointer group">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:p.color||tc}}/>
                        <p className="text-gray-700 text-xs flex-1 truncate group-hover:text-gray-900">{p.title}</p>
                        <span className={`text-[9px] flex-shrink-0 tabular-nums ${diff<0?"text-red-400":diff<=3?"text-amber-400":"text-gray-400"}`}>
                          {diff<0?`${Math.abs(diff)}d overdue`:diff===0?"Today":`${diff}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Tracks */}
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE,delay:0.52}}
            className="bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <p className="text-gray-400 text-xs font-medium flex items-center gap-2">
                <Music size={12} className="text-amber-400"/> Recent Tracks
              </p>
              <button onClick={()=>navigate("/admin/tracks")}
                className="text-[10px] text-gray-300 hover:text-amber-400 transition-colors flex items-center gap-1">
                View all <ChevronRight size={11}/>
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recentTracks.map((t,i)=>(
                <motion.div key={t.id}
                  initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}}
                  transition={{delay:0.56+i*0.04,duration:0.3,ease:EASE}}
                  onClick={()=>navigate("/admin/tracks")}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-100 cursor-pointer group">
                  <div className="w-7 h-7 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Music2 size={10} className="text-gray-300 group-hover:text-amber-400 transition-colors"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-600 text-xs truncate group-hover:text-gray-900 transition-colors">{t.name}</p>
                    <p className="text-gray-400 text-[9px] truncate">{t.collaborators}</p>
                  </div>
                  {t.bpm && <p className="text-gray-300 text-[9px] tabular-nums flex-shrink-0">{t.bpm}</p>}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Inner Circle */}
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45,ease:EASE,delay:0.56}}
            className="bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <p className="text-gray-400 text-xs font-medium flex items-center gap-2">
                <Star size={12} className="text-amber-400"/> Inner Circle
              </p>
              <button onClick={()=>navigate("/admin/contacts")}
                className="text-[10px] text-gray-300 hover:text-amber-400 transition-colors flex items-center gap-1">
                All <ChevronRight size={11}/>
              </button>
            </div>
            <div className="p-4">
              <ICSpotlight/>
              <button onClick={()=>navigate("/admin/contacts")}
                className="mt-3 w-full text-[10px] tracking-widest uppercase text-gray-300 hover:text-amber-400/60 transition-colors py-2 border border-dashed border-gray-200 hover:border-amber-400/20">
                View all {icContacts} IC contacts →
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </AdminShell>
  );
}
