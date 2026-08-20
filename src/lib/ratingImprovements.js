// Rating-improvement suggestions: for each swappable squad player, finds
// same-position, affordable replacements and reports the actual effect on
// the 0-100 team rating (not just expected-points gain) — so "why" ties
// back to which specific rating components moved, not just a bare
// points number. Shared between My Team (real squad) and Draft Squad
// (budget squad builder), since the underlying question is identical:
// "what single swap, within budget, raises my rating, and why?"
import { pickBestXi, computeTeamRating } from "./analytics.js";

export function suggestRatingImprovements({
  squad,
  allPlayers,
  expectedPointsById,
  budgetRemainingM,
  maxPerClub,
  gameweeksPlayed,
  fixtures,
  teamsById,
  horizon,
  lockedIds = new Set(),
  candidatesPerOutgoing = 8,
  maxResults = 8,
}) {
  if (squad.length < 11) return { baselineRating: null, suggestions: [] };

  const baselineSelection = pickBestXi(squad, expectedPointsById);
  const baselineRating = computeTeamRating(
    squad, baselineSelection.starters, baselineSelection.bench, expectedPointsById, gameweeksPlayed, fixtures, teamsById, horizon
  );
  const baselineByKey = Object.fromEntries(baselineRating.components.map((c) => [c.key, c]));

  const squadIds = new Set(squad.map((p) => p.id));
  const clubCounts = {};
  for (const p of squad) clubCounts[p.team] = (clubCounts[p.team] || 0) + 1;

  const results = [];
  for (const outPlayer of squad) {
    if (lockedIds.has(outPlayer.id)) continue;
    const sellingPrice = outPlayer.now_cost / 10;
    const spendable = budgetRemainingM + sellingPrice;

    const candidatePool = allPlayers
      .filter((c) => c.id !== outPlayer.id && !squadIds.has(c.id) && c.element_type === outPlayer.element_type)
      .filter((c) => c.now_cost / 10 <= spendable)
      .filter((c) => c.team === outPlayer.team || (clubCounts[c.team] || 0) < maxPerClub)
      .sort((a, b) => (expectedPointsById[b.id]?.central || 0) - (expectedPointsById[a.id]?.central || 0))
      .slice(0, candidatesPerOutgoing);

    let best = null;
    for (const candidate of candidatePool) {
      const newSquad = squad.map((p) => (p.id === outPlayer.id ? candidate : p));
      const newSelection = pickBestXi(newSquad, expectedPointsById);
      const newRating = computeTeamRating(
        newSquad, newSelection.starters, newSelection.bench, expectedPointsById, gameweeksPlayed, fixtures, teamsById, horizon
      );
      const ratingDelta = Math.round((newRating.overall - baselineRating.overall) * 10) / 10;
      if (ratingDelta <= 0) continue;
      if (!best || ratingDelta > best.ratingDelta) {
        const componentDiffs = newRating.components
          .map((c) => ({ label: c.label, delta: Math.round((c.score - (baselineByKey[c.key]?.score || 0)) * 10) / 10 }))
          .filter((d) => Math.abs(d.delta) >= 1)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 3);
        best = {
          playerOut: outPlayer,
          playerIn: candidate,
          ratingBefore: baselineRating.overall,
          ratingAfter: newRating.overall,
          ratingDelta,
          cashDeltaM: Math.round((spendable - candidate.now_cost / 10) * 10) / 10,
          componentDiffs,
        };
      }
    }
    if (best) results.push(best);
  }

  results.sort((a, b) => b.ratingDelta - a.ratingDelta);
  return { baselineRating, suggestions: results.slice(0, maxResults) };
}
