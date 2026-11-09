/**
 * AdminShell.jsx — shared sidebar + header layout for all admin pages
 */

import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Music2, Star, Users,
  Palette, Settings, LogOut, Map, Layout,
  ExternalLink, Menu, X, Mail, ClipboardList,
  MessageSquare, Globe, CheckCircle2, Database,
  FileSpreadsheet, Link2, Link2Off, Loader2, CheckCircle,
  BarChart2, Calendar, ShoppingBag, DollarSign, Zap,
} from "lucide-react";
import { useAuth }       from "../../context/AuthContext";
import { useAdminData }  from "../../context/AdminDataContext";
import { linkSpreadsheet, unlinkSpreadsheet, saveNow, canAutoSave } from "../../data/xlsxSync";

const SPRING = { type: "spring", stiffness: 300, damping: 30 };

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard",  label: "Dashboard",   href: "/admin",            Icon: LayoutDashboard },
      { id: "tracks",     label: "Tracks",       href: "/admin/tracks",     Icon: Music2          },
      { id: "credits",    label: "Credits",      href: "/admin/credits",    Icon: Star            },
      { id: "whiteboard", label: "Whiteboard",   href: "/admin/whiteboard", Icon: ClipboardList   },
      { id: "followups",  label: "Follow-Ups",   href: "/admin/followups",  Icon: CheckCircle2    },
      { id: "dispatch",   label: "Dispatch",     href: "/admin/dispatch",   Icon: Zap             },
      { id: "income",     label: "Income",       href: "/admin/income",     Icon: DollarSign      },
      { id: "analytics",  label: "Analytics",    href: "/admin/analytics",  Icon: BarChart2       },
      { id: "calendar",   label: "Calendar",     href: "/admin/calendar",   Icon: Calendar        },
      { id: "beats",      label: "Beat Store",   href: "/admin/beats",      Icon: ShoppingBag     },
    ],
  },
  {
    label: "Contacts",
    items: [
      { id: "contacts",   label: "All Contacts", href: "/admin/contacts",   Icon: Users           },
      { id: "map",        label: "Contact Map",  href: "/admin/map",        Icon: Map             },
    ],
  },
  {
    label: "Inbox",
    items: [
      { id: "gmail",      label: "Send Email",   href: "/admin/gmail",      Icon: Mail            },
      { id: "web-inbox",  label: "Web Inbox",    href: "/admin/web-inbox",  Icon: Globe           },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "design",     label: "Design Engine", href: "/admin/design",    Icon: Palette         },
    ],
  },
];

// ── Sync badge component ──────────────────────────────────────────────────────
function SyncBadge({ syncState, onLink, onUnlink, onSaveNow }) {
  if (!canAutoSave) return null;

  const { linked, fileName, saving, lastSaved } = syncState ?? {};

  if (!linked) {
    return (
      <button onClick={onLink}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-400 hover:text-amber-500 text-xs transition-colors group">
        <FileSpreadsheet size={13} className="flex-shrink-0" />
        <span className="flex-1 text-left truncate">Link Spreadsheet</span>
        <Link2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={12} className="text-green-500 flex-shrink-0" />
        <span className="text-[10px] text-gray-500 flex-1 truncate" title={fileName}>{fileName}</span>
        {saving
          ? <Loader2 size={10} className="text-amber-400 animate-spin flex-shrink-0" />
          : <CheckCircle size={10} className="text-green-400 flex-shrink-0" />
        }
      </div>
      <p className="text-[9px] text-gray-300 pl-5">
        {saving
          ? "Saving…"
          : lastSaved
            ? `Saved ${lastSaved.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}`
            : "Linked — waiting for changes"
        }
      </p>
      <div className="flex gap-1 pl-5">
        <button onClick={onSaveNow}
          className="text-[9px] text-gray-400 hover:text-gray-900 transition-colors underline underline-offset-2">
          Save now
        </button>
        <span className="text-gray-200">·</span>
        <button onClick={onUnlink}
          className="text-[9px] text-gray-400 hover:text-red-400 transition-colors underline underline-offset-2">
          Unlink
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();
  const [open, setOpen]  = useState(false);

  // Grab sync state + data from context (null when outside AdminDataProvider)
  const adminData = useAdminData();
  const syncState = adminData?.syncState ?? null;

  async function handleLink() {
    await linkSpreadsheet();
  }

  function handleUnlink() {
    unlinkSpreadsheet();
  }

  async function handleSaveNow() {
    if (!adminData) return;
    const { contacts = [], projects = [], followups = [] } = adminData;
    await saveNow({ contacts, projects, followups });
  }

  function active(href) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function go(href) { navigate(href); setOpen(false); }

  const Sidebar = () => (
    <nav className="flex flex-col h-full bg-gray-50 border-r border-gray-200 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-gray-200 flex-shrink-0">
        <div className="w-7 h-7 bg-amber-400 flex items-center justify-center">
          <span className="text-black text-[10px] font-black">S3</span>
        </div>
        <div>
          <p className="text-gray-900 text-xs font-black tracking-widest uppercase">Studio OS</p>
          <p className="text-gray-400 text-[9px] tracking-wide">Admin</p>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 py-3 px-2 space-y-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-gray-300 text-[9px] tracking-[0.3em] uppercase px-3 mb-1.5">
              {section.label}
            </p>
            {section.items.map(({ id, label, href, Icon }) => (
              <button key={id} onClick={() => go(href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all mb-0.5 ${
                  active(href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-400 hover:text-gray-600 hover:bg-white"
                }`}>
                <Icon size={14} className={active(href) ? "text-amber-400" : ""} />
                <span className="flex-1 text-left text-[13px]">{label}</span>
                {active(href) && <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom: spreadsheet sync + view site + user */}
      <div className="border-t border-gray-200 p-3 space-y-1 flex-shrink-0">

        {/* Sync */}
        <div className="border border-gray-100 rounded mb-2">
          <SyncBadge
            syncState={syncState}
            onLink={handleLink}
            onUnlink={handleUnlink}
            onSaveNow={handleSaveNow}
          />
        </div>

        <button onClick={() => window.open("/", "_blank")}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-gray-900 text-xs transition-colors">
          <ExternalLink size={13} /> View Public Site
        </button>
        <button onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-500 hover:text-red-400 text-xs transition-colors">
          <LogOut size={13} /> Sign Out
        </button>
        <div className="px-3 py-2 flex items-center gap-2.5 border-t border-gray-100 mt-1 pt-3">
          <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-400 text-[9px] font-black">
              {user?.name?.charAt(0) ?? "S"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-gray-500 text-[10px] font-medium truncate">{user?.name ?? "Stephen"}</p>
            <p className="text-gray-400 text-[9px] capitalize">{user?.role ?? "superadmin"}</p>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="h-screen bg-white text-gray-900 flex overflow-hidden">

      {/* Desktop sidebar */}
      <div className="w-52 flex-shrink-0 hidden md:flex flex-col" style={{ height:"100vh" }}>
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setOpen(false)} />
            <motion.div initial={{ x:-220 }} animate={{ x:0 }} exit={{ x:-220 }}
              transition={SPRING}
              className="fixed left-0 top-0 bottom-0 w-52 z-50 md:hidden">
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-gray-900">
            <Menu size={18} />
          </button>
          <span className="text-gray-900 text-xs font-black tracking-widest">S3 STUDIO OS</span>
          <div className="w-6" />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
