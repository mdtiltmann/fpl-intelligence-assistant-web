// Client-side wrappers around the Netlify Functions proxy. Components
// should never call fantasy.premierleague.com directly.
const FN = "/.netlify/functions";

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || `Request to ${url} failed with HTTP ${res.status}`);
  }
  return body;
}

export function getBootstrapStatic() {
  return getJson(`${FN}/bootstrap`);
}

export function getFixtures() {
  return getJson(`${FN}/fixtures`);
}

export function getEntry(managerId) {
  return getJson(`${FN}/entry?managerId=${encodeURIComponent(managerId)}`);
}

export function getEntryHistory(managerId) {
  return getJson(`${FN}/entry-history?managerId=${encodeURIComponent(managerId)}`);
}

export function getEntryTransfers(managerId) {
  return getJson(`${FN}/entry-transfers?managerId=${encodeURIComponent(managerId)}`);
}

export function getEntryPicks(managerId, eventId) {
  return getJson(
    `${FN}/entry-picks?managerId=${encodeURIComponent(managerId)}&event=${encodeURIComponent(eventId)}`
  );
}

export function getStandings(leagueId = 314, page = 1) {
  return getJson(`${FN}/standings?leagueId=${encodeURIComponent(leagueId)}&page=${encodeURIComponent(page)}`);
}

export function getElementSummary(playerId) {
  return getJson(`${FN}/element-summary?playerId=${encodeURIComponent(playerId)}`);
}
