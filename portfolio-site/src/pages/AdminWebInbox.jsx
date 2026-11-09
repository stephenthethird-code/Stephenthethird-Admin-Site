/**
 * AdminWebInbox.jsx  →  /admin/web-inbox
 *
 * Inbox for messages submitted via the public site contact form.
 * Polls Flask /api/messages. Mark read, reply, delete.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, MailOpen, Trash2, Send, X, RotateCcw,
  Check, Reply, MessageSquare, RefreshCw, Circle
} from "lucide-react";
import AdminShell from "../components/admin/AdminShell";

const EASE   = [0.22, 1, 0.36, 1];
const SPRING = { type:"spring", stiffness:300, damping:28 };
const API    = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");

const inputCls = "w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 placeholder:text-gray-300 transition-colors";

// ── Seed / demo messages ──────────────────────────────────────────────────────
const DEMO_MESSAGES = [
  {
    id: 1, read: false,
    from_name: "Marcus Johnson",
    from_email: "marcus@example.com",
    subject: "Production inquiry",
    body: "Hey Stephen! I'm a rapper based in Atlanta and I've been following your work for a while. I'd love to get some beats and potentially work on a project together. Let me know what your rates are and how we can set up a session.",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 2, read: false,
    from_name: "Sarah Chen",
    from_email: "sarah.chen@soundcloud.com",
    subject: "Sync licensing opportunity",
    body: "Hi Stephen, I work in music licensing and I came across your portfolio. We have a TV project looking for producers with your style. Would you be open to a quick call this week to discuss?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 3, read: true,
    from_name: "Tyler West",
    from_email: "twest@gmail.com",
    subject: "Collab?",
    body: "Yo Stephen, my name's Tyler. I'm an artist out of NYC. Big fan of what you did with Overtonight. I have some songs I think would go crazy with your production. Can we link up?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function AdminWebInbox() {
  const [messages, setMessages]   = useState(DEMO_MESSAGES);
  const [selected, setSelected]   = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [replying, setReplying]   = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending,  setSending]    = useState(false);
  const [sent,     setSent]       = useState(false);

  // Poll Flask for real messages
  async function fetchMessages() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/messages`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        }
      }
    } catch { /* fallback to demo */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchMessages(); }, []);

  function openMessage(msg) {
    setSelected(msg);
    setReplying(false);
    setReplyBody("");
    // Mark as read
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    // API mark read
    fetch(`${API}/api/messages/${msg.id}/read`, { method:"PATCH" }).catch(() => {});
  }

  function deleteMessage(id) {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
    fetch(`${API}/api/messages/${id}`, { method:"DELETE" }).catch(() => {});
  }

  async function handleReply() {
    if (!replyBody.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`${API}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          to: [selected.from_email],
          subject: `Re: ${selected.subject}`,
          body: replyBody,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Fallback to Gmail
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.from_email)}&su=${encodeURIComponent("Re: " + selected.subject)}&body=${encodeURIComponent(replyBody)}`;
      window.open(url, "_blank");
    }
    setSending(false);
    setSent(true);
    setReplyBody("");
    setTimeout(() => { setSent(false); setReplying(false); }, 2000);
  }

  const unread = messages.filter(m => !m.read).length;

  return (
    <AdminShell>
      <div className="flex h-full overflow-hidden" style={{ height:"calc(100vh - 0px)" }}>

        {/* Message list */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-0.5">Site</p>
              <h2 className="text-gray-900 font-black text-lg flex items-center gap-2" style={{ letterSpacing:"-0.02em" }}>
                Web Inbox
                {unread > 0 && (
                  <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums">
                    {unread}
                  </span>
                )}
              </h2>
            </div>
            <button onClick={fetchMessages} disabled={loading}
              className="text-gray-400 hover:text-gray-900 transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <MessageSquare size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-300 text-xs mt-1">Messages from your site contact form appear here</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} onClick={() => openMessage(msg)}
                className={`px-5 py-4 cursor-pointer transition-all ${
                  selected?.id === msg.id
                    ? "bg-gray-100 border-l-2 border-l-amber-400"
                    : "hover:bg-gray-50"
                }`}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {msg.read
                      ? <MailOpen size={14} className="text-gray-300" />
                      : <Mail     size={14} className="text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${msg.read ? "text-gray-400" : "text-white/85 font-medium"}`}>
                        {msg.from_name}
                      </p>
                      <span className="text-gray-300 text-[9px] flex-shrink-0">{timeAgo(msg.timestamp)}</span>
                    </div>
                    <p className={`text-xs truncate mb-0.5 ${msg.read ? "text-gray-500" : "text-gray-500"}`}>
                      {msg.subject}
                    </p>
                    <p className="text-gray-300 text-[10px] truncate">{msg.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message reader */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail size={40} className="text-white/8 mx-auto mb-4" />
                <p className="text-gray-300 text-sm">Select a message to read</p>
              </div>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div className="px-8 py-5 border-b border-gray-200 flex items-start justify-between flex-shrink-0">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-gray-900 font-black text-xl mb-1" style={{ letterSpacing:"-0.015em" }}>
                    {selected.subject}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="font-medium text-gray-500">{selected.from_name}</span>
                    <span>·</span>
                    <a href={`mailto:${selected.from_email}`}
                      className="text-amber-400/70 hover:text-amber-400 transition-colors">
                      {selected.from_email}
                    </a>
                    <span>·</span>
                    <span>{new Date(selected.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setReplying(v => !v); setReplyBody(""); }}
                    className={`flex items-center gap-2 text-xs px-4 py-2 border transition-all ${
                      replying ? "border-amber-400/40 text-amber-400 bg-amber-400/5"
                               : "border-gray-200 text-gray-400 hover:text-gray-900"
                    }`}>
                    <Reply size={12} /> Reply
                  </button>
                  <button onClick={() => deleteMessage(selected.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-2 border border-transparent hover:border-red-400/20">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-2xl">
                  <p className="text-gray-600 text-sm leading-7 whitespace-pre-wrap">{selected.body}</p>
                </div>
              </div>

              {/* Reply panel */}
              <AnimatePresence>
                {replying && (
                  <motion.div
                    initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                    exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }}
                    className="border-t border-gray-200 flex-shrink-0 overflow-hidden"
                  >
                    <div className="px-8 py-4">
                      <p className="text-gray-500 text-[10px] tracking-[0.2em] uppercase mb-2">
                        Reply to {selected.from_name}
                      </p>
                      <textarea
                        className={inputCls + " resize-none"}
                        rows={5}
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder={`Hi ${selected.from_name?.split(" ")[0]},\n\n`}
                        autoFocus
                      />
                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={handleReply}
                          disabled={sending || !replyBody.trim()}
                          className="flex items-center gap-2 bg-amber-400 text-black text-xs font-black tracking-widest uppercase px-6 py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-40">
                          {sending ? <RotateCcw size={12} className="animate-spin" /> : sent ? <Check size={12} /> : <Send size={12} />}
                          {sending ? "Sending…" : sent ? "Sent!" : "Send Reply"}
                        </button>
                        <button onClick={() => setReplying(false)}
                          className="text-gray-500 hover:text-gray-900 text-xs transition-colors flex items-center gap-1.5">
                          <X size={12} /> Cancel
                        </button>
                        <p className="text-gray-300 text-[10px] ml-auto">
                          Via Flask API or Gmail if offline
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
