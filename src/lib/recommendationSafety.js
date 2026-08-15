// Recommendation-safety labelling — a lean port of
// analytics/recommendation_safety.py. Turns a confidence figure (already
// computed by estimateExpectedPoints/computeTeamRating) plus real
// gameweeks-played into a plain-English READY/LIMITED/EXPERIMENTAL/BLOCKED
// label, rather than a bare percentage the user has to interpret.
export const READY = "READY";
export const LIMITED = "LIMITED";
export const EXPERIMENTAL = "EXPERIMENTAL";
export const BLOCKED = "BLOCKED";

export const SAFETY_ICON = { READY: "🟢", LIMITED: "🟡", EXPERIMENTAL: "🟠", BLOCKED: "⚫" };

export function classifySafety(confidence, gameweeksPlayed, dataAvailable = true) {
  if (!dataAvailable) {
    return { label: BLOCKED, reason: "The data this recommendation depends on is unavailable right now." };
  }
  if (gameweeksPlayed === 0) {
    return {
      label: EXPERIMENTAL,
      reason: "Pre-season — no real gameweek data exists yet, so this rests on prior-info signals only.",
    };
  }
  if (confidence < 0.4) {
    return { label: EXPERIMENTAL, reason: `Low confidence (${Math.round(confidence * 100)}%) — treat as an early, unvalidated signal.` };
  }
  if (confidence < 0.7 || gameweeksPlayed < 3) {
    const reasons = [];
    if (confidence < 0.7) reasons.push(`confidence is moderate (${Math.round(confidence * 100)}%)`);
    if (gameweeksPlayed < 3) reasons.push(`only ${gameweeksPlayed} gameweek${gameweeksPlayed === 1 ? "" : "s"} of data exist`);
    return { label: LIMITED, reason: `Usable, but ${reasons.join(" and ")}.` };
  }
  return { label: READY, reason: `Confidence is high (${Math.round(confidence * 100)}%) with enough in-season data to trust this.` };
}
