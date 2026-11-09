/**
 * AdminGmail.jsx  →  /admin/gmail
 *
 * Mass & individual email sender.
 *  • Left: contact picker with search + tier filter + select-all
 *  • Right: compose panel (subject, body with template shortcuts)
 *  • Sends via Flask /api/email/send or opens gmail.com compose as fallback
 *  • Sent log at the bottom
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Check, X, Users, Star,
  Mail, RotateCcw, ChevronDown, CheckSquare,
  Square, Zap, FileText
} from "lucide-react";
import AdminShell    from "../components/admin/AdminShell";
import contactsData  from "../data/contactsData";
import { TIER_COLORS, TIER_LABELS } from "../data/contactsData";

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type:"spring", stiffness:300, damping:28 };
const API    = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

// ── Email templates ───────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "session",
    label: "Session Invite",
    subject: "Let's get in the studio — Stephen",
    body: `Hey [Name],\n\nHope you're doing well! I've been working on some new records I think would be perfect for you. Would love to get in the studio and cook up something.\n\nLet me know your schedule — I'm flexible.\n\nStephen (stephenthethird)\nNew York City`,
  },
  {
    id: "placement",
    label: "Beat Placement",
    subject: "I have a record for you — Stephen",
    body: `Hey [Name],\n\nI've been sitting on this record and it's been on my mind — I think it's tailor-made for what you're doing.\n\nWould love to send it your way. What's the best way to get it to your inbox?\n\nStephen`,
  },
  {
    id: "followup",
    label: "Follow-Up",
    subject: "Checking in — Stephen",
    body: `Hey [Name],\n\nJust following up on my last message. Wanted to make sure it didn't get buried. I genuinely think we can create something special together.\n\nLet me know when you're free.\n\nStephen`,
  },
  {
    id: "intro",
    label: "Cold Intro",
    subject: "Stephen (stephenthethird) — Producer, NYC",
    body: `Hey [Name],\n\nMy name is Stephen — I'm a producer and multi-instrumentalist based in New York City. I've been building a catalog of records across Hip-Hop, R&B, and Alt/Pop and I've been a big fan of your work.\n\nI'd love to connect and see if we can collaborate.\n\nBest,\nStephen\nstephenthethird.com`,
  },
];

const inputCls = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";

// ── Contact row ───────────────────────────────────────────────────────────────
function ContactRow({ contact, checked, onToggle }) {
  const tc = TIER_COLORS[contact.tier] ?? TIER_COLORS[3];
  const initials = contact.name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const hasEmail = !!contact.email;

  return (
    <div onClick={() => hasEmail && onToggle(contact.id)}
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 transition-all ${
        !hasEmail ? "opacity-30 cursor-not-allowed" :
        checked ? "bg-amber-400/[0.04] cursor-pointer" : "hover:bg-gray-100/[0.02] cursor-pointer"
      }`}>
      <div className="flex-shrink-0">
        {checked
          ? <CheckSquare size={13} className="text-amber-400" />
          : <Square      size={13} className="text-gray-300" />}
      </div>
      <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-[9px] font-black border ${tc.bg} ${tc.text} ${tc.border}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/75 text-xs font-medium truncate">{contact.name}</p>
        <p className="text-gray-400 text-[10px] truncate">{contact.email || "no email"}</p>
      </div>
      {contact.tier === 1 && <Star size={9} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminGmail() {
  const [query,    setQuery]    = useState("");
  const [tierFilt, setTierFilt] = useState(0);
  const [selected, setSelected] = useState([]); // contact IDs
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [log,      setLog]      = useState([]);
  const [showTpl,  setShowTpl]  = useState(false);

  // Only contacts with emails
  const withEmail = useMemo(() =>
    contactsData.filter(c => c.email),
    []
  );

  const filtered = useMemo(() => {
    return withEmail.filter(c => {
      if (tierFilt !== 0 && c.tier !== tierFilt) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
      );
    });
  }, [withEmail, query, tierFilt]);

  const allSelected = filtered.length > 0 && filtered.every(c => selected.includes(c.id));

  function toggleContact(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => prev.filter(id => !filtered.map(c => c.id).includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...filtered.map(c => c.id)])]);
    }
  }

  function applyTemplate(tpl) {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setShowTpl(false);
  }

  function gmailFallback(emails, subj, bod) {
    const to  = emails.join(",");
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(bod)}`;
    window.open(url, "_blank");
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim() || selected.length === 0) return;
    setSending(true);

    const recipients = contactsData.filter(c => selected.includes(c.id) && c.email);
    const emails     = recipients.map(c => c.email);

    let success = false;
    try {
      const r = await fetch(`${API}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ to: emails, subject, body }),
        signal: AbortSignal.timeout(5000),
      });
      success = r.ok;
    } catch {
      // Flask not running — open Gmail compose
      gmailFallback(emails, subject, body);
      success = true;
    }

    if (success) {
      setLog(prev => [{
        id:         Date.now(),
        to:         emails,
        recipients: recipients.map(c => c.name),
        subject,
        timestamp:  new Date().toLocaleString(),
        count:      emails.length,
      }, ...prev]);
      setSelected([]);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  }

  const recipientNames = contactsData
    .filter(c => selected.includes(c.id))
    .map(c => c.name)
    .slice(0, 5);

  return (
    <AdminShell>
      <div className="flex h-full overflow-hidden" style={{ height:"calc(100vh - 0px)" }}>

        {/* LEFT — Contact picker */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200">
            <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-3">Recipients</p>
            {/* Search */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search contacts…"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-xs pl-8 pr-3 py-2 focus:outline-none focus:border-amber-400/30 placeholder:text-gray-300 transition-colors" />
            </div>
            {/* Tier filter */}
            <div className="flex gap-1 flex-wrap">
              {[0,1,2,3].map(t => (
                <button key={t} onClick={() => setTierFilt(t)}
                  className={`text-[9px] px-2 py-1 border transition-all ${
                    tierFilt === t
                      ? "border-amber-400/40 text-amber-400 bg-amber-400/5"
                      : "border-gray-200 text-gray-400 hover:border-gray-200"
                  }`}>
                  {t === 0 ? "All" : `T${t}`}
                </button>
              ))}
            </div>
          </div>

          {/* Select all */}
          <div onClick={toggleAll}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 cursor-pointer hover:bg-gray-100/[0.02] transition-colors">
            {allSelected
              ? <CheckSquare size={13} className="text-amber-400" />
              : <Square      size={13} className="text-gray-300" />}
            <span className="text-gray-400 text-xs">
              Select all ({filtered.length})
            </span>
            {selected.length > 0 && (
              <span className="ml-auto text-amber-400 text-[10px] font-black">{selected.length}</span>
            )}
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-300 text-xs">No contacts with emails</div>
            )}
            {filtered.map(c => (
              <ContactRow key={c.id} contact={c}
                checked={selected.includes(c.id)}
                onToggle={toggleContact} />
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 text-center">
            <p className="text-gray-300 text-[10px]">{withEmail.length} contacts have emails</p>
          </div>
        </div>

        {/* RIGHT — Compose */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Compose header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">Email</p>
              <h2 className="text-gray-900 font-black text-xl" style={{ letterSpacing:"-0.02em" }}>
                Compose
              </h2>
            </div>
            <button onClick={() => setShowTpl(v => !v)}
              className="flex items-center gap-2 border border-gray-200 text-gray-400 hover:text-amber-400 hover:border-amber-400/30 text-xs px-4 py-2 transition-colors">
              <FileText size={12} /> Templates <ChevronDown size={11} className={showTpl ? "rotate-180" : ""} />
            </button>
          </div>

          {/* Templates dropdown */}
          <AnimatePresence>
            {showTpl && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                className="border-b border-gray-200 bg-white overflow-hidden flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                      className="text-left p-3 border border-gray-200 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all group">
                      <p className="text-gray-600 text-xs font-medium group-hover:text-gray-900 transition-colors">{tpl.label}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{tpl.subject}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

            {/* To: field */}
            <div className="border border-gray-200 bg-white/[0.02] px-4 py-3">
              <p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-2">To</p>
              {selected.length === 0 ? (
                <p className="text-gray-300 text-sm italic">Select recipients on the left…</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {recipientNames.map(n => (
                    <span key={n} className="text-[10px] px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-400">{n}</span>
                  ))}
                  {selected.length > 5 && (
                    <span className="text-[10px] px-2 py-0.5 border border-gray-200 text-gray-400">
                      +{selected.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">Subject</label>
              <input className={inputCls} value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject line" />
            </div>

            {/* Body */}
            <div>
              <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">Message</label>
              <textarea className={inputCls + " resize-none"} rows={12}
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Write your message here…&#10;&#10;Use [Name] as a placeholder — it will be replaced with each recipient's name when possible." />
              <p className="text-gray-300 text-[10px] mt-1.5">Tip: [Name] auto-fills with recipient's first name</p>
            </div>
          </div>

          {/* Send bar */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center gap-4 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={sending || selected.length === 0 || !subject.trim() || !body.trim()}
              className="flex items-center gap-2.5 bg-amber-400 text-black text-xs font-black tracking-widest uppercase px-8 py-3 hover:bg-amber-300 transition-colors disabled:opacity-40">
              {sending ? <RotateCcw size={13} className="animate-spin" /> : sent ? <Check size={13} /> : <Send size={13} />}
              {sending ? "Sending…" : sent ? "Sent!" : `Send to ${selected.length || "…"}`}
            </button>
            <p className="text-gray-300 text-xs">
              {selected.length > 0
                ? `${selected.length} recipient${selected.length !== 1 ? "s" : ""} selected`
                : "No recipients selected"}
            </p>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])}
                className="text-gray-300 hover:text-gray-900 text-xs transition-colors ml-auto flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sent log — slides up from bottom */}
      <AnimatePresence>
        {log.length > 0 && !sending && (
          <motion.div initial={{ y:80, opacity:0 }} animate={{ y:0, opacity:1 }}
            exit={{ y:80, opacity:0 }} transition={SPRING}
            className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 shadow-2xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-gray-400 text-xs font-medium">Sent Log</p>
              <button onClick={() => setLog([])} className="text-gray-300 hover:text-gray-900"><X size={13}/></button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.04]">
              {log.map(entry => (
                <div key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Check size={10} className="text-green-400 flex-shrink-0" />
                    <p className="text-gray-600 text-xs font-medium truncate">{entry.subject}</p>
                  </div>
                  <p className="text-gray-500 text-[10px]">
                    {entry.count} recipient{entry.count !== 1 ? "s" : ""} · {entry.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
