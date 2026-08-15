// Multi-gameweek Bench Boost/Triple Captain timing comparison — a lean
// port of analytics/chip_timing.py. Reuses estimateExpectedPoints scoped
// to one calendar gameweek's fixture(s) at a time, so a genuine blank
// gameweek correctly scores as zero rather than a fallback estimate.
// Wildcard/Free Hit timing is not covered here — see the Python app's
// docs/DECISIONS.md for why that's a materially larger, separate feature.
import { estimateExpectedPoints, upcomingFixturesForTeam } from "./analytics.js";

function fixturesByPlayer(players, teamsById, fixtures, lookahead = 20) {
  const map = {};
  for (const p of players) map[p.id] = upcomingFixturesForTeam(fixtures, teamsById, p.team, lookahead);
  return map;
}

export function compareBenchBoostWindows(benchPlayers, teamsById, fixtures, candidateGameweeks, gameweeksPlayed) {
  if (!benchPlayers?.length || !candidateGameweeks?.length) return [];
  const byPlayer = fixturesByPlayer(benchPlayers, teamsById, fixtures);
  const results = candidateGameweeks.map((gw) => {
    let total = 0;
    let blanks = 0;
    for (const p of benchPlayers) {
      const weekFixtures = byPlayer[p.id].filter((f) => f.event === gw);
      if (!weekFixtures.length) { blanks++; continue; }
      total += estimateExpectedPoints(p, gameweeksPlayed, weekFixtures).central;
    }
    let note;
    if (blanks === benchPlayers.length) note = "No bench player has a fixture this gameweek (blank) — a poor Bench Boost week.";
    else if (blanks) note = `${blanks} of ${benchPlayers.length} bench players have no fixture this gameweek.`;
    else note = "All bench players have a fixture this gameweek.";
    return { gameweek: gw, estimatedValue: Math.round(total * 100) / 100, note };
  });
  results.sort((a, b) => b.estimatedValue - a.estimatedValue);
  return results;
}

export function compareTripleCaptainWindows(starters, teamsById, fixtures, candidateGameweeks, gameweeksPlayed) {
  if (!starters?.length || !candidateGameweeks?.length) return [];
  const byPlayer = fixturesByPlayer(starters, teamsById, fixtures);
  const results = candidateGameweeks.map((gw) => {
    let bestValue = 0;
    let bestName = null;
    for (const p of starters) {
      const weekFixtures = byPlayer[p.id].filter((f) => f.event === gw);
      if (!weekFixtures.length) continue;
      const central = estimateExpectedPoints(p, gameweeksPlayed, weekFixtures).central;
      if (central > bestValue) { bestValue = central; bestName = p.web_name; }
    }
    const note = bestName ? `Best captain candidate: ${bestName}.` : "No starter has a fixture this gameweek (blank) — avoid Triple Captain here.";
    return { gameweek: gw, estimatedValue: Math.round(bestValue * 100) / 100, note };
  });
  results.sort((a, b) => b.estimatedValue - a.estimatedValue);
  return results;
}
