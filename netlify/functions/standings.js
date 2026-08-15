import { fetchFplJson, jsonResponse, errorResponse } from "./_fplClient.js";

// League 314 is FPL's own official "Overall" global league — real, public,
// no scraping. Empty before any gameweek has scores, which is expected
// pre-season, not a fetch failure.
export async function handler(event) {
  const leagueId = event.queryStringParameters?.leagueId || "314";
  const page = event.queryStringParameters?.page || "1";
  if (!/^\d+$/.test(leagueId) || !/^\d+$/.test(page)) {
    return errorResponse("Query params 'leagueId' and 'page' must be positive integers.", 400);
  }
  try {
    const data = await fetchFplJson(`/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err.message);
  }
}
