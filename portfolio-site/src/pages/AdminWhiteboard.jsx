/**
 * AdminWhiteboard.jsx — Executive Command Center
 * Tab 1: Projects  — project list + contact assignment + linked follow-ups + email
 * Tab 2: Canvas    — infinite pan/zoom + freehand draw tool
 * Tab 3: Follow-Ups — all follow-ups across projects
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { withToken } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, X, Check, Search, UserPlus,
  CheckCircle2, Circle, AlertCircle, Clock, LayoutGrid,
  ZoomIn, ZoomOut, Maximize2, Mail, Send, RotateCcw,
  Pencil, MousePointer, Eraser, Minus, ChevronRight,
  FileText, StickyNote, Square, ArrowRight, Type, Undo2, Redo2,
  Music2, Upload, Headphones, Filter, Eye, Cloud, FolderOpen, ChevronDown,
} from "lucide-react";
import AdminShell       from "../components/admin/AdminShell";
import { contactsData } from "../data/contactsData";
import {
  useProjects, PROJECT_TYPES, PROJECT_COLS, TYPE_COLORS, PROJECT_PALETTE,
} from "../data/projectsStore";

const API = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const TIER_COLOR = { 1:"#f59e0b", 2:"#3b82f6", 3:"#6b7280", 4:"#10b981", 5:"#ef4444" };
const TIER_LABEL = { 1:"IC", 2:"Collab", 3:"Net", 4:"Target", 5:"Block" };

const FU_TYPES = {
  demo_sent:        { label:"Demo Sent",       colour:"#3b82f6" },
  meeting:          { label:"Meeting",          colour:"#10b981" },
  feedback_pending: { label:"Feedback Pending", colour:"#f59e0b" },
  pitch:            { label:"Pitch",            colour:"#8b5cf6" },
  general:          { label:"General",          colour:"#6b7280" },
};

const inputCls = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";

// ── days-until helper ─────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0)   return { text:`${Math.abs(diff)}d overdue`, cls:"text-red-400",   urgent:true };
  if (diff === 0) return { text:"Due today",    cls:"text-amber-400", urgent:true };
  if (diff <= 3)  return { text:`${diff}d`,      cls:"text-amber-300", urgent:true };
  return { text: new Date(dateStr).toLocaleDateString("en-US",{month:"short",day:"numeric"}), cls:"text-gray-500", urgent:false };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONTACT PICKER
// ══════════════════════════════════════════════════════════════════════════════
function ContactPicker({ assignedIds, onAssign, onUnassign }) {
  const [q, setQ]         = useState("");
  const [open, setOpen]   = useState(false);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return contactsData
      .filter(c => !assignedIds.includes(c.id) &&
        (c.name?.toLowerCase().includes(lq) || c.role?.toLowerCase().includes(lq) || c.company?.toLowerCase().includes(lq)))
      .slice(0, 8);
  }, [q, assignedIds]);

  const assigned = useMemo(() =>
    assignedIds.map(id => contactsData.find(c => c.id === id)).filter(Boolean),
    [assignedIds]
  );

  return (
    <div>
      {assigned.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {assigned.map(c => {
            const col = TIER_COLOR[c.tier]||"#6b7280";
            return (
              <div key={c.id} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2 py-1 group">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                  style={{background:`${col}22`,border:`1px solid ${col}55`,color:col}}>
                  {c.name?.charAt(0)}
                </div>
                <span className="text-gray-600 text-xs truncate max-w-[80px]">{c.name}</span>
                <button onClick={() => onUnassign(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all ml-0.5"><X size={9}/></button>
              </div>
            );
          })}
        </div>
      )}
      <div className="relative">
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-2 focus-within:border-amber-400/40 transition-colors">
          <Search size={11} className="text-gray-400 flex-shrink-0"/>
          <input type="text" value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
            placeholder="Search 582 contacts to assign…"
            className="bg-transparent text-gray-900 text-sm flex-1 focus:outline-none placeholder:text-gray-300"/>
          {q && <button onClick={()=>setQ("")} className="text-gray-300 hover:text-gray-900"><X size={11}/></button>}
        </div>
        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 border-t-0 max-h-52 overflow-y-auto shadow-2xl">
              {results.map(c => {
                const col = TIER_COLOR[c.tier]||"#6b7280";
                return (
                  <button key={c.id} onMouseDown={()=>{onAssign(c.id);setQ("");}}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 transition-colors text-left group">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{background:`${col}22`,border:`1px solid ${col}55`,color:col}}>{c.name?.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-sm truncate group-hover:text-gray-900 transition-colors">{c.name}</p>
                      <p className="text-gray-500 text-[10px] truncate">{c.role}{c.company?` · ${c.company}`:""}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 font-black flex-shrink-0" style={{background:`${col}22`,color:col}}>{TIER_LABEL[c.tier]}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  EMAIL MODAL (individual or all)
// ══════════════════════════════════════════════════════════════════════════════
function EmailModal({ contacts, defaultSubject, onClose }) {
  const [selected, setSelected] = useState(contacts.map(c=>c.id));
  const [subject,  setSubject]  = useState(defaultSubject || "");
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  async function handleSend() {
    const recipients = contacts.filter(c=>selected.includes(c.id)&&c.email).map(c=>c.email);
    if (!recipients.length || !subject || !body) return;
    setSending(true);
    try {
      await fetch(`${API}/api/email/send`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ to: recipients, subject, body }),
        signal: AbortSignal.timeout(5000),
      });
      setSent(true);
      setTimeout(onClose, 1800);
    } catch {
      // Fallback: open Gmail compose for each
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipients.join(","))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, "_blank");
      setSent(true);
      setTimeout(onClose, 1000);
    } finally { setSending(false); }
  }

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 bg-black/75 z-40" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}}
        className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg bg-gray-50 border border-gray-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-gray-900 font-black flex items-center gap-2"><Mail size={14} className="text-amber-400"/> Compose Email</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900"><X size={16}/></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Recipient selector */}
            <div>
              <label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-2">To</label>
              <div className="flex flex-wrap gap-1.5">
                {contacts.map(c => (
                  <button key={c.id} onClick={()=>setSelected(prev=>prev.includes(c.id)?prev.filter(id=>id!==c.id):[...prev,c.id])}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-xs transition-all ${
                      selected.includes(c.id)
                        ? "bg-amber-400/10 border-amber-400/40 text-amber-300"
                        : "border-gray-200 text-gray-500 hover:text-gray-500"
                    }`}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                      style={{background:`${TIER_COLOR[c.tier]||"#6b7280"}22`,color:TIER_COLOR[c.tier]||"#6b7280"}}>
                      {c.name?.charAt(0)}
                    </div>
                    {c.name.split(" ")[0]}
                    {!c.email && <span className="text-red-400/60 text-[9px]">no email</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} className={inputCls} placeholder="Re: project update…"/>
            </div>

            <div>
              <label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Message</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6}
                className={inputCls+" resize-none"} placeholder="Hey [Name],&#10;&#10;Just wanted to follow up on…"/>
            </div>

            <p className="text-gray-300 text-[10px]">
              Sending to {selected.filter(id=>contacts.find(c=>c.id===id)?.email).length} recipients with emails.
              Falls back to Gmail if backend offline.
            </p>
          </div>

          <div className="px-5 pb-5 flex gap-3">
            <button onClick={handleSend} disabled={sending||sent||!subject||!body||!selected.length}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-400 text-black text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40">
              {sending ? <RotateCcw size={12} className="animate-spin"/> : sent ? <Check size={12}/> : <Send size={12}/>}
              {sending?"Sending…":sent?"Sent!":"Send"}
            </button>
            <button onClick={onClose} className="px-4 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  FOLLOW-UP ROW
// ══════════════════════════════════════════════════════════════════════════════
function FollowUpRow({ fu, onCycle, onEdit, onDelete }) {
  const ft  = FU_TYPES[fu.type]||FU_TYPES.general;
  const due = daysUntil(fu.due_date);
  function icon(s) {
    if(s==="done")    return <CheckCircle2 size={13} className="text-emerald-400"/>;
    if(s==="snoozed") return <Clock size={13} className="text-gray-400"/>;
    if(s==="overdue") return <AlertCircle size={13} className="text-red-400"/>;
    return <Circle size={13} className="text-amber-400"/>;
  }
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 border border-gray-200 bg-gray-100 group hover:border-gray-200 transition-all ${fu.status==="done"?"opacity-40":""}`}>
      <button onClick={()=>onCycle(fu.id,fu.status)} className="flex-shrink-0 hover:scale-110 transition-transform">{icon(fu.status)}</button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black tracking-widest uppercase" style={{color:ft.colour}}>{ft.label}</span>
          {fu.contact_name&&<span className="text-gray-300 text-[9px]">· {fu.contact_name}</span>}
        </div>
        <p className={`text-xs ${fu.status==="done"?"line-through text-gray-400":"text-gray-600"}`}>{fu.title}</p>
      </div>
      {due&&<span className={`text-[9px] flex-shrink-0 ${due.cls}`}>{due.text}</span>}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={()=>onEdit(fu)} className="text-gray-300 hover:text-gray-900 p-0.5"><Edit3 size={10}/></button>
        <button onClick={()=>onDelete(fu.id)} className="text-gray-300 hover:text-red-400 p-0.5"><Trash2 size={10}/></button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DROPBOX BROWSER MODAL
// ══════════════════════════════════════════════════════════════════════════════
const SHARED_FOLDER_LABEL = "S3 Dropbox";
const AUDIO_EXTS = new Set([".mp3",".wav",".aif",".aiff",".flac",".m4a",".ogg",".aac",".wma"]);

function DropboxBrowser({ onAttach, onClose }) {
  const [path,     setPath]     = useState("");
  const [stack,    setStack]    = useState([]); // breadcrumb stack [{name,path}]
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [status,   setStatus]   = useState(null); // null | "connected" | "disconnected"
  const [selected, setSelected] = useState(new Set());

  // Check Dropbox connection on mount
  useEffect(()=>{
    fetch(`${API}/api/cloud/dropbox/status`)
      .then(r=>r.json())
      .then(d=>{ setStatus(d.connected ? "connected" : "disconnected"); })
      .catch(()=>setStatus("disconnected"));
  },[]);

  // Browse folder
  useEffect(()=>{
    if (status !== "connected") return;
    setLoading(true); setError(null); setSelected(new Set());
    fetch(`${API}/api/cloud/dropbox/shared-folder?path=${encodeURIComponent(path)}`)
      .then(r=>r.json())
      .then(data=>{
        if (data.error) {
          if (data.error === "not_connected") setStatus("disconnected");
          else setError(data.error);
        } else {
          setEntries(data);
        }
        setLoading(false);
      })
      .catch(e=>{ setError(e.message); setLoading(false); });
  },[path, status]);

  function openFolder(entry) {
    setStack(s=>[...s, {name: entry.name, path}]);
    setPath(entry.path || path + "/" + entry.name);
  }
  function goUp() {
    if (!stack.length) return;
    const prev = stack[stack.length-1];
    setStack(s=>s.slice(0,-1));
    setPath(prev.path);
  }

  function toggleSelect(id) {
    setSelected(s=>{
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function attachSelected() {
    const toAttach = entries.filter(e=>selected.has(e.id) && e.type==="file");
    toAttach.forEach(f=>onAttach(f));
    onClose();
  }

  const audioEntries = entries.filter(e=>{
    if (e.type === "folder") return true;
    const ext = "." + e.name.split(".").pop().toLowerCase();
    return AUDIO_EXTS.has(ext);
  });

  const breadcrumb = [SHARED_FOLDER_LABEL, ...stack.map(s=>s.name)];

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 bg-black/50 z-50" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}}
        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-gray-50 border border-gray-200 shadow-2xl pointer-events-auto flex flex-col" style={{maxHeight:"80vh"}}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2.5">
              <Cloud size={16} className="text-[#0061FF]"/>
              <span className="text-gray-900 font-black text-sm">Dropbox</span>
              <span className="text-gray-300 text-xs">· {SHARED_FOLDER_LABEL}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={15}/></button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 border-b border-gray-200 text-[10px] text-gray-400 tracking-wider uppercase overflow-x-auto">
            {stack.length > 0 && (
              <button onClick={goUp} className="text-amber-500 hover:text-amber-600 mr-1 flex-shrink-0">
                ← Back
              </button>
            )}
            {breadcrumb.map((seg,i)=>(
              <span key={i} className={`flex-shrink-0 flex items-center gap-1 ${i===breadcrumb.length-1?"text-gray-600 font-semibold":""}`}>
                {i>0 && <ChevronDown size={8} className="rotate-[-90deg]"/>}
                {seg}
              </span>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {status === null && (
              <div className="flex items-center justify-center py-16 text-gray-300 text-sm">Checking connection…</div>
            )}
            {status === "disconnected" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Cloud size={32} className="text-gray-200"/>
                <p className="text-gray-500 text-sm font-medium">Dropbox not connected</p>
                <p className="text-gray-400 text-xs text-center px-8">Connect your Dropbox account to browse the S3 studio folder.</p>
                <a href={withToken(`${API}/api/cloud/dropbox/auth`)} target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-[#0061FF] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#0050d4] transition-colors">
                  Connect Dropbox
                </a>
              </div>
            )}
            {status === "connected" && loading && (
              <div className="flex items-center justify-center py-16 text-gray-300 text-sm">
                <span className="animate-spin mr-2">⟳</span> Loading…
              </div>
            )}
            {status === "connected" && error && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle size={24} className="text-red-400"/>
                <p className="text-red-400 text-sm text-center px-8">{error}</p>
                <button onClick={()=>{ setError(null); setLoading(true); setPath(p=>p); }}
                  className="text-xs text-gray-400 hover:text-amber-500 underline">Retry</button>
              </div>
            )}
            {status === "connected" && !loading && !error && (
              <>
                {audioEntries.length === 0 ? (
                  <div className="text-center py-12 text-gray-300 text-sm">No audio files found here</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {audioEntries.map(entry=>{
                      const isFolder = entry.type === "folder";
                      const isSelected = selected.has(entry.id);
                      const ext = "." + entry.name.split(".").pop().toLowerCase();
                      return (
                        <div key={entry.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                            ${isFolder?"hover:bg-amber-50":"hover:bg-gray-50"}
                            ${isSelected?"bg-amber-50/60 border-l-2 border-amber-400":"border-l-2 border-transparent"}`}
                          onClick={()=> isFolder ? openFolder(entry) : toggleSelect(entry.id)}>
                          {isFolder ? (
                            <FolderOpen size={14} className="text-amber-400 flex-shrink-0"/>
                          ) : (
                            <Music2 size={14} className={isSelected?"text-amber-500":"text-gray-400"} style={{flexShrink:0}}/>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isFolder?"text-gray-700 font-medium":"text-gray-600"}`}>{entry.name}</p>
                            {!isFolder && entry.size > 0 && (
                              <p className="text-[10px] text-gray-300">{(entry.size/1024/1024).toFixed(1)} MB · {ext.slice(1).toUpperCase()}</p>
                            )}
                          </div>
                          {isFolder && <ChevronDown size={12} className="text-gray-300 rotate-[-90deg]"/>}
                          {!isFolder && isSelected && <Check size={12} className="text-amber-500 flex-shrink-0"/>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {status === "connected" && !loading && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
              <span className="text-[10px] text-gray-400">{selected.size > 0 ? `${selected.size} file${selected.size>1?"s":""} selected` : "Click files to select"}</span>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">Cancel</button>
                <button onClick={attachSelected} disabled={selected.size===0}
                  className="text-xs font-bold tracking-widest uppercase px-4 py-1.5 transition-all
                    disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed
                    bg-amber-400 text-white hover:bg-amber-500">
                  Attach {selected.size>0 ? `(${selected.size})` : ""}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROJECTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProjectsTab() {
  const {
    projects, addProject, updateProject, deleteProject,
    assignContact, unassignContact, getProjectContacts, getContactProjects,
    addFollowup, updateFollowup, deleteFollowup, getProjectFollowups,
    addAudioFile, removeAudioFile, getProjectAudio,
    deadlineAlerts,
  } = useProjects();

  const [selectedId, setSelectedId] = useState(projects[0]?.id??null);
  const [colFilter,  setColFilter]  = useState("all");
  const [addOpen,    setAddOpen]    = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [newProj,    setNewProj]    = useState({title:"",type:"Session",col:"current",deadline:"",color:PROJECT_PALETTE[0],notes:""});
  const [emailOpen,  setEmailOpen]  = useState(false);
  const [emailContacts, setEmailContacts] = useState([]);
  const [fuOpen,     setFuOpen]     = useState(false);
  const [fuEditItem, setFuEditItem] = useState(null);
  const [fuForm,     setFuForm]     = useState({title:"",type:"demo_sent",status:"pending",due_date:"",contact_name:"",notes:""});

  const audioInputRef = useRef(null);
  const [dbxOpen,    setDbxOpen]    = useState(false);

  const selected     = projects.find(p=>p.id===selectedId);
  const assignedIds  = selectedId ? getProjectContacts(selectedId) : [];
  const linkedFu     = selectedId ? getProjectFollowups(selectedId) : [];
  const audioList    = selectedId ? getProjectAudio(selectedId) : [];
  const assignedContacts = useMemo(()=>assignedIds.map(id=>contactsData.find(c=>c.id===id)).filter(Boolean),[assignedIds]);

  function handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file || !selectedId) return;
    addAudioFile(selectedId, {
      name:   file.name,
      type:   file.type,
      source: "local",
      size:   file.size,
    });
    e.target.value = "";
  }

  function handleDropboxAttach(entry) {
    if (!selectedId) return;
    addAudioFile(selectedId, {
      name:   entry.name,
      type:   "dropbox",
      source: "dropbox",
      size:   entry.size || 0,
      dbxPath: entry.path,
    });
  }

  const filtered = useMemo(()=>colFilter==="all"?projects:projects.filter(p=>p.col===colFilter),[projects,colFilter]);

  // Email helpers
  function openEmailAll() { setEmailContacts(assignedContacts); setEmailOpen(true); }
  function openEmailOne(c) { setEmailContacts([c]); setEmailOpen(true); }

  // Follow-up helpers
  function openAddFu() { setFuForm({title:"",type:"demo_sent",status:"pending",due_date:"",contact_name:"",notes:"",projectId:selectedId}); setFuEditItem(null); setFuOpen(true); }
  function openEditFu(fu) { setFuForm({...fu}); setFuEditItem(fu.id); setFuOpen(true); }
  function saveFu() {
    if (!fuForm.title.trim()) return;
    if (fuEditItem) { updateFollowup(fuEditItem, fuForm); }
    else { addFollowup({...fuForm, projectId:selectedId}); }
    setFuOpen(false);
  }
  function cycleFuStatus(id,cur) {
    const order=["pending","done","snoozed","overdue"];
    updateFollowup(id,{status:order[(order.indexOf(cur)+1)%order.length]});
  }

  function handleAddProject() {
    if (!newProj.title.trim()) return;
    const id = addProject(newProj);
    setSelectedId(id); setAddOpen(false);
    setNewProj({title:"",type:"Session",col:"current",deadline:"",color:PROJECT_PALETTE[0],notes:""});
  }

  function startEdit() { if(selected){setEditForm({title:selected.title,type:selected.type,col:selected.col,deadline:selected.deadline||"",color:selected.color||"#f59e0b",notes:selected.notes||""});setEditing(true);} }
  function saveEdit() { updateProject(selectedId,editForm); setEditing(false); }

  function handleDelete() { deleteProject(selectedId); setSelectedId(projects.find(p=>p.id!==selectedId)?.id??null); setConfirmDel(false); }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: project list ────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-[8px] tracking-[0.3em] uppercase mb-0.5">Whiteboard</p>
            <h2 className="text-gray-900 font-black text-sm" style={{letterSpacing:"-0.02em"}}>
              Projects <span className="text-gray-300 font-normal text-xs">{projects.length}</span>
            </h2>
          </div>
          <button onClick={()=>setAddOpen(true)} className="w-6 h-6 bg-amber-400 text-black flex items-center justify-center hover:bg-amber-300 transition-colors flex-shrink-0">
            <Plus size={13}/>
          </button>
        </div>

        {/* Deadline alert strip */}
        {deadlineAlerts.length > 0 && (
          <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-red-400 text-[9px] font-black tracking-widest uppercase">⚠ {deadlineAlerts.length} deadline{deadlineAlerts.length>1?"s":""} urgent</p>
          </div>
        )}

        {/* Col filter */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-2 pt-1">
          {[{id:"all",label:"All"},...PROJECT_COLS].map(c=>(
            <button key={c.id} onClick={()=>setColFilter(c.id)}
              className={`text-[9px] px-2.5 py-1.5 whitespace-nowrap border-b-2 transition-all ${colFilter===c.id?"border-amber-400 text-gray-900":"border-transparent text-gray-400 hover:text-gray-400"}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Project rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
          {filtered.map(p => {
            const contactIds = getProjectContacts(p.id);
            const cnt = contactIds.length;
            const audioLen = getProjectAudio(p.id).length;
            const due = daysUntil(p.deadline);
            const isSel = p.id === selectedId;
            return (
              <button key={p.id} onClick={()=>{setSelectedId(p.id);setEditing(false);}}
                className={`w-full text-left px-3 py-3 transition-all flex items-start gap-2 ${isSel?"bg-gray-100 border-l-2 border-l-amber-400":"hover:bg-gray-50 border-l-2 border-l-transparent"}`}>
                {/* Color dot */}
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{background:p.color||"#f59e0b"}}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isSel?"text-gray-900":"text-white/65"}`}>{p.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[8px]" style={{color:TYPE_COLORS[p.type]||"#6b7280"}}>{p.type}</span>
                    {due&&<span className={`text-[8px] ${due.cls}`}>{due.text}</span>}
                  </div>
                  {/* Contact + audio chips */}
                  {(cnt>0||audioLen>0) && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {contactIds.slice(0,4).map(id=>{
                        const c = contactsData.find(x=>x.id===id);
                        if (!c) return null;
                        const col = TIER_COLOR[c.tier]||"#6b7280";
                        return (
                          <div key={id} title={c.name}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black flex-shrink-0"
                            style={{background:`${col}30`,border:`1px solid ${col}55`,color:col}}>
                            {c.name?.charAt(0)}
                          </div>
                        );
                      })}
                      {cnt>4&&<span className="text-[7px] text-gray-400">+{cnt-4}</span>}
                      {audioLen>0&&<span className="text-[7px] text-amber-400/70 flex items-center gap-0.5"><Music2 size={7}/>{audioLen}</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: project detail ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LayoutGrid size={32} className="text-white/8 mx-auto mb-3"/>
              <p className="text-gray-300 text-sm">Select a project</p>
              <button onClick={()=>setAddOpen(true)} className="mt-3 text-[10px] tracking-widest uppercase text-amber-400/50 hover:text-amber-400 transition-colors">+ New Project</button>
            </div>
          </div>
        ) : (
          <div className="px-7 py-6 max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                {/* Color swatch */}
                <div className="w-4 h-4 rounded-sm flex-shrink-0 mt-1" style={{background:selected.color||"#f59e0b"}}/>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input value={editForm.title} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))}
                      className="text-gray-900 font-black text-xl bg-transparent border-b border-gray-300 focus:outline-none focus:border-amber-400/50 w-full"
                      style={{letterSpacing:"-0.02em"}}/>
                  ) : (
                    <h2 className="text-gray-900 font-black text-xl" style={{letterSpacing:"-0.02em"}}>{selected.title}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black tracking-wide px-1.5 py-0.5" style={{background:`${TYPE_COLORS[selected.type]||"#6b7280"}22`,color:TYPE_COLORS[selected.type]||"#6b7280"}}>{selected.type}</span>
                    <span className="text-gray-400 text-[10px] capitalize">{selected.col}</span>
                    {selected.deadline&&(()=>{const d=daysUntil(selected.deadline);return d?<span className={`text-[10px] ${d.cls}`}>{d.text}</span>:null;})()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {editing ? (
                  <><button onClick={saveEdit} className="flex items-center gap-1 bg-amber-400 text-black text-xs font-black px-3 py-1.5 hover:bg-amber-300 transition-colors"><Check size={11}/>Save</button>
                  <button onClick={()=>setEditing(false)} className="text-gray-500 hover:text-gray-900 text-xs px-2 py-1.5 border border-gray-200 transition-colors">Cancel</button></>
                ) : (
                  <><button onClick={startEdit} className="flex items-center gap-1 text-white/35 hover:text-gray-900 text-xs px-3 py-1.5 border border-gray-200 transition-colors"><Edit3 size={10}/>Edit</button>
                  <button onClick={()=>setConfirmDel(true)} className="text-gray-300 hover:text-red-400 p-1.5 border border-transparent hover:border-red-400/20 transition-all"><Trash2 size={12}/></button></>
                )}
              </div>
            </div>

            {/* Edit fields */}
            {editing && (
              <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 border border-gray-200">
                <div className="col-span-2">
                  <label className="text-gray-300 text-[9px] tracking-widest uppercase block mb-1">Type</label>
                  <select value={editForm.type} onChange={e=>setEditForm(p=>({...p,type:e.target.value}))} className={inputCls+" text-xs"}>{PROJECT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
                </div>
                <div>
                  <label className="text-gray-300 text-[9px] tracking-widest uppercase block mb-1">Status</label>
                  <select value={editForm.col} onChange={e=>setEditForm(p=>({...p,col:e.target.value}))} className={inputCls+" text-xs"}>{PROJECT_COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
                </div>
                <div>
                  <label className="text-gray-300 text-[9px] tracking-widest uppercase block mb-1">Color</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PROJECT_PALETTE.map(c=>(
                      <button key={c} onClick={()=>setEditForm(p=>({...p,color:c}))}
                        className="w-5 h-5 rounded-sm transition-transform hover:scale-110"
                        style={{background:c,boxShadow:editForm.color===c?"0 0 0 2px white":"none"}}/>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-300 text-[9px] tracking-widest uppercase block mb-1">Deadline</label>
                  <input type="date" value={editForm.deadline} onChange={e=>setEditForm(p=>({...p,deadline:e.target.value}))} className={inputCls+" text-xs"}/>
                </div>
                <div className="col-span-4">
                  <label className="text-gray-300 text-[9px] tracking-widest uppercase block mb-1">Notes</label>
                  <textarea value={editForm.notes} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))} rows={2} className={inputCls+" resize-none text-xs"} placeholder="Project notes…"/>
                </div>
              </div>
            )}

            {/* Notes view */}
            {!editing && selected.notes && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                <p className="text-white/55 text-sm leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {/* ── CONTACTS ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-white/35 text-[9px] tracking-[0.25em] uppercase flex items-center gap-1.5">
                  <UserPlus size={10} className="text-amber-400"/> Team ({assignedIds.length})
                </p>
                {assignedContacts.length > 0 && (
                  <button onClick={openEmailAll}
                    className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-amber-400/60 hover:text-amber-400 border border-amber-400/20 hover:border-amber-400/50 px-2.5 py-1 transition-all">
                    <Mail size={9}/> Email All
                  </button>
                )}
              </div>
              <ContactPicker assignedIds={assignedIds} onAssign={id=>assignContact(selectedId,id)} onUnassign={id=>unassignContact(selectedId,id)}/>

              {/* Contact detail rows */}
              {assignedContacts.length > 0 && (
                <div className="mt-3 space-y-1">
                  {assignedContacts.map(c => {
                    const col = TIER_COLOR[c.tier]||"#6b7280";
                    return (
                      <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border border-gray-100 group hover:border-white/[0.09] transition-colors">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{background:`${col}22`,border:`1px solid ${col}44`,color:col}}>{c.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/75 text-xs">{c.name}</p>
                          <p className="text-gray-400 text-[9px]">{c.role}{c.company?` · ${c.company}`:""}{c.location?` · ${c.location}`:""}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[8px] px-1.5 py-0.5 font-black" style={{background:`${col}22`,color:col}}>{TIER_LABEL[c.tier]}</span>
                          <button onClick={()=>openEmailOne(c)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-amber-400 p-1 transition-all" title={`Email ${c.name.split(" ")[0]}`}>
                            <Mail size={11}/>
                          </button>
                          <button onClick={()=>unassignContact(selectedId,c.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-1 transition-all">
                            <X size={10}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── FOLLOW-UPS ───────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-white/35 text-[9px] tracking-[0.25em] uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-amber-400"/> Follow-Ups ({linkedFu.filter(f=>f.status!=="done").length} active)
                </p>
                <button onClick={openAddFu}
                  className="text-[9px] tracking-widest uppercase text-gray-400 hover:text-amber-400 border border-gray-200 hover:border-amber-400/30 px-2.5 py-1 transition-all flex items-center gap-1">
                  <Plus size={9}/> Add
                </button>
              </div>
              {linkedFu.filter(f=>f.status!=="done").length === 0 ? (
                <button onClick={openAddFu} className="w-full border border-dashed border-gray-200 py-3 text-gray-300 text-xs hover:border-amber-400/25 hover:text-amber-400/50 transition-all">
                  + Add a follow-up to this project
                </button>
              ) : (
                <div className="space-y-1">
                  {linkedFu.filter(f=>f.status!=="done").map(fu=>(
                    <FollowUpRow key={fu.id} fu={fu}
                      onCycle={cycleFuStatus} onEdit={openEditFu} onDelete={id=>deleteFollowup(id)}/>
                  ))}
                </div>
              )}
            </div>

            {/* ── AUDIO FILES ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-white/35 text-[9px] tracking-[0.25em] uppercase flex items-center gap-1.5">
                  <Headphones size={10} className="text-amber-400"/> Audio Files ({audioList.length})
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={()=>setDbxOpen(true)}
                    className="text-[9px] tracking-widest uppercase text-[#0061FF] hover:text-white hover:bg-[#0061FF] border border-[#0061FF]/40 hover:border-[#0061FF] px-2.5 py-1 transition-all flex items-center gap-1">
                    <Cloud size={9}/> Dropbox
                  </button>
                  <button onClick={()=>audioInputRef.current?.click()}
                    className="text-[9px] tracking-widest uppercase text-gray-400 hover:text-amber-400 border border-gray-200 hover:border-amber-400/30 px-2.5 py-1 transition-all flex items-center gap-1">
                    <Upload size={9}/> Local
                  </button>
                </div>
              </div>
              <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.aif,.aiff,.flac,.m4a,.ogg"
                className="hidden" onChange={handleAudioUpload}/>
              {audioList.length === 0 ? (
                <div className="flex gap-2">
                  <button onClick={()=>setDbxOpen(true)}
                    className="flex-1 border border-dashed border-[#0061FF]/25 py-3 text-[#0061FF]/40 text-xs hover:border-[#0061FF]/50 hover:text-[#0061FF]/70 transition-all flex items-center justify-center gap-1.5">
                    <Cloud size={11}/> Browse Dropbox
                  </button>
                  <button onClick={()=>audioInputRef.current?.click()}
                    className="flex-1 border border-dashed border-gray-200 py-3 text-gray-300 text-xs hover:border-amber-400/25 hover:text-amber-400/50 transition-all">
                    + Local file
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {audioList.map(f=>(
                    <div key={f.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border border-gray-100 group hover:border-gray-200 transition-colors">
                      {f.source === "dropbox"
                        ? <Cloud size={11} className="text-[#0061FF] flex-shrink-0"/>
                        : <Music2 size={11} className="text-amber-400 flex-shrink-0"/>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-600 text-xs truncate">{f.name}</p>
                        <p className="text-gray-300 text-[9px]">
                          {f.size ? `${(f.size/1024/1024).toFixed(1)} MB · ` : ""}
                          {f.source === "dropbox"
                            ? <span className="text-[#0061FF]/60">Dropbox</span>
                            : <span>Local</span>
                          }
                        </p>
                      </div>
                      <button onClick={()=>removeAudioFile(selectedId,f.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-0.5 transition-all">
                        <X size={10}/>
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5 pt-0.5">
                    <button onClick={()=>setDbxOpen(true)}
                      className="flex-1 text-center text-[9px] text-[#0061FF]/40 hover:text-[#0061FF]/70 py-1 transition-colors flex items-center justify-center gap-1">
                      <Cloud size={8}/> Dropbox
                    </button>
                    <button onClick={()=>audioInputRef.current?.click()}
                      className="flex-1 text-center text-[9px] text-gray-300 hover:text-amber-400/60 py-1 transition-colors">
                      + Local
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dropbox Browser modal */}
      <AnimatePresence>
        {dbxOpen && (
          <DropboxBrowser
            onAttach={handleDropboxAttach}
            onClose={()=>setDbxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Email modal */}
      <AnimatePresence>
        {emailOpen && (
          <EmailModal contacts={emailContacts} defaultSubject={selected?`Re: ${selected.title}`:""} onClose={()=>setEmailOpen(false)}/>
        )}
      </AnimatePresence>

      {/* Add project modal */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/30 z-40" onClick={()=>setAddOpen(false)}/>
            <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-gray-50 border border-gray-200 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5"><h3 className="text-gray-900 font-black">New Project</h3><button onClick={()=>setAddOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={16}/></button></div>
                <div className="space-y-3">
                  <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Title</label>
                    <input value={newProj.title} onChange={e=>setNewProj(p=>({...p,title:e.target.value}))} placeholder="e.g. Don Toliver Collab" className={inputCls} autoFocus/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Type</label>
                      <select value={newProj.type} onChange={e=>setNewProj(p=>({...p,type:e.target.value}))} className={inputCls}>{PROJECT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Status</label>
                      <select value={newProj.col} onChange={e=>setNewProj(p=>({...p,col:e.target.value}))} className={inputCls}>{PROJECT_COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                  </div>
                  <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Color</label>
                    <div className="flex flex-wrap gap-2 mt-1">{PROJECT_PALETTE.map(c=>(
                      <button key={c} onClick={()=>setNewProj(p=>({...p,color:c}))} className="w-6 h-6 rounded-sm hover:scale-110 transition-transform" style={{background:c,boxShadow:newProj.color===c?"0 0 0 2px white":"none"}}/>
                    ))}</div></div>
                  <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Deadline</label>
                    <input type="date" value={newProj.deadline} onChange={e=>setNewProj(p=>({...p,deadline:e.target.value}))} className={inputCls}/></div>
                  <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Notes</label>
                    <textarea value={newProj.notes} onChange={e=>setNewProj(p=>({...p,notes:e.target.value}))} rows={2} className={inputCls+" resize-none"} placeholder="What's this about?"/></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleAddProject} className="flex-1 bg-amber-400 text-black text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-300 transition-colors">Create Project</button>
                  <button onClick={()=>setAddOpen(false)} className="px-4 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Follow-up add/edit modal */}
      <AnimatePresence>
        {fuOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/30 z-40" onClick={()=>setFuOpen(false)}/>
            <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-gray-50 border border-gray-200 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4"><h3 className="text-gray-900 font-black">{fuEditItem?"Edit":"New"} Follow-Up</h3><button onClick={()=>setFuOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={16}/></button></div>
                <div className="space-y-3">
                  {[{k:"title",l:"Title",t:"text",ph:"e.g. Send stems"},{k:"contact_name",l:"Contact Name",t:"text",ph:"Who's involved?"},{k:"due_date",l:"Due Date",t:"date",ph:""},{k:"notes",l:"Notes",t:"text",ph:"Context…"}].map(f=>(
                    <div key={f.k}><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">{f.l}</label>
                      <input type={f.t} value={fuForm[f.k]||""} onChange={e=>setFuForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className={inputCls}/></div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Type</label>
                      <select value={fuForm.type} onChange={e=>setFuForm(p=>({...p,type:e.target.value}))} className={inputCls}>{Object.entries(FU_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                    <div><label className="text-gray-400 text-[9px] tracking-widests uppercase block mb-1">Status</label>
                      <select value={fuForm.status} onChange={e=>setFuForm(p=>({...p,status:e.target.value}))} className={inputCls}>{["pending","done","snoozed","overdue"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={saveFu} className="flex-1 bg-amber-400 text-black text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-300 transition-colors">{fuEditItem?"Save":"Add"}</button>
                  <button onClick={()=>setFuOpen(false)} className="px-4 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
            <div className="bg-white border border-gray-200 p-6 w-72">
              <p className="text-gray-900 font-black mb-1">Delete "{selected?.title}"?</p>
              <p className="text-white/35 text-sm mb-5">Removes all contact assignments and follow-ups.</p>
              <div className="flex gap-3"><button onClick={handleDelete} className="flex-1 bg-red-500 text-gray-900 text-xs font-black py-2 hover:bg-red-400 transition-colors">Delete</button>
                <button onClick={()=>setConfirmDel(false)} className="flex-1 border border-gray-200 text-white/35 text-xs py-2 hover:text-gray-900 transition-colors">Cancel</button></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CANVAS TAB — enhanced drawing toolkit
// ══════════════════════════════════════════════════════════════════════════════
const CANVAS_SEED = [
  {id:1,type:"section",x:40, y:40, w:680,h:52, content:"Active Projects", color:"#0f172a",fontSize:11},
  {id:2,type:"card",   x:40, y:120,w:230,h:140,content:"Don Toliver collab\nWaiting on Atlantic stems",color:"#1a2744",fontSize:11},
  {id:3,type:"card",   x:290,y:120,w:230,h:140,content:"Kaycyy EP\n3 records placed",color:"#1a3a2a",fontSize:11},
  {id:4,type:"sticky", x:40, y:300,w:200,h:160,content:"Call Jose re: Joony placement deal",color:"#78350f",fontSize:12},
  {id:5,type:"sticky", x:260,y:300,w:200,h:160,content:"Empire A&R — follow up this week",color:"#1e3a5f",fontSize:12},
];

// Full expanded color palette for nodes
const NODE_COLOURS = [
  // Lights / pastels
  "#f8fafc","#dbeafe","#dcfce7","#fee2e2","#ede9fe","#fef3c7","#e0f2fe","#fce7f3","#ecfdf5",
  // Vivid / brand
  "#f59e0b","#3b82f6","#10b981","#ef4444","#8b5cf6","#ec4899","#f97316","#06b6d4","#84cc16",
  // Dark / deep
  "#0f172a","#1e3a5f","#1a3a2a","#3b1a1a","#1a1a2e","#2d1a3a","#374151","#1f2937","#111827",
];

const NODE_FONT_SIZES = [
  {id:"xs",label:"XS",val:10},
  {id:"sm",label:"S", val:12},
  {id:"md",label:"M", val:15},
  {id:"lg",label:"L", val:18},
  {id:"xl",label:"XL",val:22},
];

const NODE_TYPES   = [{id:"card",label:"Project Card",w:230,h:140},{id:"sticky",label:"Sticky Note",w:200,h:160},{id:"section",label:"Section",w:340,h:52}];
const DRAW_COLORS  = ["#f59e0b","#ef4444","#3b82f6","#10b981","#8b5cf6","#ec4899","#f97316","#06b6d4","#ffffff","#111827","#64748b","#84cc16"];
const SIZE_PRESETS = [{id:"xs",label:"XS",val:1},{id:"s",label:"S",val:2},{id:"m",label:"M",val:4},{id:"l",label:"L",val:8}];
const TOOL_DEFS    = [
  {id:"select", Icon:MousePointer, tip:"Select & Move"},
  {id:"pen",    Icon:Pencil,       tip:"Freehand Pen"},
  {id:"eraser", Icon:Eraser,       tip:"Eraser"},
  {id:"rect",   Icon:Square,       tip:"Rectangle"},
  {id:"circle", Icon:Circle,       tip:"Ellipse"},
  {id:"line",   Icon:Minus,        tip:"Straight Line"},
  {id:"arrow",  Icon:ArrowRight,   tip:"Arrow"},
  {id:"text",   Icon:Type,         tip:"Text"},
];

function Canvas() {
  const containerRef = useRef(null);
  const textInputRef = useRef(null);
  const nextId       = useRef(50);

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const [nodes,   setNodes]   = useState(CANVAS_SEED);
  const [pan,     setPan]     = useState({x:60,y:40});
  const [zoom,    setZoom]    = useState(0.9);
  const [dragging,setDragging]= useState(null);
  const [panning, setPanning] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editTxt, setEditTxt] = useState("");
  const [addMenu, setAddMenu] = useState(false);

  // ── Draw items (paths + shapes + texts) ──────────────────────────────────
  const drawItemsRef                   = useRef([]);
  const [drawItems, setDrawItemsState] = useState([]);
  function setDrawItems(v) {
    const next = typeof v === "function" ? v(drawItemsRef.current) : v;
    drawItemsRef.current = next;
    setDrawItemsState(next);
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const histRef               = useRef([[]]); // array of snapshots
  const histIdx               = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function commitDraw(newItems) {
    const trimmed = histRef.current.slice(0, histIdx.current + 1);
    histRef.current = [...trimmed, newItems].slice(-60);
    histIdx.current = histRef.current.length - 1;
    setDrawItems(newItems);
    setCanUndo(histIdx.current > 0);
    setCanRedo(false);
  }
  function undo() {
    if (histIdx.current <= 0) return;
    histIdx.current--;
    setDrawItems(histRef.current[histIdx.current] || []);
    setCanUndo(histIdx.current > 0);
    setCanRedo(true);
  }
  function redo() {
    if (histIdx.current >= histRef.current.length - 1) return;
    histIdx.current++;
    setDrawItems(histRef.current[histIdx.current] || []);
    setCanUndo(true);
    setCanRedo(histIdx.current < histRef.current.length - 1);
  }

  // ── Active draw state ─────────────────────────────────────────────────────
  const [curPath,   setCurPath]   = useState(null);
  const [shapeStart,setShapeStart]= useState(null);
  const [shapePrev, setShapePrev] = useState(null);
  const [textBox,   setTextBox]   = useState(null); // {wx,wy,sx,sy}
  const [textDraft, setTextDraft] = useState("");

  // ── Tool + color + size ──────────────────────────────────────────────────
  const [tool,      setTool]      = useState("select");
  const [drawColor, setDrawColor] = useState("#f59e0b");
  const [drawSize,  setDrawSize]  = useState(2);

  const isDrawing = tool !== "select";

  // ── Load from API ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/whiteboard`).then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.nodes?.length) setNodes(d.nodes.map(n=>({...n,w:n.w||230,h:n.h||140}))); })
      .catch(() => {});
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==="z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==="y" || (e.key==="z"&&e.shiftKey))) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Coordinate helpers ────────────────────────────────────────────────────
  function zoomBy(delta,cx,cy) {
    setZoom(z => {
      const nz = Math.min(3, Math.max(0.15, z+delta));
      if (cx!==undefined) setPan(p=>({x:cx-(cx-p.x)*(nz/z),y:cy-(cy-p.y)*(nz/z)}));
      return nz;
    });
  }
  function toWorld(cx,cy) {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return {x:0,y:0};
    return {x:(cx-r.left-pan.x)/zoom, y:(cy-r.top-pan.y)/zoom};
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────
  function onContainerDown(e) {
    if (tool==="select") {
      if (e.button===1||e.altKey) { e.preventDefault(); setPanning({sx:e.clientX,sy:e.clientY,px:pan.x,py:pan.y}); }
      else { setSelNode(null); setAddMenu(false); }
      return;
    }
    const pt = toWorld(e.clientX, e.clientY);
    if (tool==="pen") {
      setCurPath({color:drawColor, size:drawSize, points:[pt]});
    } else if (tool==="text") {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) { setTextBox({wx:pt.x,wy:pt.y,sx:e.clientX-r.left,sy:e.clientY-r.top}); setTextDraft(""); setTimeout(()=>textInputRef.current?.focus(),30); }
    } else if (["rect","circle","line","arrow"].includes(tool)) {
      setShapeStart(pt);
      setShapePrev({shape:tool,x1:pt.x,y1:pt.y,x2:pt.x,y2:pt.y,color:drawColor,size:drawSize});
    }
  }

  function onNodeDown(e,id) {
    if (isDrawing) return;
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setDragging({id, ox:(e.clientX-r.left)/zoom, oy:(e.clientY-r.top)/zoom});
    setSelNode(id);
  }

  function onMouseMove(e) {
    const pt = toWorld(e.clientX, e.clientY);
    if (tool==="pen" && curPath) { setCurPath(p=>({...p,points:[...p.points,pt]})); return; }
    if (tool==="eraser" && e.buttons===1) {
      const R = drawSize * 6;
      setDrawItems(items => items.filter(item => {
        if (item.type==="path") return !item.points.some(p=>Math.hypot(p.x-pt.x,p.y-pt.y)<R);
        if (item.type==="shape") { const mx=(item.x1+item.x2)/2,my=(item.y1+item.y2)/2; return Math.hypot(mx-pt.x,my-pt.y)>=R*2; }
        if (item.type==="text") return Math.hypot(item.x-pt.x,item.y-pt.y)>=R*3;
        return true;
      }));
      return;
    }
    if (shapePrev) { setShapePrev(p=>({...p,x2:pt.x,y2:pt.y})); return; }
    if (tool==="select") {
      if (dragging) {
        const r=containerRef.current?.getBoundingClientRect();
        if (!r) return;
        const nx=(e.clientX-r.left-pan.x)/zoom-dragging.ox;
        const ny=(e.clientY-r.top-pan.y)/zoom-dragging.oy;
        setNodes(p=>p.map(n=>n.id===dragging.id?{...n,x:nx,y:ny}:n));
      }
      if (panning) setPan({x:panning.px+e.clientX-panning.sx,y:panning.py+e.clientY-panning.sy});
    }
  }

  function onMouseUp(e) {
    const pt = toWorld(e.clientX, e.clientY);
    if (tool==="pen" && curPath && curPath.points.length>1) {
      commitDraw([...drawItemsRef.current, {id:nextId.current++,type:"path",...curPath}]);
      setCurPath(null); return;
    }
    setCurPath(null);
    if (shapePrev && shapeStart) {
      const {x1,y1} = shapePrev;
      if (Math.hypot(pt.x-x1,pt.y-y1)>4) {
        commitDraw([...drawItemsRef.current, {id:nextId.current++,type:"shape",shape:shapePrev.shape,x1,y1,x2:pt.x,y2:pt.y,color:drawColor,size:drawSize}]);
      }
      setShapePrev(null); setShapeStart(null); return;
    }
    if (tool==="eraser") { commitDraw([...drawItemsRef.current]); return; }
    if (tool==="select") {
      if (dragging) {
        const node=nodes.find(n=>n.id===dragging.id);
        if (node) fetch(`${API}/api/whiteboard/nodes/${node.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({x:node.x,y:node.y})}).catch(()=>{});
        setDragging(null);
      }
      setPanning(null);
    }
  }

  function commitText() {
    if (!textDraft.trim()||!textBox) { setTextBox(null); return; }
    commitDraw([...drawItemsRef.current, {id:nextId.current++,type:"text",x:textBox.wx,y:textBox.wy,text:textDraft,color:drawColor,fontSize:drawSize*5+14}]);
    setTextBox(null); setTextDraft("");
  }

  useEffect(()=>{
    const el=containerRef.current;
    const h=e=>{e.preventDefault();const r=el.getBoundingClientRect();zoomBy(-e.deltaY*.0008,e.clientX-r.left,e.clientY-r.top);};
    el?.addEventListener("wheel",h,{passive:false});
    return ()=>el?.removeEventListener("wheel",h);
  });

  // ── Node management ───────────────────────────────────────────────────────
  function addNode(type) {
    const def=NODE_TYPES.find(t=>t.id===type); const id=nextId.current++;
    const n={id,type,x:(100-pan.x)/zoom,y:(100-pan.y)/zoom,w:def.w,h:def.h,content:"",color:NODE_COLOURS[0],fontSize:11};
    setNodes(p=>[...p,n]); setSelNode(id); setEditing(id); setEditTxt(""); setAddMenu(false);
    fetch(`${API}/api/whiteboard/nodes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)})
      .then(r=>r.json()).then(d=>setNodes(p=>p.map(x=>x.id===id?{...x,id:d.id}:x))).catch(()=>{});
  }
  function delNode(id) { setNodes(p=>p.filter(n=>n.id!==id)); setSelNode(null); fetch(`${API}/api/whiteboard/nodes/${id}`,{method:"DELETE"}).catch(()=>{}); }
  function setNodeColor(id,c) { setNodes(p=>p.map(n=>n.id===id?{...n,color:c}:n)); fetch(`${API}/api/whiteboard/nodes/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({color:c})}).catch(()=>{}); }
  function setNodeFontSize(id,sz) { setNodes(p=>p.map(n=>n.id===id?{...n,fontSize:sz}:n)); fetch(`${API}/api/whiteboard/nodes/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({fontSize:sz})}).catch(()=>{}); }
  function saveEdit(id) { setNodes(p=>p.map(n=>n.id===id?{...n,content:editTxt}:n)); setEditing(null); fetch(`${API}/api/whiteboard/nodes/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:editTxt})}).catch(()=>{}); }

  // ── Shape renderer ────────────────────────────────────────────────────────
  function renderShapeEl(s, key, preview=false) {
    const sw=(s.size||2)/zoom, props={stroke:s.color,strokeWidth:sw,fill:"none",strokeLinecap:"round",strokeLinejoin:"round",opacity:preview?0.55:0.9};
    const {x1,y1,x2,y2}=s;
    if (s.shape==="rect") { const x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.abs(x2-x1),h=Math.abs(y2-y1); return <rect key={key} x={x} y={y} width={Math.max(w,1)} height={Math.max(h,1)} {...props} strokeDasharray={preview?"6 3":undefined}/>; }
    if (s.shape==="circle") { const cx=(x1+x2)/2,cy=(y1+y2)/2,rx=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2; return <ellipse key={key} cx={cx} cy={cy} rx={Math.max(rx,1)} ry={Math.max(ry,1)} {...props} strokeDasharray={preview?"6 3":undefined}/>; }
    if (s.shape==="line") return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...props}/>;
    if (s.shape==="arrow") {
      const ang=Math.atan2(y2-y1,x2-x1),hl=14/zoom;
      const a1x=x2-hl*Math.cos(ang-Math.PI/6),a1y=y2-hl*Math.sin(ang-Math.PI/6);
      const a2x=x2-hl*Math.cos(ang+Math.PI/6),a2y=y2-hl*Math.sin(ang+Math.PI/6);
      return <g key={key}><line x1={x1} y1={y1} x2={x2} y2={y2} {...props}/><polyline points={`${a1x},${a1y} ${x2},${y2} ${a2x},${a2y}`} {...props}/></g>;
    }
    return null;
  }

  function pts2str(pts) { return pts.map(p=>`${p.x},${p.y}`).join(" "); }

  const cursor = isDrawing
    ? (tool==="text"?"text":tool==="eraser"?"cell":"crosshair")
    : (panning||dragging?"grabbing":"default");

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 flex-wrap">

        {/* Tool buttons */}
        <div className="flex items-center border border-gray-200 p-0.5 gap-0.5">
          {TOOL_DEFS.map(({id,Icon,tip})=>(
            <button key={id} onClick={()=>{setTool(id);setTextBox(null);}} title={tip}
              className={`p-1.5 transition-all rounded-sm ${tool===id?"bg-amber-400/20 text-amber-500":"text-gray-400 hover:text-gray-700"}`}>
              <Icon size={12}/>
            </button>
          ))}
        </div>

        {/* Color swatches (drawing tools only) */}
        {isDrawing && (
          <div className="flex items-center gap-0.5 border border-gray-200 p-1">
            {DRAW_COLORS.map(c=>(
              <button key={c} onClick={()=>setDrawColor(c)}
                className="w-3.5 h-3.5 rounded-full border-2 hover:scale-125 transition-transform flex-shrink-0"
                style={{background:c,borderColor:drawColor===c?"#374151":"transparent"}}/>
            ))}
          </div>
        )}

        {/* Size presets (drawing only, not text) */}
        {isDrawing && tool!=="text" && (
          <div className="flex items-center gap-0 border border-gray-200">
            {SIZE_PRESETS.map(s=>(
              <button key={s.id} onClick={()=>setDrawSize(s.val)}
                className={`px-2 py-1.5 text-[9px] font-bold transition-all ${drawSize===s.val?"bg-amber-400/20 text-amber-500":"text-gray-400 hover:text-gray-600"}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="w-px h-5 bg-gray-200 mx-0.5"/>

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="p-1.5 border border-gray-200 text-gray-400 hover:text-gray-900 disabled:opacity-25 transition-colors">
          <Undo2 size={12}/>
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
          className="p-1.5 border border-gray-200 text-gray-400 hover:text-gray-900 disabled:opacity-25 transition-colors">
          <Redo2 size={12}/>
        </button>
        <button onClick={()=>commitDraw([])}
          className="flex items-center gap-1 text-[10px] border border-gray-200 px-2 py-1.5 text-gray-400 hover:text-red-400 transition-colors">
          <Eraser size={11}/> Clear
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5"/>

        {/* Quick Sticky */}
        <button onClick={()=>addNode("sticky")} title="Add Sticky Note"
          className="flex items-center gap-1.5 bg-yellow-300 text-yellow-900 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 hover:bg-yellow-200 transition-colors">
          <StickyNote size={11}/> Sticky
        </button>

        {/* Add node dropdown */}
        <div className="relative">
          <button onClick={()=>setAddMenu(v=>!v)}
            className="flex items-center gap-1.5 bg-amber-400 text-black text-[10px] font-black tracking-widest uppercase px-3 py-1.5 hover:bg-amber-300 transition-colors">
            <Plus size={11}/> Node
          </button>
          <AnimatePresence>
            {addMenu&&(
              <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 z-50 w-40 shadow-xl">
                {NODE_TYPES.map(t=>(
                  <button key={t.id} onClick={()=>addNode(t.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                    <LayoutGrid size={11} className="text-amber-400"/>{t.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zoom */}
        <div className="flex items-center border border-gray-200 px-1">
          <button onClick={()=>zoomBy(-.15)} className="text-gray-400 hover:text-gray-900 p-1.5"><ZoomOut size={11}/></button>
          <span className="text-gray-300 text-[10px] w-8 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={()=>zoomBy(+.15)} className="text-gray-400 hover:text-gray-900 p-1.5"><ZoomIn size={11}/></button>
          <button onClick={()=>{setPan({x:60,y:40});setZoom(.9);}} className="text-gray-400 hover:text-gray-900 p-1.5 border-l border-gray-200"><Maximize2 size={10}/></button>
        </div>

        <p className="text-gray-200 text-[9px] ml-auto hidden xl:block">
          {tool==="select"?"Alt+drag to pan · Scroll to zoom · Dbl-click node to edit"
          :tool==="text"?"Click canvas to place text · Enter to commit"
          :tool==="eraser"?"Click+drag to erase strokes"
          :tool==="pen"?"Click+drag to draw freehand"
          :"Click+drag to draw shape"}
        </p>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-50"
        style={{
          backgroundImage:"radial-gradient(circle,rgba(0,0,0,0.07) 1px,transparent 1px)",
          backgroundSize:`${22*zoom}px ${22*zoom}px`,
          backgroundPosition:`${pan.x%(22*zoom)}px ${pan.y%(22*zoom)}px`,
          cursor, userSelect:"none",
        }}
        onMouseDown={onContainerDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

        {/* Nodes layer */}
        <div style={{position:"absolute",top:0,left:0,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:"0 0"}}>
          {nodes.map(node=>{
            const isSel=selNode===node.id, isEdit=editing===node.id, isSec=node.type==="section";
            const nodeFz = node.fontSize || (node.type==="sticky"?12:11);
            const textColor = /^#[0-9a-f]{6}$/i.test(node.color)
              ? (parseInt(node.color.slice(1,3),16)*0.299+parseInt(node.color.slice(3,5),16)*0.587+parseInt(node.color.slice(5,7),16)*0.114 > 128
                  ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)")
              : "rgba(255,255,255,0.85)";
            return (
              <div key={node.id}
                style={{position:"absolute",left:node.x,top:node.y,width:node.w,minHeight:node.h,cursor:isDrawing?"crosshair":"grab",zIndex:isSel?999:1}}
                onMouseDown={e=>onNodeDown(e,node.id)}
                onDoubleClick={e=>{if(isDrawing)return;e.stopPropagation();setEditing(node.id);setEditTxt(node.content);setSelNode(node.id);}}>
                <div className={isSel&&!isDrawing?"ring-1 ring-amber-400/50":""} style={{background:node.color,boxShadow:isSel?"0 0 0 2px rgba(251,191,36,.6),0 4px 20px rgba(0,0,0,.15)":"0 2px 8px rgba(0,0,0,.08)",width:"100%",height:"100%",minHeight:node.h,padding:isSec?"0 14px":"10px",display:"flex",alignItems:isSec?"center":"flex-start",flexDirection:isSec?"row":"column",boxSizing:"border-box"}}>
                  {isSec?<span style={{color:"rgba(255,255,255,.4)",fontSize:10,fontWeight:900,letterSpacing:"0.25em",textTransform:"uppercase"}}>{node.content||"Section"}</span>
                  :isEdit?(
                    <div style={{display:"flex",flexDirection:"column",width:"100%",flex:1}}>
                      <textarea autoFocus value={editTxt} onChange={e=>setEditTxt(e.target.value)} onKeyDown={e=>{e.stopPropagation();if(e.key==="Escape")setEditing(null);if(e.key==="Enter"&&e.ctrlKey)saveEdit(node.id);}} onClick={e=>e.stopPropagation()} style={{background:"transparent",border:"none",outline:"none",color:textColor,fontSize:nodeFz,resize:"none",flex:1,lineHeight:1.6,fontFamily:"inherit"}} placeholder="Type…"/>
                      <div style={{display:"flex",gap:6,marginTop:6}}>
                        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();saveEdit(node.id);}} style={{flex:1,background:"#f59e0b",color:"#000",fontSize:9,fontWeight:900,letterSpacing:"0.1em",padding:"4px 0",border:"none",cursor:"pointer",textTransform:"uppercase"}}>Save (Ctrl+Enter)</button>
                        <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setEditing(null);}} style={{flex:1,background:"rgba(0,0,0,0.1)",color:textColor,fontSize:9,border:"none",cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ):<p style={{color:textColor,fontSize:nodeFz,lineHeight:1.6,whiteSpace:"pre-wrap",margin:0}}>{node.content||<span style={{opacity:0.3,fontStyle:"italic"}}>Dbl-click to edit</span>}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Node Inspector — appears when a node is selected ─────────────── */}
        <AnimatePresence>
          {selNode !== null && !editing && !isDrawing && (()=>{
            const node = nodes.find(n=>n.id===selNode);
            if (!node) return null;
            const nodeFz = node.fontSize || 11;
            return (
              <motion.div key="inspector"
                initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}}
                transition={{duration:0.15}}
                className="absolute top-3 right-3 z-[500] bg-white border border-gray-200 shadow-2xl w-52 overflow-hidden"
                onMouseDown={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-[9px] text-gray-400 tracking-widest uppercase font-black">
                    {node.type==="sticky"?"Sticky Note":node.type==="section"?"Section":"Card"}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>{setEditing(node.id);setEditTxt(node.content);}} title="Edit text"
                      className="text-gray-400 hover:text-amber-500 p-0.5 transition-colors"><Edit3 size={10}/></button>
                    <button onClick={()=>delNode(node.id)} title="Delete node"
                      className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"><Trash2 size={10}/></button>
                    <button onClick={()=>setSelNode(null)} className="text-gray-400 hover:text-gray-900 p-0.5 transition-colors"><X size={10}/></button>
                  </div>
                </div>
                {/* Color grid */}
                <div className="p-2.5">
                  <p className="text-[8px] text-gray-300 uppercase tracking-widest mb-2">Color</p>
                  <div className="grid grid-cols-9 gap-1">
                    {NODE_COLOURS.map(c=>(
                      <button key={c} onClick={()=>setNodeColor(node.id,c)}
                        className="w-4 h-4 rounded-sm hover:scale-125 transition-transform flex-shrink-0"
                        style={{background:c,border:node.color===c?"2px solid #f59e0b":"1px solid rgba(0,0,0,0.12)",boxShadow:node.color===c?"0 0 0 1px #f59e0b":"none"}}/>
                    ))}
                  </div>
                </div>
                {/* Font size — only for card/sticky */}
                {node.type !== "section" && (
                  <div className="px-2.5 pb-2.5">
                    <p className="text-[8px] text-gray-300 uppercase tracking-widest mb-1.5">Text Size</p>
                    <div className="flex gap-1">
                      {NODE_FONT_SIZES.map(s=>(
                        <button key={s.id} onClick={()=>setNodeFontSize(node.id,s.val)}
                          className={`flex-1 py-1 text-[9px] font-bold border transition-all ${nodeFz===s.val?"bg-amber-400/20 text-amber-600 border-amber-400/40":"border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* SVG draw layer */}
        <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:isDrawing?"all":"none"}}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {drawItems.map((item,i)=>{
              if (item.type==="path") return <polyline key={item.id||i} points={pts2str(item.points)} stroke={item.color} strokeWidth={(item.size||2)/zoom} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>;
              if (item.type==="shape") return renderShapeEl(item, item.id||i);
              if (item.type==="text") return <text key={item.id||i} x={item.x} y={item.y} fill={item.color} fontSize={(item.fontSize||18)/zoom} fontFamily="inherit" fontWeight="700" opacity={0.9} style={{pointerEvents:"none",userSelect:"none"}}>{item.text}</text>;
              return null;
            })}
            {curPath&&curPath.points.length>0&&<polyline points={pts2str(curPath.points)} stroke={curPath.color} strokeWidth={(curPath.size||2)/zoom} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}/>}
            {shapePrev&&renderShapeEl(shapePrev,"preview",true)}
          </g>
        </svg>

        {/* Floating text input */}
        {textBox&&(
          <div style={{position:"absolute",left:textBox.sx,top:textBox.sy,zIndex:1000}} onMouseDown={e=>e.stopPropagation()}>
            <input ref={textInputRef} value={textDraft}
              onChange={e=>setTextDraft(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commitText();}if(e.key==="Escape"){setTextBox(null);setTextDraft("");}}}
              onBlur={commitText}
              style={{background:"rgba(255,255,255,0.95)",border:`2px solid ${drawColor}`,color:"#111827",fontSize:Math.max(14,drawSize*5)*zoom,padding:"2px 8px",outline:"none",minWidth:80,fontFamily:"inherit",fontWeight:700}}
              placeholder="Type text…"/>
            <p style={{fontSize:9,color:"#94a3b8",marginTop:2}}>Enter to place · Esc to cancel</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ALL FOLLOW-UPS TAB
// ══════════════════════════════════════════════════════════════════════════════
function AllFollowUps() {
  const { projects, followups, addFollowup, updateFollowup, deleteFollowup } = useProjects();
  const [filter,  setFilter]  = useState("active"); // active = pending + overdue
  const [addOpen, setAddOpen] = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState({title:"",type:"demo_sent",status:"pending",due_date:"",contact_name:"",notes:"",projectId:null});

  function openAdd() { setForm({title:"",type:"demo_sent",status:"pending",due_date:"",contact_name:"",notes:"",projectId:null}); setEditId(null); setAddOpen(true); }
  function openEdit(fu) { setForm({...fu}); setEditId(fu.id); setAddOpen(true); }
  function save() { if(!form.title.trim())return; if(editId){updateFollowup(editId,form);}else{addFollowup(form);} setAddOpen(false); }
  function del(id){ deleteFollowup(id); }
  function cycle(id,cur){ const o=["pending","done","snoozed","overdue"]; updateFollowup(id,{status:o[(o.indexOf(cur)+1)%o.length]}); }

  const filtered = useMemo(()=>{
    if (filter==="all") return followups;
    if (filter==="active") return followups.filter(f=>f.status==="pending"||f.status==="overdue");
    return followups.filter(f=>f.status===filter);
  },[followups,filter]);
  const counts = useMemo(()=>{
    const c={all:followups.length, active:followups.filter(f=>f.status==="pending"||f.status==="overdue").length};
    ["pending","done","snoozed","overdue"].forEach(s=>{c[s]=followups.filter(f=>f.status===s).length;});
    return c;
  },[followups]);
  const overdue = followups.filter(f=>f.status==="pending"&&f.due_date&&new Date(f.due_date)<new Date()).length;

  function getProjectTitle(pid) { return projects.find(p=>p.id===pid)?.title||null; }
  function getProjectColor(pid) { return projects.find(p=>p.id===pid)?.color||"#6b7280"; }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-gray-300 text-[8px] tracking-[0.3em] uppercase mb-0.5">Across All Projects</p>
          <h2 className="text-gray-900 font-black text-base" style={{letterSpacing:"-0.02em"}}>Follow-Ups {overdue>0&&<span className="ml-2 text-xs font-normal text-red-400">{overdue} overdue</span>}</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-amber-400 text-black text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-300 transition-colors"><Plus size={12}/> Add</button>
      </div>
      <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-1 flex-shrink-0 overflow-x-auto">
        {[
          {id:"active", label:"Active"},
          {id:"pending",label:"Pending"},
          {id:"overdue",label:"Overdue"},
          {id:"snoozed",label:"Snoozed"},
          {id:"done",   label:"Done"},
          {id:"all",    label:"All"},
        ].map(s=>(
          <button key={s.id} onClick={()=>setFilter(s.id)} className={`text-[9px] px-3 py-1 transition-all whitespace-nowrap ${filter===s.id?"bg-amber-400/10 text-amber-600 border border-amber-400/20":"text-gray-400 hover:text-gray-500"}`}>
            {s.label} <span className="text-gray-300">{counts[s.id]||0}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
        {filtered.length===0&&<div className="text-center py-20"><CheckCircle2 size={28} className="text-white/8 mx-auto mb-3"/><p className="text-gray-300 text-xs">All clear</p></div>}
        {filtered.map(fu=>{
          const projTitle = getProjectTitle(fu.projectId||fu.project_id);
          const projColor = getProjectColor(fu.projectId||fu.project_id);
          return (
            <motion.div key={fu.id} layout initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} className="group">
              <div className={`flex items-center gap-3 px-3 py-2.5 border border-gray-200 bg-gray-50 hover:border-gray-200 transition-all ${fu.status==="done"?"opacity-40":""}`}>
                <button onClick={()=>cycle(fu.id,fu.status)} className="flex-shrink-0">
                  {fu.status==="done"?<CheckCircle2 size={13} className="text-emerald-400"/>:fu.status==="snoozed"?<Clock size={13} className="text-gray-400"/>:fu.status==="overdue"?<AlertCircle size={13} className="text-red-400"/>:<Circle size={13} className="text-amber-400"/>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {projTitle&&<span className="text-[8px] px-1.5 py-0.5 rounded-sm font-black" style={{background:`${projColor}30`,color:projColor}}>{projTitle}</span>}
                    <span className="text-[8px] text-gray-400">{FU_TYPES[fu.type]?.label}</span>
                    {fu.contact_name&&<span className="text-gray-300 text-[8px]">· {fu.contact_name}</span>}
                  </div>
                  <p className={`text-sm ${fu.status==="done"?"line-through text-gray-400":"text-white/75"}`}>{fu.title}</p>
                </div>
                {fu.due_date&&(()=>{const d=daysUntil(fu.due_date);return d?<span className={`text-[9px] flex-shrink-0 ${d.cls}`}>{d.text}</span>:null;})()}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={()=>openEdit(fu)} className="text-gray-300 hover:text-gray-900 p-1"><Edit3 size={10}/></button>
                  <button onClick={()=>del(fu.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 size={10}/></button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {addOpen&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/30 z-40" onClick={()=>setAddOpen(false)}/>
            <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-gray-50 border border-gray-200 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4"><h3 className="text-gray-900 font-black">{editId?"Edit":"New"} Follow-Up</h3><button onClick={()=>setAddOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={16}/></button></div>
                <div className="space-y-3">
                  <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Project</label>
                    <select value={form.projectId||""} onChange={e=>setForm(p=>({...p,projectId:e.target.value?Number(e.target.value):null}))} className={inputCls}>
                      <option value="">— No project —</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
                    </select></div>
                  {[{k:"title",l:"Title",t:"text",ph:"What needs doing?"},{k:"contact_name",l:"Contact",t:"text",ph:"Who's involved?"},{k:"due_date",l:"Due Date",t:"date",ph:""},{k:"notes",l:"Notes",t:"text",ph:"Context…"}].map(f=>(
                    <div key={f.k}><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">{f.l}</label><input type={f.t} value={form[f.k]||""} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} className={inputCls}/></div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Type</label><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={inputCls}>{Object.entries(FU_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                    <div><label className="text-gray-400 text-[9px] tracking-widest uppercase block mb-1">Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={inputCls}>{["pending","done","snoozed","overdue"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={save} className="flex-1 bg-amber-400 text-black text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-300 transition-colors">{editId?"Save":"Add"}</button>
                  <button onClick={()=>setAddOpen(false)} className="px-4 border border-gray-200 text-gray-500 hover:text-gray-900 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"projects",  label:"Projects",   Icon: LayoutGrid   },
  { id:"canvas",    label:"Canvas",     Icon: StickyNote   },
  { id:"followups", label:"Follow-Ups", Icon: CheckCircle2 },
];

export default function AdminWhiteboard() {
  const [tab, setTab] = useState("projects");
  const { deadlineAlerts } = useProjects();
  return (
    <AdminShell>
      <div className="flex flex-col overflow-hidden" style={{height:"100vh"}}>
        <div className="flex items-center border-b border-gray-200 bg-gray-50 flex-shrink-0 px-4">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-medium border-b-2 transition-all relative ${tab===t.id?"border-amber-400 text-gray-900":"border-transparent text-gray-500 hover:text-gray-500"}`}>
              <t.Icon size={12} className={tab===t.id?"text-amber-400":""}/>
              {t.label}
              {t.id==="projects"&&deadlineAlerts.length>0&&(
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"/>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {tab==="projects"  && <ProjectsTab/>}
          {tab==="canvas"    && <Canvas/>}
          {tab==="followups" && <AllFollowUps/>}
        </div>
      </div>
    </AdminShell>
  );
}
