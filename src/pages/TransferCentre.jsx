import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import { estimateExpectedPoints, upcomingFixturesForTeam, suggestReplacements } from "../lib/analytics.js";
import { getManagerId } from "../lib/storage.js";
import ManagerGate from "../components/ManagerGate.jsx";
import InfoBanner from "../components/InfoBanner.jsx";

export default function TransferCentre() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { profile, squad, seasonNotStarted, error, loading } = useManagerData(playersById);
  const [horizon, setHorizon] = useState(4);
  const [freeTransfers, setFreeTransfers] = useState(1);

  const bankM = profile?.last_deadline_bank != null ? profile.last_deadline_bank / 10 : 0;

  const expectedPointsById = useMemo(() => {
    const result = {};
    for (const p of players) {
      const upcoming = upcomingFixturesForTeam(fixtures, teamsById, p.team, horizon);
      result[p.id] = estimateExpectedPoints(p, gameweeksPlayed, upcoming);
    }
    return result;
  }, [players, fixtures, teamsById, gameweeksPlayed, horizon]);

  const suggestions = useMemo(() => {
    if (!squad.length) return [];
    return suggestReplacements(squad, players, expectedPointsById, bankM, freeTransfers, 6.0, 0.5, 3);
  }, [squad, players, expectedPointsById, bankM, freeTransfers]);

  const gate = ManagerGate({
    managerId: getManagerId(),
    loading,
    error,
    seasonNotStarted,
    hasData: squad.length > 0,
  });
  if (gate) {
    return (
      <div>
        <h1>🔄 Transfer Centre</h1>
        {gate}
      </div>
    );
  }

  return (
    <div>
      <h1>🔄 Transfer Centre</h1>
      <div className="card" style={{ display: "flex", gap: "1rem" }}>
        <label>
          Horizon:{" "}
          <input type="number" min="1" max="8" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </label>
        <label>
          Free transfers:{" "}
          <input type="number" min="0" max="5" value={freeTransfers} onChange={(e) => setFreeTransfers(Number(e.target.value))} />
        </label>
      </div>

      <InfoBanner title="ROLL TRANSFER" icon="💡">
        If nothing below clears the threshold, bank your free transfer and make no move this week.
      </InfoBanner>

      {suggestions.length === 0 ? (
        <div className="card">No transfer clears the minimum-gain threshold this week.</div>
      ) : (
        suggestions.slice(0, 10).map((s, i) => (
          <div className="card" key={i}>
            <p><strong>OUT:</strong> {s.playerOut.web_name} → <strong>IN:</strong> {s.playerIn.web_name}</p>
            <div className="metric-row">
              <div className="metric"><div className="label">Gain (before hit)</div><div className="value">{s.expectedGainBeforeHit > 0 ? "+" : ""}{s.expectedGainBeforeHit}</div></div>
              <div className="metric"><div className="label">Hit cost</div><div className="value">{s.hitCost ? `-${s.hitCost}` : "0"}</div></div>
              <div className="metric"><div className="label">Gain (after hit)</div><div className="value">{s.expectedGainAfterHit > 0 ? "+" : ""}{s.expectedGainAfterHit}</div></div>
            </div>
            <p className="muted">Cash impact: {s.cashDeltaM >= 0 ? "+" : ""}{s.cashDeltaM}m in the bank afterwards.</p>
          </div>
        ))
      )}
      <p className="muted">
        Covers single-transfer suggestions with budget/hit-cost math. Never auto-applied — you decide.
      </p>
    </div>
  );
}
