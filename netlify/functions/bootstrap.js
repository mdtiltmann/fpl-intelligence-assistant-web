import { fetchFplJson, jsonResponse, errorResponse } from "./_fplClient.js";

export async function handler() {
  try {
    const data = await fetchFplJson("/bootstrap-static/");
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err.message);
  }
}
