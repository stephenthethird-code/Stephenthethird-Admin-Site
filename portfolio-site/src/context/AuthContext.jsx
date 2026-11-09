/**
 * AuthContext.jsx
 *
 * Roles:
 *   "superadmin" — Stephen. Can approve/reject edits, access Design Engine.
 *   "employee"   — Team members. Can add notes, suggest metadata edits, upload art.
 *   null         — Public visitor (no auth).
 *
 * Login is verified by the Flask backend (see backend/auth.py).
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { API_BASE, getStoredUser, getToken, storeSession, clearSession, installAuthFetch } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  // Sign out locally if the API ever says our token is no longer valid.
  useEffect(() => { installAuthFetch(() => setUser(null)); }, []);

  // On load, confirm a stored token is still good.
  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API_BASE}/api/auth/me`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(u => setUser(u))
      .catch(() => {});
  }, []);

  const login = useCallback(async (email, password) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("Can't reach the server. Is the backend running?");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sign-in failed.");
    storeSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === "superadmin";
  const isEmployee   = user?.role === "employee" || isSuperAdmin;
  const isLoggedIn   = !!user;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isSuperAdmin, isEmployee, isLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
