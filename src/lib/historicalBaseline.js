// Historical Baseline / Current Adjustment / Pre-Season Rating — a lean
// port of analytics/historical_baseline.py, using the official
// element-summary `history_past` array (real per-season data FPL itself
// publishes) rather than a third-party archive, so it works from a single
// serverless function call with no import step. Never presents last
// season's performance as a guarantee of next season's.
const ELITE_PPG90 = { 1: 4.5, 2: 5.0, 3: 6.0, 4: 6.5 };
const RELIABLE_MINUTES = 1800;

export function historicalPointsPer90(season) {
  if (!season.minutes) return 0;
  return Math.round((season.total_points / (season.minutes / 90)) * 100) / 100;
}

export function computePreSeasonRating(player, season) {
  const assumptions = [];
  const ppg90 = historicalPointsPer90(season);
  const eliteThreshold = ELITE_PPG90[player.element_type] || 5.5;
  const rawScore = Math.max(0, Math.min(100, (ppg90 / eliteThreshold) * 100));

  const reliability = Math.round(Math.min(1, season.minutes / RELIABLE_MINUTES) * 100) / 100;
  if (reliability < 1) {
    assumptions.push(
      `Only ${season.minutes} minutes played in ${season.season_name} (reliability ${Math.round(reliability * 100)}%) — ` +
      `baseline pulled toward a neutral 50 to avoid over-trusting a small sample.`
    );
  }
  const baselineScore = Math.round((rawScore * reliability + 50 * (1 - reliability)) * 10) / 10;

  let adjustment = 1.0;
  if (season.end_cost > 0) {
    const priceRatio = player.now_cost / season.end_cost;
    if (priceRatio > 1.15) {
      adjustment *= 0.9;
      assumptions.push(
        `Price has risen ${Math.round((priceRatio - 1) * 100)}% since ${season.season_name} ended — the market has ` +
        `already priced in an improvement, so this discounts the baseline slightly.`
      );
    } else if (priceRatio < 0.9) {
      adjustment *= 0.85;
      assumptions.push(
        `Price has fallen ${Math.round((1 - priceRatio) * 100)}% since ${season.season_name} ended — the market senses ` +
        `a problem (role, injury, or transfer risk), so this discounts the baseline.`
      );
    }
  } else {
    assumptions.push(`No end-of-season price available for ${season.season_name} — no price adjustment applied.`);
  }

  if (player.status !== "a") {
    adjustment *= 0.5;
    assumptions.push(`Official current status is '${player.status}', not available — baseline heavily discounted.`);
  }

  assumptions.push("Does not yet include elite-manager consensus or opening-fixture strength — a prior, never a guarantee of next season's performance.");

  const preSeasonRating = Math.round(Math.max(0, Math.min(100, baselineScore * adjustment)) * 10) / 10;

  return {
    seasonName: season.season_name,
    historicalPointsPer90: ppg90,
    historicalMinutes: season.minutes,
    historicalBaselineScore: baselineScore,
    reliability,
    currentAdjustment: Math.round(adjustment * 100) / 100,
    preSeasonRating,
    assumptions,
  };
}

/** Picks the most recent past season from an element-summary payload's
 * history_past array, or null if the player has none (genuinely new to
 * the Premier League). */
export function latestPastSeason(elementSummary) {
  const seasons = elementSummary?.history_past || [];
  if (!seasons.length) return null;
  return seasons.reduce((latest, s) => (s.season_name > latest.season_name ? s : latest));
}
