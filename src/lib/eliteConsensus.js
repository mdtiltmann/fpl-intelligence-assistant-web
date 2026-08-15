// Elite-manager consensus — a lean port of analytics/elite_consensus.py.
// Deliberately a small, separate signal: never wired into the model's
// own scoring, presented side-by-side for the user to weigh themselves.
// Unlike the Python app (which stores an immutable per-gameweek snapshot
// per tracked manager), this computes consensus live from each tracked
// manager's *current* picks on every page load — there's no server-side
// database to keep history in, so there's no "last week's snapshot" to
// compare against here; only real-time consensus.
export const DISAGREEMENT_WARNING =
  "Current overall rank can be heavily affected by short-term variance. Elite-manager behaviour is " +
  "an additional signal and should not replace statistical analysis.";

export function computeConsensus(picksPayloads) {
  if (!picksPayloads?.length) return {};
  const cohortSize = picksPayloads.length;
  const ownedBy = {};
  const captainedBy = {};
  const viceCaptainedBy = {};

  for (const payload of picksPayloads) {
    for (const pick of payload?.picks || []) {
      ownedBy[pick.element] = (ownedBy[pick.element] || 0) + 1;
      if (pick.is_captain) captainedBy[pick.element] = (captainedBy[pick.element] || 0) + 1;
      if (pick.is_vice_captain) viceCaptainedBy[pick.element] = (viceCaptainedBy[pick.element] || 0) + 1;
    }
  }

  const result = {};
  for (const [pidStr, count] of Object.entries(ownedBy)) {
    const pid = Number(pidStr);
    result[pid] = {
      playerId: pid,
      ownedBy: count,
      ownershipPct: Math.round((count / cohortSize) * 1000) / 10,
      captainedBy: captainedBy[pid] || 0,
      captainPct: Math.round(((captainedBy[pid] || 0) / cohortSize) * 1000) / 10,
      viceCaptainedBy: viceCaptainedBy[pid] || 0,
    };
  }
  return result;
}

export function consensusLabel(entry) {
  if (entry.captainPct >= 50) return "Captain Consensus";
  if (entry.ownershipPct >= 80) return "Template Core";
  if (entry.ownershipPct >= 40) return "Emerging Consensus";
  return "Elite Differential";
}

export function compareSquadToConsensus(mySquadIds, consensus, blindSpotThresholdPct = 40, differentialThresholdPct = 10) {
  const mySet = new Set(mySquadIds);
  const shared = [...mySet].filter((pid) => (consensus[pid]?.ownershipPct ?? 0) >= blindSpotThresholdPct);
  const blindSpots = Object.entries(consensus)
    .filter(([pid, e]) => !mySet.has(Number(pid)) && e.ownershipPct >= blindSpotThresholdPct)
    .map(([pid]) => Number(pid));
  const differentials = [...mySet].filter((pid) => (consensus[pid]?.ownershipPct ?? 0) <= differentialThresholdPct);
  return { shared, blindSpots, differentials, warning: DISAGREEMENT_WARNING };
}
