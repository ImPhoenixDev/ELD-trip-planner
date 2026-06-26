// Use `??` so an explicitly-empty value (same-origin deploys, e.g. Vercel Services)
// is respected instead of falling back to localhost.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const BASE_URL = RAW_BASE.replace(/\/$/, "");

export async function planTrip(payload) {
  let resp;
  try {
    resp = await fetch(`${BASE_URL}/api/plan-trip/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach the planning service. Is the API running?");
  }

  let data = null;
  try {
    data = await resp.json();
  } catch {
    /* non-JSON response */
  }

  if (!resp.ok) {
    if (data?.errors) {
      const err = new Error("Please fix the highlighted fields.");
      err.fieldErrors = data.errors;
      throw err;
    }
    throw new Error(data?.detail || `Request failed (${resp.status}).`);
  }
  return data;
}

export async function suggestPlaces(query, { signal } = {}) {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const resp = await fetch(`${BASE_URL}/api/geocode/suggest/?q=${encodeURIComponent(q)}`, {
    signal,
  });
  if (!resp.ok) return [];
  const data = await resp.json().catch(() => null);
  return data?.suggestions || [];
}

export { BASE_URL };
