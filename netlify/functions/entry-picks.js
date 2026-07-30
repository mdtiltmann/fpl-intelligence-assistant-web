import { fetchFplJson, jsonResponse, errorResponse } from "./_fplClient.js";

export async function handler(event) {
  const managerId = event.queryStringParameters?.managerId;
  const eventId = event.queryStringParameters?.event;
  if (!managerId || !/^\d+$/.test(managerId)) {
    return errorResponse("Query param 'managerId' must be a positive integer.", 400);
  }
  if (!eventId || !/^\d+$/.test(eventId)) {
    return errorResponse("Query param 'event' must be a positive integer (gameweek id).", 400);
  }
  try {
    const data = await fetchFplJson(`/entry/${managerId}/event/${eventId}/picks/`);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err.message);
  }
}
