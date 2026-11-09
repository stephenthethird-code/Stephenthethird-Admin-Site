/**
 * auth.js — token storage + automatic Authorization header for API calls.
 *
 * installAuthFetch() wraps window.fetch once so every request to the Flask API carries
 * the login token, and a 401 from the API signs the user out. That keeps the many
 * existing `fetch(`${API}/api/...`)` calls working without editing each one.
 */
const API_BASE  = import.meta.env.VITE_API_BASE ?? "http://localhost:5050";
const TOKEN_KEY = "s3_token";
const USER_KEY  = "s3_user";

export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const getStoredUser = () => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } };

export function storeSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/** For URLs the browser opens directly (OAuth start links, <audio src>) where headers can't be set. */
export function withToken(url) {
  const t = getToken();
  if (!t) return url;
  return url + (url.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(t);
}

export function installAuthFetch(onUnauthorized) {
  if (window.__s3FetchPatched) return;
  window.__s3FetchPatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const isApi = url.startsWith(API_BASE) || url.startsWith("/api");
    if (!isApi) return orig(input, init);

    const token = getToken();
    const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    const res = await orig(input, { ...init, headers });
    if (res.status === 401 && !url.includes("/api/auth/login") && token) {
      clearSession();
      onUnauthorized?.();
    }
    return res;
  };
}

export { API_BASE };
