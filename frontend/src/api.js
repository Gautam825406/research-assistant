const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

export const api = {
  health: () => request("/api/health"),
  history: (limit = 50) => request(`/api/history?limit=${limit}`),
  search: (query, maxResults) =>
    request("/api/search", { method: "POST", body: JSON.stringify({ query, max_results: maxResults }) }),
  summary: (searchId, focusQuery, topK = 6) =>
    request("/api/summary", {
      method: "POST",
      body: JSON.stringify({ search_id: searchId, focus_query: focusQuery || null, top_k: topK }),
    }),
  chat: (searchId, message) =>
    request("/api/chat", { method: "POST", body: JSON.stringify({ search_id: searchId, message }) }),
};
