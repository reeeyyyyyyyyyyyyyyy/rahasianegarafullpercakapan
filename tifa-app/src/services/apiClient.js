/**
 * API Client for tifa-be
 * Automatically attaches JWT token to all requests
 */
import wsService from './WebSocketService';

const API_BASE = import.meta.env.VITE_API_URL || 'https://tifa-be.forgixrobotic.com';

/**
 * Fetch with JWT token attached
 * @param {string} path - API path (e.g. "/api/maps")
 * @param {object} options - fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const token = wsService.jwtToken;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

/**
 * GET request helper
 */
export async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * POST request helper
 */
export async function apiPost(path, body) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
