// Last-Season Squad Translator — a lean port of analytics/squad_translator.py.
// Resolves a remembered player name against the CURRENT season's real
// player list (word-token match first, then substring — the same fix
// the Python app needed after "Raya" ambiguously matched "Rayan..."
// players) rather than a historical archive: if a name has no match in
// the current player list at all, that's a genuine "No Longer Available"
// signal without needing a separate cross-season identity source.
export const KEEP_AS_CORE = "Keep as Core";
export const STILL_STRONG = "Still Strong";
export const REASSESS_AT_NEW_PRICE = "Reassess at New Price";
export const INJURY_OR_AVAILABILITY_RISK = "Injury/Availability Risk";
export const AVOID = "Avoid";
export const NO_LONGER_AVAILABLE = "No Longer Available";

import { computePreSeasonRating, latestPastSeason } from "./historicalBaseline.js";

export function resolvePlayerByName(name, allPlayers) {
  const nameLower = name.trim().toLowerCase();
  const exact = allPlayers.find((p) => p.web_name.trim().toLowerCase() === nameLower);
  if (exact) return exact;

  const tokenMatches = allPlayers.filter((p) => p.web_name.trim().toLowerCase().split(/\s+/).includes(nameLower));
  if (tokenMatches.length === 1) return tokenMatches[0];

  const substringMatches = allPlayers.filter((p) => p.web_name.trim().toLowerCase().includes(nameLower));
  if (substringMatches.length === 1) return substringMatches[0];

  return null;
}

export function classifyPlayer(originalName, currentPlayer, elementSummary) {
  if (!currentPlayer) {
    return {
      originalName,
      currentPlayer: null,
      classification: NO_LONGER_AVAILABLE,
      reasons: [`No current player named '${originalName}' was found — likely left the Premier League, or the name couldn't be resolved.`],
      preSeasonRating: null,
    };
  }

  if (["i", "s", "u"].includes(currentPlayer.status)) {
    const label = { i: "injured", s: "suspended", u: "unavailable" }[currentPlayer.status];
    return {
      originalName,
      currentPlayer,
      classification: INJURY_OR_AVAILABILITY_RISK,
      reasons: [`Official current status is '${currentPlayer.status}' (${label}).`],
      preSeasonRating: null,
    };
  }

  const season = latestPastSeason(elementSummary);
  if (!season) {
    return {
      originalName,
      currentPlayer,
      classification: REASSESS_AT_NEW_PRICE,
      reasons: ["No past-season history found for this player — likely new to the Premier League, cannot rate confidently."],
      preSeasonRating: null,
    };
  }

  const rating = computePreSeasonRating(currentPlayer, season);
  let classification;
  if (rating.preSeasonRating >= 70) classification = KEEP_AS_CORE;
  else if (rating.preSeasonRating >= 55) classification = STILL_STRONG;
  else if (rating.preSeasonRating >= 40) classification = REASSESS_AT_NEW_PRICE;
  else classification = AVOID;

  return { originalName, currentPlayer, classification, reasons: rating.assumptions, preSeasonRating: rating.preSeasonRating };
}

export function suggestReplacementFor(translation, allPlayers, alreadyUsedIds, expectedPointsById) {
  if (!translation.currentPlayer) return null;
  const position = translation.currentPlayer.element_type;
  const priceCeiling = translation.currentPlayer.now_cost * 1.3;
  const candidates = allPlayers.filter(
    (p) => p.element_type === position && !alreadyUsedIds.has(p.id) && p.id !== translation.currentPlayer.id &&
      p.now_cost <= priceCeiling && p.status === "a"
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, p) => {
    const ep = expectedPointsById[p.id]?.central || 0;
    const bestEp = expectedPointsById[best.id]?.central || 0;
    return ep > bestEp ? p : best;
  });
}
