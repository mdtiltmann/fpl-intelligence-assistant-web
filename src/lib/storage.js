// Single-user, local-only "database" replacement: everything that would
// have been SQLite rows in the Python app is a browser localStorage entry
// here instead, since Netlify has no persistent server-side database for
// this project and a single manager's preferences don't need one.
const MANAGER_ID_KEY = "fpl.managerId";
const OVERRIDES_KEY = "fpl.overrides"; // { [playerId]: { status, note, updatedAt } }
const DRAFT_SQUAD_KEY = "fpl.draftSquad"; // { playerIds: number[], budget: number, maxPerClub: number, savedAt: string }

export function getManagerId() {
  return localStorage.getItem(MANAGER_ID_KEY) || "";
}

export function setManagerId(id) {
  localStorage.setItem(MANAGER_ID_KEY, String(id));
}

export function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setOverride(playerId, status, note) {
  const overrides = getOverrides();
  overrides[playerId] = { status, note, updatedAt: new Date().toISOString() };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function clearOverride(playerId) {
  const overrides = getOverrides();
  delete overrides[playerId];
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getSavedDraftSquad() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_SQUAD_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveDraftSquad(playerIds, budget, maxPerClub) {
  const record = { playerIds, budget, maxPerClub, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_SQUAD_KEY, JSON.stringify(record));
  return record;
}

export function clearSavedDraftSquad() {
  localStorage.removeItem(DRAFT_SQUAD_KEY);
}
