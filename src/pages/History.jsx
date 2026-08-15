import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData, useManagerHistoryAndTransfers } from "../lib/useManagerData.js";
import { estimatePointsForDraft, pickBestXi } from "../lib/analytics.js";
import { computeChipAvailability, inferFreeTransfers } from "../lib/chipEngine.js";
import { compareBenchBoostWindows, compareTripleCaptainWindows } from "../lib/chipTiming.js";
import { getManagerId } from "../lib/storage.js";
import ManagerGate from "../components/ManagerGate.jsx";
import InfoBanner from "../components/InfoBanner.jsx";

const STATUS_ICON = { available: "🟢", used_up: "⚫", not_yet_open: "🟡" };

export default function History() {
  const { players, teamsById, fixtures, events, chipRules, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { squad, seasonNotStarted, error: squadError, loading: squadLoading } = useManagerData(playersById);
  const { history, loading, error } = useManagerHistoryAndTransfers();
  const [chipChoice, setChipChoice] = useState("Bench Boost");

  const gate = ManagerGate({
    managerId: getManagerId(),
    loading: loading || squadLoading,
    error: error || squadError,
    seasonNotStarted,
    hasData: Boolean(history),
  });

  const upcomingGameweekIds = useMemo(
    () => events.filter((e) => !e.finished).slice(0, 6).map((e) => e.id),
    [events]
  );

  const expectedPointsById = useMemo(() => {
    const result = {};
    for (const p of squad) result[p.id] = estimatePointsForDraft(p, gameweeksPlayed, []);
    return result;
  }, [squad, gameweeksPlayed]);

  const selection = useMemo(
    () => (squad.length === 15 ? pickBestXi(squad, expectedPointsById) : null),
    [squad, expectedPointsById]
  );

  const chipWindows = useMemo(() => {
    if (!selection) return [];
    return chipChoice === "Bench Boost"
      ? compareBenchBoostWindows(selection.bench, teamsById, fixtures, upcomingGameweekIds, gameweeksPlayed)
      : compareTripleCaptainWindows(selection.starters, teamsById, fixtures, upcomingGameweekIds, gameweeksPlayed);
  }, [selection, chipChoice, teamsById, fixtures, upcomingGameweekIds, gameweeksPlayed]);

  if (gate) {
    return (
      <div>
        <h1>📜 History</h1>
        {gate}
      </div>
    );
  }

  const chipAvailability = computeChipAvailability(
    chipRules,
    history.chips || [],
    events.find((e) => e.is_current)?.id ?? null
  );

  const freeTransferInference = inferFreeTransfers(history.current || [], history.chips || []);

  return (
    <div>
      <h1>📜 History</h1>

      <div className="card">
        <h3>Gameweek history</h3>
        <table>
          <thead>
            <tr><th>GW</th><th>Points</th><th>Total</th><th>Rank</th><th>Overall rank</th><th>Bank</th><th>Value</th><th>Transfers</th><th>Bench pts</th></tr>
          </thead>
          <tbody>
            {(history.current || []).map((h) => (
              <tr key={h.event}>
                <td>{h.event}</td><td>{h.points}</td><td>{h.total_points}</td><td>{h.rank ?? "—"}</td>
                <td>{h.overall_rank ?? "—"}</td><td>£{(h.bank / 10).toFixed(1)}m</td><td>£{(h.value / 10).toFixed(1)}m</td>
                <td>{h.event_transfers}{h.event_transfers_cost ? ` (-${h.event_transfers_cost})` : ""}</td>
                <td>{h.points_on_bench}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Free transfers (calculated)</h3>
        {freeTransferInference.nextGameweekEstimate == null ? (
          <p className="muted">Not enough gameweek history yet to calculate.</p>
        ) : (
          <>
            <p>
              <strong>Next gameweek estimate: {freeTransferInference.nextGameweekEstimate}</strong>{" "}
              (confidence {Math.round(freeTransferInference.confidence * 100)}%)
            </p>
            {freeTransferInference.assumptions.map((a, i) => <p key={i} className="muted">{a}</p>)}
          </>
        )}
      </div>

      <div className="card">
        <h3>Chips used</h3>
        {!(history.chips || []).length ? (
          <p className="muted">No chips used yet this season.</p>
        ) : (
          <table>
            <thead><tr><th>Chip</th><th>Gameweek</th></tr></thead>
            <tbody>{history.chips.map((c, i) => <tr key={i}><td>{c.name}</td><td>{c.event}</td></tr>)}</tbody>
          </table>
        )}
        {Object.keys(chipAvailability).length > 0 && (
          <>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Availability (read from this season's own official chip rules, not hard-coded):
            </p>
            <table>
              <thead><tr><th>Chip</th><th>Status</th><th>Total this season</th><th>Used</th><th>Remaining</th></tr></thead>
              <tbody>
                {Object.entries(chipAvailability).map(([name, a]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{STATUS_ICON[a.status] || "⚪"} {a.status.replace("_", " ")}</td>
                    <td>{a.totalAvailableThisSeason}</td><td>{a.usedCount}</td><td>{a.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {selection && (
        <div className="card">
          <h3>Chip timing comparison</h3>
          <p className="muted">
            Ranks your next several gameweeks for Bench Boost/Triple Captain using the same expected-points
            model, scoped to one gameweek at a time. A genuine blank gameweek scores as a poor week, not a
            fallback estimate. Wildcard/Free Hit timing isn't compared this way — it would need re-solving an
            optimal squad at each hypothetical future gameweek.
          </p>
          <div className="flex-row">
            <button onClick={() => setChipChoice("Bench Boost")} disabled={chipChoice === "Bench Boost"}>Bench Boost</button>
            <button onClick={() => setChipChoice("Triple Captain")} disabled={chipChoice === "Triple Captain"}>Triple Captain</button>
          </div>
          {chipWindows.length === 0 ? (
            <p className="muted">No upcoming gameweeks found to compare.</p>
          ) : (
            <>
              <table>
                <thead><tr><th>Gameweek</th><th>Estimated value</th><th>Note</th></tr></thead>
                <tbody>{chipWindows.map((w) => <tr key={w.gameweek}><td>{w.gameweek}</td><td>{w.estimatedValue}</td><td>{w.note}</td></tr>)}</tbody>
              </table>
              <InfoBanner title="Best window so far" icon="🏆">
                GW{chipWindows[0].gameweek} — estimated {chipWindows[0].estimatedValue} pts. {chipWindows[0].note}
              </InfoBanner>
            </>
          )}
        </div>
      )}
    </div>
  );
}
