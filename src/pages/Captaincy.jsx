import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import {
  estimatePointsForDraft,
  upcomingFixturesForTeam,
  pickBestXi,
  rankCaptains,
  safestCaptain,
  highestUpsideCaptain,
  explainPlayerPick,
} from "../lib/analytics.js";
import { getManagerId } from "../lib/storage.js";
import ManagerGate from "../components/ManagerGate.jsx";

export default function Captaincy() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { squad, seasonNotStarted, error, loading } = useManagerData(playersById);
  const [horizon, setHorizon] = useState(4);
  const [expandedId, setExpandedId] = useState(null);

  const upcomingByTeam = useMemo(() => {
    const cache = {};
    return (teamId) => (cache[teamId] ||= upcomingFixturesForTeam(fixtures, teamsById, teamId, horizon));
  }, [fixtures, teamsById, horizon]);

  const expectedPointsById = useMemo(() => {
    const result = {};
    for (const p of squad) {
      result[p.id] = estimatePointsForDraft(p, gameweeksPlayed, upcomingByTeam(p.team));
    }
    return result;
  }, [squad, gameweeksPlayed, upcomingByTeam]);

  const selection = useMemo(
    () => (squad.length === 15 ? pickBestXi(squad, expectedPointsById) : null),
    [squad, expectedPointsById]
  );

  const options = useMemo(
    () => (selection ? rankCaptains(selection.starters, expectedPointsById, gameweeksPlayed) : []),
    [selection, expectedPointsById, gameweeksPlayed]
  );

  const gate = ManagerGate({
    managerId: getManagerId(),
    loading,
    error,
    seasonNotStarted,
    hasData: options.length > 0,
  });
  if (gate) {
    return (
      <div>
        <h1>👑 Captaincy</h1>
        {gate}
      </div>
    );
  }

  const safest = safestCaptain(options);
  const upside = highestUpsideCaptain(options);

  return (
    <div>
      <h1>👑 Captaincy</h1>
      <label>
        Horizon (gameweeks):{" "}
        <input type="number" min="1" max="8" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
      </label>

      <div className="metric-row">
        <div className="card" style={{ flex: 1 }}>
          <h3>Safest captain</h3>
          {safest && (
            <>
              <p><strong>{safest.player.web_name}</strong> — expected {safest.expectedPoints.toFixed(1)} pts (security {safest.security.toFixed(0)}/100)</p>
              <p className="muted">{safest.riskNote}</p>
            </>
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3>Highest-upside captain</h3>
          {upside && (
            <>
              <p><strong>{upside.player.web_name}</strong> — ceiling {upside.ceiling.toFixed(1)} pts (central {upside.expectedPoints.toFixed(1)})</p>
              <p className="muted">{upside.riskNote}</p>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Full ranking</h3>
        <table>
          <thead><tr><th>Player</th><th>Expected pts</th><th>Floor</th><th>Ceiling</th><th>Security</th><th>Risk note</th><th></th></tr></thead>
          <tbody>
            {options.map((o) => {
              const expanded = expandedId === o.player.id;
              return (
                <React.Fragment key={o.player.id}>
                  <tr>
                    <td>{o.player.web_name}</td>
                    <td>{o.expectedPoints.toFixed(1)}</td>
                    <td>{o.floor.toFixed(1)}</td>
                    <td>{o.ceiling.toFixed(1)}</td>
                    <td>{o.security.toFixed(0)}/100</td>
                    <td>{o.riskNote}</td>
                    <td><button onClick={() => setExpandedId(expanded ? null : o.player.id)}>{expanded ? "Hide" : "Why?"}</button></td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} style={{ background: "rgba(79,140,255,0.06)" }}>
                        <ul style={{ margin: "0.4rem 0" }}>
                          {explainPlayerPick(o.player, teamsById[o.player.team], upcomingByTeam(o.player.team), expectedPointsById[o.player.id], gameweeksPlayed).map((r, i) => (
                            <li key={i} className="muted" style={{ fontSize: "0.85rem" }}>{r}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">No player is guaranteed to start or score.</p>
    </div>
  );
}
