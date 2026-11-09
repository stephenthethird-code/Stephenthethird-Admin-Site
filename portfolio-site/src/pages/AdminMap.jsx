/**
 * AdminMap.jsx  →  /admin/map
 *
 * Full interactive Leaflet world map of all contacts.
 * • Leaflet loaded from CDN (not in package.json)
 * • Contact markers grouped by city, color-coded by highest tier
 * • Click marker → right panel shows contacts + tier breakdown
 * • "+ Add Contact" opens full form
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Users, Star, Plus, Save, RotateCcw,
  Check, UserPlus, Globe
} from "lucide-react";
import AdminShell      from "../components/admin/AdminShell";
import contactsRaw, { TIER_COLORS, TIER_LABELS } from "../data/contactsData";
import { useAdminData } from "../context/AdminDataContext";

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type:"spring", stiffness:300, damping:28 };
const API    = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const ROLES    = ["Artist","Exec","Producer","Engineer","Writer","Creative","Manager","Other"];
const STATUSES = ["active","inactive","reach_out"];
const TIER_LIST = [1,2,3,4,5];

const BLANK = {
  name:"", role:"Artist", tier:3, status:"active",
  company:"", location:"", email:"", phone:"", instagram:"", notes:""
};

// ── City lat/lng lookup ───────────────────────────────────────────────────────
const CITY_LATLNG = {
  // US cities
  NYC:  { lat:40.712, lng:-74.006, label:"New York, NY" },
  NJ:   { lat:40.058, lng:-74.405, label:"New Jersey"   },
  CT:   { lat:41.603, lng:-73.087, label:"Connecticut"  },
  BOS:  { lat:42.360, lng:-71.058, label:"Boston, MA"   },
  LAX:  { lat:34.052, lng:-118.243,label:"Los Angeles, CA"},
  MIA:  { lat:25.774, lng:-80.194, label:"Miami, FL"    },
  ATL:  { lat:33.749, lng:-84.388, label:"Atlanta, GA"  },
  CHI:  { lat:41.878, lng:-87.630, label:"Chicago, IL"  },
  DMV:  { lat:38.905, lng:-77.036, label:"Washington, DC"},
  HOU:  { lat:29.760, lng:-95.369, label:"Houston, TX"  },
  DAL:  { lat:32.776, lng:-96.797, label:"Dallas, TX"   },
  SEA:  { lat:47.606, lng:-122.332,label:"Seattle, WA"  },
  DEN:  { lat:39.739, lng:-104.985,label:"Denver, CO"   },
  PHL:  { lat:39.952, lng:-75.165, label:"Philadelphia, PA"},
  DET:  { lat:42.331, lng:-83.046, label:"Detroit, MI"  },
  MIN:  { lat:44.977, lng:-93.265, label:"Minneapolis, MN"},
  PDX:  { lat:45.523, lng:-122.676,label:"Portland, OR" },
  SF:   { lat:37.774, lng:-122.419,label:"San Francisco, CA"},
  LAS:  { lat:36.175, lng:-115.137,label:"Las Vegas, NV"},
  PHX:  { lat:33.448, lng:-112.074,label:"Phoenix, AZ"  },
  SAN:  { lat:32.715, lng:-117.161,label:"San Diego, CA"},
  MEM:  { lat:35.149, lng:-90.048, label:"Memphis, TN"  },
  NSH:  { lat:36.162, lng:-86.781, label:"Nashville, TN"},
  CLT:  { lat:35.227, lng:-80.843, label:"Charlotte, NC"},
  RVA:  { lat:37.541, lng:-77.434, label:"Richmond, VA" },
  ORL:  { lat:28.538, lng:-81.379, label:"Orlando, FL"  },
  STL:  { lat:38.627, lng:-90.197, label:"St. Louis, MO"},
  KC:   { lat:39.099, lng:-94.578, label:"Kansas City, MO"},
  // International
  LDN:  { lat:51.505, lng:-0.090,  label:"London, UK"   },
  PAR:  { lat:48.857, lng:2.352,   label:"Paris, France" },
  TOR:  { lat:43.653, lng:-79.383, label:"Toronto, CA"  },
  TOK:  { lat:35.690, lng:139.692, label:"Tokyo, Japan" },
  SYD:  { lat:-33.868,lng:151.209, label:"Sydney, AU"   },
  MEX:  { lat:19.433, lng:-99.133, label:"Mexico City"  },
  AMS:  { lat:52.370, lng:4.895,   label:"Amsterdam, NL"},
  BER:  { lat:52.520, lng:13.405,  label:"Berlin, DE"   },
  JA:   { lat:18.109, lng:-77.297, label:"Jamaica"      },
  PR:   { lat:18.466, lng:-66.106, label:"Puerto Rico"  },
  CAN:  { lat:43.653, lng:-79.383, label:"Canada"       },
  UK:   { lat:51.505, lng:-0.090,  label:"United Kingdom"},
  AUS:  { lat:30.267, lng:-97.743, label:"Austin, TX"   },
  OKC:  { lat:35.468, lng:-97.516, label:"Oklahoma City, OK"},
  NOLA: { lat:29.951, lng:-90.072, label:"New Orleans, LA"},
  STO:  { lat:59.329, lng:18.069,  label:"Sweden"       },
  ROM:  { lat:41.903, lng:12.496,  label:"Italy"        },
  MAD:  { lat:40.417, lng:-3.704,  label:"Spain"        },
};

// Aliases used in the master sheet (checked before the loose substring rules,
// otherwise e.g. "Sweden" would match "DEN" = Denver).
const CITY_ALIASES = [
  [/SWEDEN/, "STO"], [/ITALY/, "ROM"], [/SPAIN/, "MAD"], [/FRANCE/, "PAR"],
  [/GERM/, "BER"], [/AUSTIN/, "AUS"], [/^OKC$/, "OKC"], [/^NO$|NEW ORLEANS/, "NOLA"],
  [/^PHI$|PHILA/, "PHL"], [/^TX$/, "DAL"], [/^VA$/, "RVA"], [/^NC$/, "CLT"], [/^FL$/, "ORL"],
  [/^LA$/, "LAX"], [/^SF$/, "SF"],
];

// Extended alias → canonical key
function resolveCity(location) {
  if (!location) return null;
  const u = location.toUpperCase().trim();
  // direct key match
  if (CITY_LATLNG[u]) return u;
  const first = u.split(/[\/,]/)[0].trim();
  if (CITY_LATLNG[first]) return first;
  for (const [re, key] of CITY_ALIASES) if (re.test(u) || re.test(first)) return key;
  // substring matches
  if (u.includes("NEW YORK") || u.includes("NYC"))        return "NYC";
  if (u.includes("LOS ANGELES") || u.includes("LAX"))     return "LAX";
  if (u.includes("ATLANTA") || u.includes("ATL"))         return "ATL";
  if (u.includes("BOSTON") || u.includes("BOS"))          return "BOS";
  if (u.includes("MIAMI") || u.includes("MIA"))           return "MIA";
  if (u.includes("CHICAGO") || u.includes("CHI"))         return "CHI";
  if (u.includes("WASH") || u.includes("DC") || u.includes("DMV")) return "DMV";
  if (u.includes("HOUSTON") || u.includes("HOU"))         return "HOU";
  if (u.includes("DALLAS") || u.includes("DAL"))          return "DAL";
  if (u.includes("SEATTLE") || u.includes("SEA"))         return "SEA";
  if (u.includes("NASHVILLE") || u.includes("NSH"))       return "NSH";
  if (u.includes("NEW JERSEY") || u.includes(" NJ"))      return "NJ";
  if (u.includes("CONNECTICUT") || u.includes(" CT"))     return "CT";
  if (u.includes("SAN FRAN") || u.includes(" SF"))        return "SF";
  if (u.includes("SAN DIEGO") || u.includes("SAN"))       return "SAN";
  if (u.includes("LONDON") || u.includes("LDN"))          return "LDN";
  if (u.includes("PARIS") || u.includes("PAR"))           return "PAR";
  if (u.includes("TORONTO") || u.includes("TOR"))         return "TOR";
  if (u.includes("CANADA") || u.includes(" CAN"))         return "CAN";
  if (u.includes("LONDON") || u.includes("UK"))           return "UK";
  if (u.includes("JAMAICA") || u.includes(" JA"))         return "JA";
  if (u.includes("PUERTO RICO") || u.includes(" PR"))     return "PR";
  if (u.includes("PHILADELPHIA") || u.includes("PHL"))    return "PHL";
  if (u.includes("DENVER") || u.includes("DEN"))          return "DEN";
  if (u.includes("DETROIT") || u.includes("DET"))         return "DET";
  if (u.includes("PHOENIX") || u.includes("PHX"))         return "PHX";
  if (u.includes("MINNEAPOLIS") || u.includes("MIN"))     return "MIN";
  return null;
}

function tierColor(contacts) {
  const min = Math.min(...contacts.map(c => Number(c.tier) ?? 3));
  if (min === 1) return "#fbbf24";
  if (min === 2) return "#60a5fa";
  if (min === 4) return "#4ade80";
  if (min === 5) return "#f87171";
  return "#94a3b8";
}

// ── Shared input styles ──────────────────────────────────────────────────────
const iCls = "w-full bg-white border border-gray-200 text-gray-900 text-xs px-3 py-2 focus:outline-none focus:border-amber-400/50 placeholder:text-gray-300 transition-colors";
const sCls = iCls + " cursor-pointer";

// ── Add Contact Modal ────────────────────────────────────────────────────────
function AddContactModal({ initialLocation, onSave, onClose }) {
  const [form, setForm]   = useState({ ...BLANK, location: initialLocation ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const newContact = { ...form, id: Date.now() };
      try {
        const r = await fetch(`${API}/api/contacts`, {
          method: "POST", headers: { "Content-Type":"application/json" },
          body: JSON.stringify(newContact), signal: AbortSignal.timeout(3000),
        });
        if (r.ok) { const d = await r.json(); newContact.id = d.id ?? newContact.id; }
      } catch {}
      onSave(newContact);
      setSaved(true);
      setTimeout(onClose, 1200);
    } finally { setSaving(false); }
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}>
      <motion.div
        initial={{ scale:0.96, y:12 }} animate={{ scale:1, y:0 }} exit={{ scale:0.96, y:12 }}
        transition={SPRING}
        className="bg-white border border-gray-200 w-full max-w-md shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-gray-900 text-sm font-black flex items-center gap-2">
            <UserPlus size={14} className="text-amber-400" /> Add Contact
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={15}/></button>
        </div>
        <div className="px-5 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Full Name *</label>
            <input className={iCls} autoFocus value={form.name} onChange={e => set("name", e.target.value)} placeholder="First Last"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Role</label>
              <select className={sCls} value={form.role} onChange={e => set("role", e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Tier</label>
              <select className={sCls} value={form.tier} onChange={e => set("tier", Number(e.target.value))}>
                {TIER_LIST.map(t => <option key={t} value={t}>T{t} — {TIER_LABELS[t] ?? ""}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => set("status", s)}
                  className={`flex-1 text-[10px] uppercase tracking-wide py-1.5 border transition-colors ${form.status===s ? "border-amber-400/50 text-amber-500 bg-amber-400/5" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                  {s.replace("_"," ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Company / Label</label>
            <input className={iCls} value={form.company} onChange={e => set("company", e.target.value)} placeholder="Interscope, Atlantic…"/>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Location</label>
            <input className={iCls} value={form.location} onChange={e => set("location", e.target.value)} placeholder="New York, NY"/>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Email</label>
            <input className={iCls} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="name@label.com"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Phone</label>
              <input className={iCls} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 212…"/>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Instagram</label>
              <input className={iCls} value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@handle"/>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-[0.15em] block mb-1">Notes</label>
            <textarea className={iCls + " resize-none"} rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="How you met, intro'd by…"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-3 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-40">
            {saving ? <RotateCcw size={13} className="animate-spin"/> : saved ? <Check size={13}/> : <Save size={13}/>}
            {saving ? "Saving…" : saved ? "Added!" : "Add to Contacts"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminMap() {
  const adminData  = useAdminData();
  const contacts   = adminData?.contacts   ?? contactsRaw;
  const addContact = adminData?.addContact ?? (() => {});

  const mapRef     = useRef(null);   // DOM node
  const leafletRef = useRef(null);   // L instance
  const mapObjRef  = useRef(null);   // Leaflet map object
  const markersRef = useRef([]);     // current markers

  const [selected,    setSelected]  = useState(null); // individual contact id
  const [tierFilter,  setTierFilter] = useState(0);
  const [addModal,    setAddModal]  = useState(false);
  const [addLocation, setAddLoc]   = useState("");
  const [mapReady,    setMapReady]  = useState(false);

  // Map each contact to a lat/lng with jitter for same-city contacts
  const contactMarkers = useMemo(() => {
    const cityCount = {};
    const markers = [];
    const unmapped = [];
    contacts.forEach(c => {
      if (tierFilter !== 0 && Number(c.tier) !== tierFilter) return;
      const key = resolveCity(c.location);
      if (!key) { unmapped.push(c); return; }
      const coord = CITY_LATLNG[key];
      if (!coord) { unmapped.push(c); return; }
      if (!cityCount[key]) cityCount[key] = 0;
      const idx = cityCount[key]++;
      // Spiral jitter so contacts at same city don't overlap
      const angle = idx * 2.4; // golden angle
      const radius = idx === 0 ? 0 : 0.15 + Math.floor(Math.sqrt(idx)) * 0.18;
      const lat = coord.lat + radius * Math.sin(angle);
      const lng = coord.lng + radius * Math.cos(angle);
      markers.push({ contact: c, lat, lng, key, cityLabel: coord.label });
    });
    return { markers, unmapped };
  }, [contacts, tierFilter]);

  const totalPlotted = contactMarkers.markers.length;

  // ── Load Leaflet from CDN ─────────────────────────────────────────────────
  useEffect(() => {
    if (leafletRef.current) return;
    // CSS
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    // JS
    const script = document.createElement("script");
    script.src   = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      leafletRef.current = window.L;
      setMapReady(true);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // ── Initialize map once Leaflet is ready ──────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObjRef.current) return;
    const L = leafletRef.current;
    const map = L.map(mapRef.current, {
      center: [30, -30],
      zoom: 3,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    // OSM tiles need no API key (CARTO's free tiles now return a key-required watermark).
    // Inverted + desaturated with CSS to keep the dark look.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      className: "s3-dark-tiles",
    }).addTo(map);
    mapObjRef.current = map;
  }, [mapReady]);

  // ── Draw / redraw markers whenever data or filter changes ────────────────
  const selectContact = useCallback((contactId) => {
    setSelected(prev => prev === contactId ? null : contactId);
  }, []);

  useEffect(() => {
    if (!mapObjRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapObjRef.current;

    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const { markers } = contactMarkers;

    markers.forEach(({ contact: c, lat, lng }) => {
      const color = tierColor([c]);
      const isIC  = Number(c.tier) === 1;
      const initials = (c.name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

      const svgIcon = L.divIcon({
        html: `
          <div style="position:relative;width:24px;height:24px" title="${(c.name||"").replace(/"/g,"'")}">
            ${isIC ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;border-radius:50%;border:1.5px solid ${color};opacity:0.45;animation:pulse-ring 2s ease-out infinite"></div>` : ""}
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:${color};opacity:0.92;display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.55);cursor:pointer;border:1.5px solid rgba(255,255,255,0.25)">
              ${initials}
            </div>
          </div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: svgIcon });
      marker.bindTooltip(`<strong>${c.name}</strong><br/><span style="font-size:10px;opacity:0.7">${[c.role, c.company].filter(Boolean).join(" · ")}</span>`, {
        direction: "top", offset: [0, -10],
        className: "leaflet-contact-tooltip",
      });
      marker.on("click", () => selectContact(c.id ?? c.name));
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [contactMarkers, mapReady, selectContact]);

  const selectedContact = selected
    ? contacts.find(c => (c.id ?? c.name) === selected) ?? null
    : null;

  function handleNewContact(c) {
    addContact(c);
    setAddModal(false);
  }

  return (
    <AdminShell>
      {/* Pulse ring + tooltip styles */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform:translate(-50%,-50%) scale(1); opacity:0.4; }
          100% { transform:translate(-50%,-50%) scale(1.8); opacity:0; }
        }
        .leaflet-contact-tooltip {
          background: rgba(15,23,42,0.92);
          border: 1px solid rgba(251,191,36,0.3);
          color: #e2e8f0;
          font-size: 11px;
          font-family: inherit;
          padding: 4px 8px;
          border-radius: 2px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          white-space: nowrap;
        }
        .leaflet-contact-tooltip::before {
          border-top-color: rgba(15,23,42,0.92) !important;
        }
        .leaflet-contact-tooltip strong { color: #fbbf24; font-weight: 700; }
      `}</style>

      <div className="flex h-full overflow-hidden" style={{ height:"calc(100vh - 48px)" }}>

        {/* Map area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4 flex-shrink-0 z-10">
            <div className="flex items-center gap-2 flex-1">
              <Globe size={14} className="text-amber-400" />
              <h2 className="text-gray-900 font-black text-base tracking-tight">
                Contact Map
                <span className="text-gray-400 font-normal text-xs ml-2">{totalPlotted} plotted · {contactMarkers.unmapped.length} unmapped</span>
              </h2>
            </div>
            {/* Tier filter */}
            <div className="flex items-center gap-1.5">
              {[0,1,2,3,4].map(t => (
                <button key={t} onClick={() => setTierFilter(t)}
                  className={`text-[9px] tracking-[0.12em] uppercase px-2.5 py-1.5 border transition-all ${
                    tierFilter===t ? "border-amber-400/40 text-amber-500 bg-amber-400/5" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}>
                  {t===0 ? "All" : `T${t}`}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setAddLoc(""); setAddModal(true); }}
              className="flex items-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-400 hover:text-black transition-colors">
              <Plus size={12}/> Add Contact
            </button>
          </div>

          {/* Leaflet map container */}
          <div className="flex-1 relative">
            {!mapReady && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                  <p className="text-gray-400 text-xs tracking-widest uppercase">Loading Map</p>
                </div>
              </div>
            )}
            {/* Legend overlay */}
            <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-sm border border-white/10 p-3 space-y-1.5 pointer-events-none">
              {[
                { color:"#fbbf24", label:"Inner Circle" },
                { color:"#60a5fa", label:"Collaborator"  },
                { color:"#94a3b8", label:"Network"       },
                { color:"#4ade80", label:"Target"        },
                { color:"#f87171", label:"Blacklist"     },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}/>
                  <span className="text-gray-300 text-[10px] tracking-wide">{label}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-1.5 mt-0.5">
                <p className="text-gray-500 text-[9px]">Initials = individual contact</p>
                <p className="text-gray-500 text-[9px]">Pulse = Inner Circle</p>
              </div>
            </div>
            <div ref={mapRef} className="w-full h-full" style={{ background:"#1a1a2e" }}/>
          </div>
        </div>

        {/* Right panel — selected contact detail */}
        <AnimatePresence>
          {selectedContact && (
            <motion.div
              initial={{ x:320, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:320, opacity:0 }}
              transition={SPRING}
              className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden z-10">

              {(() => {
                const c  = selectedContact;
                const tc = TIER_COLORS[c.tier] ?? TIER_COLORS[3];
                const initials = (c.name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
                const markerData = contactMarkers.markers.find(m => (m.contact.id ?? m.contact.name) === selected);
                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center text-sm font-black border ${tc.bg} ${tc.text} ${tc.border}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-gray-900 font-black text-sm flex items-center gap-1.5">
                            {c.name}
                            {Number(c.tier) === 1 && <Star size={9} className="text-amber-400 fill-amber-400"/>}
                          </p>
                          <p className="text-gray-500 text-[10px]">{[c.role, c.company].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0">
                        <X size={15}/>
                      </button>
                    </div>

                    {/* Details */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {/* Tier badge */}
                      <span className={`inline-flex items-center text-[9px] px-2.5 py-1 border tracking-[0.12em] uppercase font-black ${tc.bg} ${tc.text} ${tc.border}`}>
                        T{c.tier} · {TIER_LABELS[c.tier] ?? "Network"}
                      </span>

                      {/* Location */}
                      {c.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={11} className="text-amber-400 flex-shrink-0"/>
                          <span className="text-gray-600 text-xs">{markerData?.cityLabel ?? c.location}</span>
                        </div>
                      )}

                      {/* Contact info */}
                      {[
                        { label:"Email",     val:c.email,     href:`mailto:${c.email}`    },
                        { label:"Phone",     val:c.phone,     href:`tel:${c.phone}`        },
                        { label:"Instagram", val:c.instagram, href:`https://instagram.com/${(c.instagram||"").replace("@","")}` },
                      ].filter(f => f.val).map(f => (
                        <div key={f.label}>
                          <p className="text-[9px] text-gray-300 uppercase tracking-widest mb-0.5">{f.label}</p>
                          <a href={f.href} target="_blank" rel="noreferrer"
                            className="text-xs text-amber-500 hover:text-amber-400 transition-colors truncate block">{f.val}</a>
                        </div>
                      ))}

                      {/* Notes */}
                      {c.notes && (
                        <div>
                          <p className="text-[9px] text-gray-300 uppercase tracking-widest mb-1">Notes</p>
                          <p className="text-gray-600 text-xs leading-relaxed">{c.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-5 py-4 border-t border-gray-200 space-y-2">
                      {c.email && (
                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}`} target="_blank" rel="noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-400 hover:text-black transition-colors">
                          <Mail size={12}/> Email {c.name.split(" ")[0]}
                        </a>
                      )}
                      <button onClick={() => { setAddLoc(c.location ?? ""); setAddModal(true); }}
                        className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 text-gray-400 text-xs hover:border-amber-400/50 hover:text-amber-500 py-2 transition-colors">
                        <UserPlus size={12}/> Add nearby contact
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {addModal && (
          <AddContactModal initialLocation={addLocation} onSave={handleNewContact} onClose={() => setAddModal(false)}/>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
