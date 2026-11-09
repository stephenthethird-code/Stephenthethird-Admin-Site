/**
 * contactsStore.js — shared contacts state
 * Mirrors pattern of projectsStore.js.
 * Persists to localStorage + syncs to Flask API.
 */

import { useState, useEffect, useCallback } from "react";
import contactsRaw from "./contactsData";

const API        = (import.meta.env.VITE_API_BASE ?? "http://localhost:5050");
const LS_KEY     = "s3_contacts_v1";

function load(fallback) {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function save(val) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)); } catch {}
}

let _nextId = 10000;

export function useContacts() {
  const [contacts, _setContacts] = useState(() => load(contactsRaw));

  const setContacts = useCallback(fn => {
    _setContacts(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  }, []);

  // Try Flask on mount
  useEffect(() => {
    fetch(`${API}/api/contacts`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) setContacts(d); })
      .catch(() => {});
  }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  function addContact(data) {
    const id = _nextId++;
    const c  = { id, ...data };
    setContacts(prev => [c, ...prev]);
    fetch(`${API}/api/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    }).then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id && d.id !== id) setContacts(prev => prev.map(p => p.id === id ? { ...p, id: d.id } : p)); })
      .catch(() => {});
    return id;
  }

  function updateContact(id, data) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    fetch(`${API}/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  function deleteContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id));
    fetch(`${API}/api/contacts/${id}`, { method: "DELETE" }).catch(() => {});
  }

  // Save single contact (add or update based on id presence)
  function saveContact(data) {
    if (data.id && contacts.find(c => c.id === data.id)) {
      updateContact(data.id, data);
      return data.id;
    }
    return addContact(data);
  }

  return { contacts, setContacts, addContact, updateContact, deleteContact, saveContact };
}
