/**
 * AdminInbox.jsx  →  /admin/inbox
 * Simple compose + message thread view.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, X, RotateCcw, Check,
  MessageSquare, Inbox as InboxIcon, User
} from "lucide-react";
import AdminShell  from "../components/admin/AdminShell";
import contactsData from "../data/contactsData";

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type:"spring", stiffness:300, damping:30 };
const API    = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const inputCls = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";

export default function AdminInbox() {
  const [messages,  setMessages]  = useState([]);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ to:"", subject:"", body:"" });
  const [sending, setSending]     = useState(false);
  const [sent,    setSent]        = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSend() {
    if (!form.to.trim() || !form.body.trim()) return;
    setSending(true);
    // Try API
    try {
      await fetch(`${API}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ to: [form.to], subject: form.subject, body: form.body }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {}
    // Always record locally
    const msg = {
      id: Date.now(),
      direction: "outbound",
      to: form.to,
      subject: form.subject || "(no subject)",
      body: form.body,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [msg, ...prev]);
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setComposing(false); setForm({ to:"", subject:"", body:"" }); }, 1500);
  }

  return (
    <AdminShell>
      <div className="px-6 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">Messaging</p>
            <h2 className="text-gray-900 font-black text-xl" style={{ letterSpacing:"-0.02em" }}>Inbox</h2>
          </div>
          <button onClick={() => setComposing(true)}
            className="flex items-center gap-2 bg-gray-900 text-gray-900 text-xs font-black tracking-widest uppercase px-4 py-2 hover:bg-amber-400 transition-colors">
            <Plus size={12} /> Compose
          </button>
        </div>

        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            className="text-center py-20 border border-gray-200 bg-gray-50">
            <InboxIcon size={32} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No messages yet.</p>
            <button onClick={() => setComposing(true)}
              className="mt-4 text-[10px] tracking-widest uppercase text-amber-400/60 hover:text-amber-400 transition-colors">
              Send one →
            </button>
          </motion.div>
        )}

        {/* Message list */}
        <div className="space-y-2">
          {messages.map(msg => (
            <motion.div key={msg.id}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="border border-gray-200 bg-gray-50 px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 flex items-center justify-center">
                    <User size={11} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">{msg.to}</p>
                    <p className="text-gray-400 text-[10px]">{new Date(msg.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 border border-green-400/20 text-green-400/70 uppercase tracking-widest">Sent</span>
              </div>
              {msg.subject && <p className="text-gray-600 text-sm font-medium mb-1">{msg.subject}</p>}
              <p className="text-white/35 text-sm whitespace-pre-wrap">{msg.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Compose overlay */}
      <AnimatePresence>
        {composing && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setComposing(false)}>
            <motion.div initial={{ y:60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:60, opacity:0 }}
              transition={SPRING}
              className="w-full max-w-lg bg-white border border-gray-200"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <p className="text-gray-900 text-sm font-medium">New Message</p>
                <button onClick={() => setComposing(false)} className="text-gray-500 hover:text-gray-900"><X size={15}/></button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">To</label>
                  <input className={inputCls} value={form.to}
                    onChange={e => set("to", e.target.value)}
                    list="contact-emails"
                    placeholder="email or @instagram" />
                  <datalist id="contact-emails">
                    {contactsData.filter(c => c.email).map(c => (
                      <option key={c.id} value={c.email}>{c.name}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">Subject</label>
                  <input className={inputCls} value={form.subject}
                    onChange={e => set("subject", e.target.value)}
                    placeholder="Session Inquiry, Collab, etc." />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] tracking-[0.2em] uppercase block mb-1.5">Message</label>
                  <textarea className={inputCls + " resize-none"} rows={5}
                    value={form.body} onChange={e => set("body", e.target.value)}
                    placeholder="Hey, wanted to reach out about…" autoFocus />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
                <button onClick={handleSend}
                  disabled={sending || !form.to.trim() || !form.body.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-400 text-black text-xs font-black tracking-widest uppercase py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40">
                  {sending ? <RotateCcw size={12} className="animate-spin" /> : sent ? <Check size={12} /> : <Send size={12} />}
                  {sending ? "Sending…" : sent ? "Sent!" : "Send"}
                </button>
                <button onClick={() => setComposing(false)}
                  className="px-5 border border-gray-200 text-gray-400 hover:text-gray-900 text-xs transition-colors">
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
