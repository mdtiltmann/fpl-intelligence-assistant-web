// Chip availability + free-transfer state engines — a lean port of
// analytics/chip_engine.py and analytics/transfer_state.py. Reads this
// season's real chip windows/counts straight from bootstrap-static's own
// `chips` array (never hard-coded) and reconstructs free transfers by
// walking gameweek history forward (an inference, not a guarantee).

export function computeChipAvailability(rules, usedChips, currentEvent) {
  const windowsByName = {};
  for (const r of rules) {
    (windowsByName[r.name] ||= []).push({ name: r.name, startEvent: r.start_event, stopEvent: r.stop_event, number: r.number });
  }
  const usedEventsByName = {};
  for (const c of usedChips) {
    (usedEventsByName[c.name] ||= []).push(c.event);
  }

  const result = {};
  for (const [name, windows] of Object.entries(windowsByName)) {
    const total = windows.reduce((s, w) => s + w.number, 0);
    const usedEvents = (usedEventsByName[name] || []).slice().sort((a, b) => a - b);
    const usedCount = usedEvents.length;

    const openWindows = windows.filter((w) => {
      const usesInWindow = usedEvents.filter((e) => e >= w.startEvent && e <= w.stopEvent).length;
      return usesInWindow < w.number;
    });

    const remaining = Math.max(0, total - usedCount);
    let status;
    if (remaining === 0) status = "used_up";
    else if (currentEvent != null && !openWindows.some((w) => currentEvent >= w.startEvent && currentEvent <= w.stopEvent)) status = "not_yet_open";
    else status = "available";

    result[name] = { name, totalAvailableThisSeason: total, usedCount, remaining, usedInEvents: usedEvents, openWindows, status };
  }
  return result;
}

const DEFAULT_MAX_BANKED = 5;
const CHIP_NAMES_SUSPENDING_FT = new Set(["wildcard", "freehit", "3xc"]);

export function inferFreeTransfers(history, chips, maxBanked = DEFAULT_MAX_BANKED, startingFreeTransfers = 1) {
  const assumptions = [];
  if (!history?.length) {
    return { perGameweek: [], nextGameweekEstimate: null, confidence: 0, assumptions: ["No gameweek history available yet — cannot infer free transfers."] };
  }

  const sortedHistory = [...history].sort((a, b) => a.event - b.event);
  const chipByEvent = Object.fromEntries((chips || []).map((c) => [c.event, c.name]));

  const firstEvent = sortedHistory[0].event;
  if (firstEvent > 2) {
    assumptions.push(
      `History starts at GW${firstEvent}, not GW1/2 — assuming ${startingFreeTransfers} free transfer(s) ` +
      `entering that gameweek, which may not be correct if you joined mid-season.`
    );
  }

  const expectedEvents = [];
  for (let e = firstEvent; e <= sortedHistory[sortedHistory.length - 1].event; e++) expectedEvents.push(e);
  const actualEvents = new Set(sortedHistory.map((h) => h.event));
  const missing = expectedEvents.filter((e) => !actualEvents.has(e));
  if (missing.length) {
    assumptions.push(`Gaps in gameweek history at GW${missing.join(", ")} — the inference skips them, which can drift the count.`);
  }

  const perGameweek = [];
  let entering = startingFreeTransfers;
  const baseConfidence = missing.length ? 0.5 : 0.85;

  for (const gw of sortedHistory) {
    const made = gw.event_transfers || 0;
    const hitCost = gw.event_transfers_cost || 0;
    const chipActive = chipByEvent[gw.event] || null;

    perGameweek.push({ event: gw.event, freeTransfersEntering: entering, transfersMade: made, hitCost, chipActive, confidence: baseConfidence });

    if (CHIP_NAMES_SUSPENDING_FT.has(chipActive)) continue;
    const usedFree = Math.min(made, entering);
    entering = Math.min(maxBanked, entering - usedFree + 1);
  }

  if (missing.length) assumptions.push("Next-gameweek estimate carries the same uncertainty as the gap above.");

  return { perGameweek, nextGameweekEstimate: entering, confidence: baseConfidence, assumptions };
}
