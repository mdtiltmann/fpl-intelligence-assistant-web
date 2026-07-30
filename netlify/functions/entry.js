import { fetchFplJson, jsonResponse, errorResponse } from "./_fplClient.js";

export async function handler(event) {
  const managerId = event.queryStringParameters?.managerId;
  if (!managerId || !/^\d+$/.test(managerId)) {
    return errorResponse("Query param 'managerId' must be a positive integer.", 400);
  }
  try {
    const data = await fetchFplJson(`/entry/${managerId}/`);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err.message);
  }
}
