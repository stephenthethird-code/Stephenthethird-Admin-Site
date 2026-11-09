/**
 * AdminReview.jsx  →  /admin/review
 *
 * Super Admin sees all pending employee suggestions and can Approve / Reject each.
 * Employees see a form to submit new notes / metadata edits.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, MessageSquarePlus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/admin/AdminShell";

// ── Mock suggestions store (wire to your Flask API when ready) ───
const MOCK_SUGGESTIONS = [
  {
    id: 1, status: "pending",
    author: "Employee",
    track: "cabin in the woods",
    type: "note",
    content: "This was recorded in one take. Needs mastering.",
    timestamp: "2025-04-18 11:32",
  },
  {
    id: 2, status: "pending",
    author: "Employee",
    track: "ECSTASY",
    type: "metadata",
    content: "BPM should be 132, not null. Also: key = F# minor.",
    timestamp: "2025-04-19 09:15",
  },
];

const BADGE = {
  pending:  "bg-amber-400/15 text-amber-400",
  approved: "bg-green-400/15 text-green-400",
  rejected: "bg-red-400/15 text-red-400",
};

export default function AdminReview() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS);
  const [newNote,   setNewNote]   = useState({ track: "", content: "", type: "note" });
  const [submitted, setSubmitted] = useState(false);

  function approve(id) {
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status: "approved" } : x));
  }
  function reject(id) {
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status: "rejected" } : x));
  }

  function submitSuggestion(e) {
    e.preventDefault();
    setSuggestions(prev => [
      ...prev,
      { ...newNote, id: Date.now(), status: "pending", author: user.name, timestamp: new Date().toLocaleString() },
    ]);
    setNewNote({ track: "", content: "", type: "note" });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <AdminShell>
    <div className="p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-amber-400 text-[10px] tracking-[0.3em] uppercase block mb-1">Admin</span>
            <h1 className="text-gray-900 font-black text-3xl uppercase tracking-tight">
              {isSuperAdmin ? "Review Queue" : "Suggest Edit"}
            </h1>
          </div>
          <div className="flex gap-3">
            {isSuperAdmin && (
              <button onClick={() => navigate("/admin/design")}
                className="text-[11px] tracking-widest uppercase text-gray-500 hover:text-amber-400 border border-gray-200 hover:border-amber-400/30 px-4 py-2 transition-colors">
                Design Engine
              </button>
            )}
            <button onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 transition-colors">
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>

        {/* Employee submit form */}
        <section className="mb-12 p-6 border border-gray-200 bg-white/[0.02]">
          <h2 className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-5">
            <MessageSquarePlus size={12} className="inline mr-2" />
            Submit a suggestion
          </h2>
          <form onSubmit={submitSuggestion} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-[9px] tracking-widest uppercase block mb-1.5">Track name</label>
                <input value={newNote.track} onChange={e => setNewNote(n => ({...n, track: e.target.value}))} required
                  className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 transition-colors"
                  placeholder="e.g. cabin in the woods" />
              </div>
              <div>
                <label className="text-gray-500 text-[9px] tracking-widest uppercase block mb-1.5">Type</label>
                <select value={newNote.type} onChange={e => setNewNote(n => ({...n, type: e.target.value}))}
                  className="w-full bg-white border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none">
                  <option value="note">Session Note</option>
                  <option value="metadata">Metadata Edit</option>
                  <option value="artwork">Artwork Upload</option>
                </select>
              </div>
            </div>
            <textarea value={newNote.content} onChange={e => setNewNote(n => ({...n, content: e.target.value}))} required rows={3}
              className="w-full bg-gray-100 border border-gray-200 text-gray-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-400/40 transition-colors resize-none"
              placeholder="Describe your suggestion…" />
            <button type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 text-black text-[11px] font-black tracking-[0.18em] uppercase hover:bg-amber-300 transition-colors">
              <Check size={12} /> Submit
            </button>
            {submitted && <p className="text-amber-400/80 text-xs">Submitted — pending Super Admin review.</p>}
          </form>
        </section>

        {/* Review queue (Super Admin sees approve/reject) */}
        <section>
          <h2 className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-5">
            All Suggestions ({suggestions.length})
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {suggestions.map(s => (
                <motion.div key={s.id} layout
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 border border-gray-200 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className="text-gray-900 font-medium text-sm">{s.track}</span>
                      <span className="text-gray-500 text-xs ml-3">{s.type} · {s.author} · {s.timestamp}</span>
                    </div>
                    <span className={`text-[9px] px-2.5 py-1 tracking-widest uppercase rounded-sm ${BADGE[s.status]}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.content}</p>
                  {isSuperAdmin && s.status === "pending" && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => approve(s.id)}
                        className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-green-400/10 border border-green-400/25 text-green-400 hover:bg-green-400/20 transition-colors tracking-widest uppercase">
                        <Check size={11} /> Approve
                      </button>
                      <button onClick={() => reject(s.id)}
                        className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-red-400/10 border border-red-400/25 text-red-400 hover:bg-red-400/20 transition-colors tracking-widest uppercase">
                        <X size={11} /> Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
    </AdminShell>
  );
}
