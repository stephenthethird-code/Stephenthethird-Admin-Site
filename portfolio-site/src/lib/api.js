const API_BASE  = import.meta.env.VITE_API_BASE ?? "http://localhost:5050";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchBeats({ signal } = {}) {
  if (DEMO_MODE) throw new Error("Demo mode");
  return apiFetch("/api/beats", { signal });
}

export function getAudioUrl(filePath) {
  return `${API_BASE}/serve-audio?path=${encodeURIComponent(filePath)}`;
}

export { API_BASE };
