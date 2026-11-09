/**
 * projectsStore.js — shared project state
 * Persists to localStorage + syncs to Flask API.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

const API       = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");
const LS_PROJ   = "s3_projects_v3";
const LS_LINKS  = "s3_proj_contacts_v3";
const LS_FU     = "s3_proj_followups_v3";
const LS_AUDIO  = "s3_proj_audio_v1";

export const PROJECT_TYPES = ["Session","Release","Sync","Collab","Mix","Commitment","Other"];
export const PROJECT_COLS  = [
  { id:"current",  label:"Current"  },
  { id:"upcoming", label:"Upcoming" },
  { id:"hold",     label:"On Hold"  },
  { id:"past",     label:"Past"     },
];

export const TYPE_COLORS = {
  Session:    "#f59e0b",
  Release:    "#3b82f6",
  Sync:       "#10b981",
  Collab:     "#ec4899",
  Mix:        "#8b5cf6",
  Commitment: "#f97316",
  Other:      "#6b7280",
};

// Project card colours (user-assignable, shown as mini squares on contacts)
export const PROJECT_PALETTE = [
  "#f59e0b","#3b82f6","#10b981","#ec4899","#8b5cf6",
  "#f97316","#ef4444","#06b6d4","#84cc16","#e879f9",
];

export const SEED_PROJECTS = [
  { id:1, title:"Don Toliver Collab",  type:"Session",    col:"current",  deadline:"2026-05-15", color:"#f59e0b", notes:"Waiting on stems from Atlantic. 4 records ready." },
  { id:2, title:"Kaycyy EP",           type:"Release",    col:"current",  deadline:"2026-06-01", color:"#3b82f6", notes:"3 records placed. Fallin on Purpose confirmed." },
  { id:3, title:"BEAM — NBA 2K Sync",  type:"Sync",       col:"current",  deadline:"2026-05-10", color:"#10b981", notes:"WIN placement. Contracts under legal review." },
  { id:4, title:"Solo EP — Overtonight",type:"Release",   col:"upcoming", deadline:"2026-08-01", color:"#8b5cf6", notes:"Pre-production. Sound locked in." },
  { id:5, title:"300 Ent Pitch",       type:"Collab",     col:"upcoming", deadline:"2026-05-01", color:"#ec4899", notes:"Vicente Lopez intro. Need follow-up." },
];

export const SEED_FOLLOWUPS = [
  { id:1, projectId:1, title:"Don Toliver stems",        type:"demo_sent",        status:"pending",  due_date:"2026-05-01", contact_name:"Don Toliver",      notes:"Sent 4 records via Benji @ Atlantic" },
  { id:2, projectId:5, title:"300 Ent A&R intro",        type:"pitch",            status:"pending",  due_date:"2026-04-30", contact_name:"Vicente Lopez",     notes:"Follow-up after initial meet" },
  { id:3, projectId:2, title:"Kaycyy EP mixing session", type:"meeting",          status:"done",     due_date:"2026-04-20", contact_name:"Kaycyy",            notes:"Session at Carriage House" },
  { id:4, projectId:3, title:"BEAM sync feedback",       type:"feedback_pending", status:"pending",  due_date:"2026-05-10", contact_name:"BEAM",              notes:"Publisher reviewing WIN terms" },
];

let _nextProjId = 10;
let _nextFuId   = 10;

function load(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

let _nextAudioId = 100;

export function useProjects() {
  const [projects,    _setProjects] = useState(() => load(LS_PROJ, SEED_PROJECTS));
  const [links,       _setLinks]    = useState(() => load(LS_LINKS, {}));   // { projectId: contactId[] }
  const [followups,   _setFu]       = useState(() => load(LS_FU, SEED_FOLLOWUPS));
  const [audioFiles,  _setAudio]    = useState(() => load(LS_AUDIO, {}));   // { projectId: [{id,name,type,source,size,path}] }

  const setProjects = useCallback(fn => {
    _setProjects(prev => { const n = typeof fn==="function"?fn(prev):fn; save(LS_PROJ,n); return n; });
  }, []);
  const setLinks = useCallback(fn => {
    _setLinks(prev => { const n = typeof fn==="function"?fn(prev):fn; save(LS_LINKS,n); return n; });
  }, []);
  const setFu = useCallback(fn => {
    _setFu(prev => { const n = typeof fn==="function"?fn(prev):fn; save(LS_FU,n); return n; });
  }, []);
  const setAudio = useCallback(fn => {
    _setAudio(prev => { const n = typeof fn==="function"?fn(prev):fn; save(LS_AUDIO,n); return n; });
  }, []);

  // Try Flask on mount
  useEffect(() => {
    fetch(`${API}/api/projects`).then(r=>r.ok?r.json():null)
      .then(d=>{ if(d?.length) setProjects(d); }).catch(()=>{});
  }, []);

  // ── Projects ──────────────────────────────────────────────────────────────
  function addProject(data) {
    const id = _nextProjId++;
    const p  = { id, color: PROJECT_PALETTE[id % PROJECT_PALETTE.length], ...data };
    setProjects(prev => [...prev, p]);
    fetch(`${API}/api/projects`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}).catch(()=>{});
    return id;
  }

  function updateProject(id, data) {
    setProjects(prev => prev.map(p => p.id===id ? {...p,...data} : p));
    fetch(`${API}/api/projects/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(()=>{});
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id!==id));
    setLinks(prev => { const n={...prev}; delete n[id]; return n; });
    setFu(prev => prev.filter(f => f.projectId!==id));
    fetch(`${API}/api/projects/${id}`,{method:"DELETE"}).catch(()=>{});
  }

  // ── Contact links ─────────────────────────────────────────────────────────
  function assignContact(projectId, contactId) {
    setLinks(prev => {
      const ex = prev[projectId] || [];
      if (ex.includes(contactId)) return prev;
      return {...prev, [projectId]: [...ex, contactId]};
    });
  }

  function unassignContact(projectId, contactId) {
    setLinks(prev => ({...prev, [projectId]: (prev[projectId]||[]).filter(id=>id!==contactId)}));
  }

  function getProjectContacts(projectId) { return links[projectId] || []; }

  // All projects a contact is assigned to
  function getContactProjects(contactId) {
    return projects.filter(p => (links[p.id]||[]).includes(contactId));
  }

  // ── Follow-ups ────────────────────────────────────────────────────────────
  function addFollowup(data) {
    const id = _nextFuId++;
    const f  = { id, ...data };
    setFu(prev => [...prev, f]);
    fetch(`${API}/api/followups`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)}).catch(()=>{});
    return id;
  }

  function updateFollowup(id, data) {
    setFu(prev => prev.map(f => f.id===id ? {...f,...data} : f));
    fetch(`${API}/api/followups/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).catch(()=>{});
  }

  function deleteFollowup(id) {
    setFu(prev => prev.filter(f => f.id!==id));
    fetch(`${API}/api/followups/${id}`,{method:"DELETE"}).catch(()=>{});
  }

  function getProjectFollowups(projectId) {
    return followups.filter(f => f.projectId===projectId || f.project_id===projectId);
  }

  // ── Audio files ───────────────────────────────────────────────────────────
  function addAudioFile(projectId, file) {
    const id = _nextAudioId++;
    const entry = { id, ...file };
    setAudio(prev => ({ ...prev, [projectId]: [...(prev[projectId]||[]), entry] }));
    return id;
  }

  function removeAudioFile(projectId, fileId) {
    setAudio(prev => ({ ...prev, [projectId]: (prev[projectId]||[]).filter(f => f.id !== fileId) }));
  }

  function getProjectAudio(projectId) { return audioFiles[projectId] || []; }

  // ── Deadline alerts ───────────────────────────────────────────────────────
  const deadlineAlerts = useMemo(() => {
    const now = new Date();
    return projects.filter(p => {
      if (!p.deadline || p.col==="past") return false;
      const diff = Math.round((new Date(p.deadline)-now)/86400000);
      return diff <= 3;
    });
  }, [projects]);

  return {
    projects, links, followups, audioFiles,
    addProject, updateProject, deleteProject,
    assignContact, unassignContact, getProjectContacts, getContactProjects,
    addFollowup, updateFollowup, deleteFollowup, getProjectFollowups,
    addAudioFile, removeAudioFile, getProjectAudio,
    deadlineAlerts,
  };
}
