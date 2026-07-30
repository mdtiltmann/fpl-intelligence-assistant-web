// Ports of the core recommendation logic from the Python app
// (src/fpl_assistant/analytics/*.py, recommendations/*.py) to run
// client-side in the browser. Kept close to the original formulas so the
// numbers mean the same thing, but trimmed to fit a leaner v1 — see
// netlify-app/README.md for exactly what was and wasn't ported.

const POSITION_NAMES = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
const APPEARANCE_POINTS_PER_90 = 2.0;
const GOAL_POINTS = { 1: 10, 2: 6, 3: 5, 4: 4 };
const ASSIST_POINTS = 3;
const CLEAN_SHEET_POINTS = { 1: 4, 2: 4, 3: 1, 4: 0 };

export function positionName(elementType) {
  return POSITION_NAMES[elementType] || "?";
}

export function minutesSecurityScore(player, gameweeksPlayed, overrideStatus) {
  const status = overrideStatus || player.status;
  if (gameweeksPlayed <= 0) return 50.0;
  const maxMinutes = gameweeksPlayed * 90;
  const share = maxMinutes ? Math.min(player.minutes / maxMinutes, 1.0) : 0.0;
  let score = share * 100;
  if (status !== "a") {
    score *= 0.3;
  } else if (player.chance_of_playing_next_round != null) {
    score *= player.chance_of_playing_next_round / 100.0;
  }
  return Math.round(score * 10) / 10;
}

function minutesFraction(player, gameweeksPlayed, overrideStatus) {
  const status = overrideStatus || player.status;
  let base;
  if (gameweeksPlayed <= 0) {
    base = 0.5;
  } else {
    const maxMinutes = gameweeksPlayed * 90;
    base = maxMinutes ? Math.min(player.minutes / maxMinutes, 1.0) : 0.5;
  }
  if (status !== "a") {
    base *= 0.2;
  } else if (player.chance_of_playing_next_round != null) {
    base *= player.chance_of_playing_next_round / 100.0;
  }
  return base;
}

/** Same baseline-v1 formula as analytics/expected_points.py. */
export function estimateExpectedPoints(player, gameweeksPlayed, upcomingFixtures, overrideStatus) {
  const mf = minutesFraction(player, gameweeksPlayed, overrideStatus);
  const minutes90 = player.minutes / 90;
  const per90Goals = minutes90 ? player.expected_goals / minutes90 : 0;
  const per90Assists = minutes90 ? player.expected_assists / minutes90 : 0;

  let cleanSheetProb = 0.3;
  if (minutes90 && player.expected_goals_conceded) {
    const egcPer90 = player.expected_goals_conceded / minutes90;
    cleanSheetProb = Math.max(0, Math.min(1, 1 - egcPer90 / 2.5));
  }

  const attacking = per90Goals * (GOAL_POINTS[player.element_type] || 4) + per90Assists * ASSIST_POINTS;
  const defensive = cleanSheetProb * (CLEAN_SHEET_POINTS[player.element_type] || 0);
  const perGwPoints = mf * (APPEARANCE_POINTS_PER_90 + attacking + defensive);

  let fixtureMultiplier = 1.0;
  const horizon = upcomingFixtures?.length || 1;
  if (upcomingFixtures?.length) {
    const avgDifficulty =
      upcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / upcomingFixtures.length;
    fixtureMultiplier = 1.0 + (3 - avgDifficulty) * 0.07;
  }

  const central = perGwPoints * fixtureMultiplier * horizon;
  let confidence = gameweeksPlayed > 0 ? 0.75 : 0.4;
  if ((overrideStatus || player.status) !== "a") confidence *= 0.7;

  return {
    central: Math.round(central * 100) / 100,
    low: Math.round(central * 0.55 * 100) / 100,
    high: Math.round(central * 1.55 * 100) / 100,
    horizon,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/** Independent fixture-difficulty calc, matching analytics/fixtures.py. */
export function calculateDifficulty(ownStrength, opponentStrength) {
  if (!ownStrength || !opponentStrength) return 3.0;
  const scaled = 3.0 * (opponentStrength / ownStrength);
  return Math.round(Math.max(1, Math.min(5, scaled)) * 10) / 10;
}

export function upcomingFixturesForTeam(fixtures, teamsById, teamId, horizon) {
  const relevant = fixtures
    .filter((f) => !f.finished && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event ?? 999) - (b.event ?? 999) || a.id - b.id);

  const own = teamsById[teamId];
  return relevant.slice(0, horizon).map((f) => {
    const isHome = f.team_h === teamId;
    const opponentId = isHome ? f.team_a : f.team_h;
    const opponent = teamsById[opponentId];
    const official = isHome ? f.team_h_difficulty : f.team_a_difficulty;
    const ownStrength = own ? (isHome ? own.strength_overall_home : own.strength_overall_away) : 0;
    const oppStrength = opponent ? (isHome ? opponent.strength_overall_away : opponent.strength_overall_home) : 0;
    return {
      event: f.event,
      opponentShortName: opponent?.short_name || "?",
      isHome,
      difficulty: official,
      calculatedDifficulty: calculateDifficulty(ownStrength, oppStrength),
    };
  });
}

const SQUAD_SHAPE_MIN_MAX = { 1: [1, 1], 2: [3, 5], 3: [2, 5], 4: [1, 3] };

/** Greedy formation-legal XI/bench picker, matching recommendations/squad.py. */
export function pickBestXi(squad, expectedPointsById) {
  const ep = (p) => expectedPointsById[p.id]?.central ?? 0;
  const byPos = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of squad) byPos[p.element_type]?.push(p);
  for (const pos in byPos) byPos[pos].sort((a, b) => ep(b) - ep(a));

  let starters = [];
  for (const [pos, [minN]] of Object.entries(SQUAD_SHAPE_MIN_MAX)) {
    starters.push(...byPos[pos].slice(0, minN));
  }

  let pool = [];
  for (const [pos, [, maxN]] of Object.entries(SQUAD_SHAPE_MIN_MAX)) {
    const already = starters.filter((s) => s.element_type === Number(pos)).length;
    pool.push(...byPos[pos].slice(already, maxN));
  }
  pool.sort((a, b) => ep(b) - ep(a));

  let remaining = 11 - starters.length;
  for (const p of pool) {
    if (remaining <= 0) break;
    const posCount = starters.filter((s) => s.element_type === p.element_type).length;
    if (posCount >= SQUAD_SHAPE_MIN_MAX[p.element_type][1]) continue;
    starters.push(p);
    remaining--;
  }

  const starterIds = new Set(starters.map((p) => p.id));
  const bench = squad.filter((p) => !starterIds.has(p.id));
  const benchGkp = bench.filter((p) => p.element_type === 1);
  const benchOutfield = bench.filter((p) => p.element_type !== 1).sort((a, b) => ep(b) - ep(a));

  const counts = {};
  for (const pos of [2, 3, 4]) counts[pos] = starters.filter((s) => s.element_type === pos).length;
  const formation = `${counts[2]}-${counts[3]}-${counts[4]}`;

  return { starters, bench: [...benchOutfield, ...benchGkp], formation };
}

/** Ranks starters for captaincy, matching recommendations/captaincy.py. */
export function rankCaptains(starters, expectedPointsById, gameweeksPlayed, overrides) {
  const options = starters
    .map((p) => {
      const ep = expectedPointsById[p.id];
      if (!ep) return null;
      const security = minutesSecurityScore(p, gameweeksPlayed, overrides?.[p.id]?.status);
      const riskNote =
        security >= 70
          ? "Low rotation/injury risk."
          : security >= 40
            ? "Moderate risk — check availability before the deadline."
            : "Higher risk — minutes are not secure.";
      return { player: p, expectedPoints: ep.central, ceiling: ep.high, floor: ep.low, security, riskNote };
    })
    .filter(Boolean);
  options.sort((a, b) => b.expectedPoints - a.expectedPoints);
  return options;
}

export function safestCaptain(options) {
  const secure = options.filter((o) => o.security >= 70);
  if (!secure.length) return options[0] || null;
  return secure.reduce((best, o) => (o.expectedPoints > best.expectedPoints ? o : best));
}

export function highestUpsideCaptain(options) {
  if (!options.length) return null;
  return options.reduce((best, o) => (o.ceiling > best.ceiling ? o : best));
}

/** Nine-component transparent team rating, a lean port of recommendations/team_rating.py. */
export function computeTeamRating(squad, starters, bench, expectedPointsById, gameweeksPlayed) {
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const components = [];

  const totalEp = starters.reduce((s, p) => s + (expectedPointsById[p.id]?.central || 0), 0);
  components.push({
    key: "projected_points",
    label: "Projected points (starting XI)",
    score: clamp((totalEp / ((starters.length || 1) * 8)) * 100),
    weight: 0.2,
    explanation: `Sum of expected points for your ${starters.length} starters: ${totalEp.toFixed(1)}.`,
  });

  const securityScores = starters.map((p) => minutesSecurityScore(p, gameweeksPlayed));
  const securityAvg = securityScores.length ? securityScores.reduce((a, b) => a + b, 0) / securityScores.length : 50;
  components.push({
    key: "starting_minutes_security",
    label: "Starting-minute security",
    score: clamp(securityAvg),
    weight: 0.15,
    explanation: "Average season-to-date minutes share, adjusted for official availability.",
  });

  const starterEps = starters.map((p) => expectedPointsById[p.id]?.central).filter((v) => v != null);
  let captaincyScore = 50;
  if (starterEps.length) {
    const best = Math.max(...starterEps);
    const avg = starterEps.reduce((a, b) => a + b, 0) / starterEps.length;
    captaincyScore = clamp(50 + (best - avg) * 10);
  }
  components.push({
    key: "captaincy_quality",
    label: "Captaincy quality",
    score: captaincyScore,
    weight: 0.1,
    explanation: "How much higher your best captain option's expected points are versus your squad average.",
  });

  const formAvg = starters.length ? starters.reduce((s, p) => s + (p.form || 0), 0) / starters.length : 0;
  components.push({
    key: "recent_form",
    label: "Recent form",
    score: clamp((formAvg / 8) * 100),
    weight: 0.15,
    explanation: `Average official FPL 'form' figure across starters: ${formAvg.toFixed(1)}.`,
  });

  const benchEp = bench.reduce((s, p) => s + (expectedPointsById[p.id]?.central || 0), 0);
  components.push({
    key: "bench_strength",
    label: "Bench strength",
    score: clamp((benchEp / ((bench.length || 1) * 6)) * 100),
    weight: 0.1,
    explanation: `Sum of expected points across your ${bench.length} bench players: ${benchEp.toFixed(1)}.`,
  });

  const unavailable = squad.filter((p) => p.status !== "a").length;
  components.push({
    key: "injury_suspension_risk",
    label: "Injury/suspension risk (higher = safer)",
    score: clamp(100 - (unavailable / (squad.length || 1)) * 200),
    weight: 0.1,
    explanation: `${unavailable} of ${squad.length} squad players do not have official status 'available'.`,
  });

  const clubCounts = {};
  for (const p of squad) clubCounts[p.team] = (clubCounts[p.team] || 0) + 1;
  const maxClub = Math.max(0, ...Object.values(clubCounts));
  components.push({
    key: "squad_balance_club_concentration",
    label: "Squad balance (club concentration)",
    score: clamp(100 - Math.max(0, maxClub - 3) * 25),
    weight: 0.05,
    explanation: `Most players from a single club: ${maxClub}.`,
  });

  const totalValue = squad.reduce((s, p) => s + p.now_cost, 0) / 10;
  const totalPoints = squad.reduce((s, p) => s + p.total_points, 0);
  const ppm = totalValue ? totalPoints / totalValue : 0;
  components.push({
    key: "price_efficiency",
    label: "Price efficiency",
    score: clamp((ppm / 15) * 100),
    weight: 0.05,
    explanation: `Total squad points per £1m spent: ${ppm.toFixed(1)}.`,
  });

  components.push({
    key: "fixture_quality",
    label: "Fixture quality",
    score: 60,
    weight: 0.1,
    explanation: "Neutral baseline — see the Fixtures page; not yet folded into this component in the web version.",
  });

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const overall = components.reduce((s, c) => s + c.score * c.weight, 0) / (totalWeight || 1);

  return { overall: Math.round(clamp(overall) * 10) / 10, components };
}

const POINTS_PER_HIT = 4;

/** Single-swap transfer suggestions, a lean port of recommendations/transfers.py. */
export function suggestReplacements(squad, allPlayers, expectedPointsById, bankM, freeTransfers, minGainForHit, minGainNoHit, maxPerClub) {
  const squadIds = new Set(squad.map((p) => p.id));
  const clubCounts = {};
  for (const p of squad) clubCounts[p.team] = (clubCounts[p.team] || 0) + 1;

  const suggestions = [];
  for (const outPlayer of squad) {
    const outEp = expectedPointsById[outPlayer.id];
    if (!outEp) continue;
    const sellingPrice = outPlayer.now_cost / 10;

    let best = null;
    let bestGain = 0;
    for (const cand of allPlayers) {
      if (squadIds.has(cand.id) || cand.element_type !== outPlayer.element_type) continue;
      if (cand.now_cost / 10 > sellingPrice + bankM) continue;
      const candEp = expectedPointsById[cand.id];
      if (!candEp) continue;
      const clubAfter = (clubCounts[cand.team] || 0) + (cand.team !== outPlayer.team ? 1 : 0);
      if (clubAfter > maxPerClub) continue;
      const gain = candEp.central - outEp.central;
      if (gain > bestGain) {
        bestGain = gain;
        best = cand;
      }
    }
    if (!best) continue;

    const bestEp = expectedPointsById[best.id];
    const hitCost = freeTransfers > 0 ? 0 : POINTS_PER_HIT;
    const gainAfterHit = bestGain - hitCost;
    const threshold = hitCost > 0 ? minGainForHit : minGainNoHit;
    if (gainAfterHit < threshold) continue;

    suggestions.push({
      playerOut: outPlayer,
      playerIn: best,
      expectedPointsOut: outEp.central,
      expectedPointsIn: bestEp.central,
      expectedGainBeforeHit: Math.round(bestGain * 100) / 100,
      hitCost,
      expectedGainAfterHit: Math.round(gainAfterHit * 100) / 100,
      cashDeltaM: Math.round((sellingPrice + bankM - best.now_cost / 10) * 10) / 10,
    });
  }

  suggestions.sort((a, b) => b.expectedGainAfterHit - a.expectedGainAfterHit);
  return suggestions;
}
