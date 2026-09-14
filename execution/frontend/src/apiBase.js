// execution/frontend/src/apiBase.js
// Base URL for backend API calls. In dev this is empty so requests stay
// relative and hit Vite's proxy (see vite.config.js). In production, set
// VITE_API_URL to the deployed backend's origin (e.g. Railway URL) so
// requests don't resolve against the static frontend host instead.

export const API_BASE = import.meta.env.VITE_API_URL || "";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
