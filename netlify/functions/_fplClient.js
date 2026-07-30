// Shared helper for proxying the official (undocumented, public,
// unauthenticated) FPL API from a Netlify Function, so the browser never
// hits fantasy.premierleague.com directly (avoids CORS issues and keeps
// a single retry policy in one place).
const BASE_URL = "https://fantasy.premierleague.com/api";
const USER_AGENT = "fpl-intelligence-assistant-web/0.1 (personal use)";

export async function fetchFplJson(path, { retries = 3, timeoutMs = 15000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`FPL source returned HTTP ${res.status} for ${path}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      clearTimeout(timeout);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw new Error(`Failed to fetch ${path} after ${retries} attempts: ${lastError?.message}`);
}

export function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // Short cache: freshness still matters, but this avoids hammering
      // the FPL API if many browser tabs refresh around the same time.
      "Cache-Control": "public, max-age=30",
    },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message, statusCode = 502) {
  return jsonResponse({ error: message }, statusCode);
}
