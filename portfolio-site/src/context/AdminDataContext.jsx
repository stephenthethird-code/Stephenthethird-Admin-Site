/**
 * AdminDataContext.jsx
 *
 * Single source of truth for all admin data:
 *   - contacts (via contactsStore)
 *   - projects + followups (via projectsStore)
 *   - xlsx auto-sync (via xlsxSync)
 *
 * Wrap the admin section in <AdminDataProvider> once in App.jsx.
 * Any admin page can call useAdminData() to get everything.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useContacts }  from "../data/contactsStore";
import { useProjects }  from "../data/projectsStore";
import { autoSave, subscribe, getState, canAutoSave } from "../data/xlsxSync";

const Ctx = createContext(null);

export function AdminDataProvider({ children }) {
  const contactStore = useContacts();
  const projectStore = useProjects();

  // xlsxSync UI state (linked, saving, lastSaved)
  const [syncState, setSyncState] = useState(getState);

  useEffect(() => {
    const unsub = subscribe(setSyncState);
    return unsub;
  }, []);

  // Auto-save whenever contacts, projects, or followups change
  const { contacts }  = contactStore;
  const { projects, followups } = projectStore;

  // Debounced watcher
  const timerRef = useRef(null);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoSave({ contacts, projects, followups });
    }, 300); // small delay to batch rapid changes; xlsxSync adds its own 1.5s debounce
    return () => clearTimeout(timerRef.current);
  }, [contacts, projects, followups]);

  const value = {
    // Contacts
    ...contactStore,
    // Projects + follow-ups
    ...projectStore,
    // Sync
    syncState,
    canAutoSave,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Returns null when called outside AdminDataProvider — AdminShell handles this gracefully
export function useAdminData() {
  return useContext(Ctx);
}
