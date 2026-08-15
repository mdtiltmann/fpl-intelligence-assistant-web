import { fetchFplJson, jsonResponse, errorResponse } from "./_fplClient.js";

// Per-player match history + season-level history_past — used for recent
// form splits and the Historical Baseline / Pre-Season Rating.
export async function handler(event) {
  const playerId = event.queryStringParameters?.playerId;
  if (!playerId || !/^\d+$/.test(playerId)) {
    return errorResponse("Query param 'playerId' must be a positive integer.", 400);
  }
  try {
    const data = await fetchFplJson(`/element-summary/${playerId}/`);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err.message);
  }
}
