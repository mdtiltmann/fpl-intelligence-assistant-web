import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import {
  estimateExpectedPoints,
  upcomingFixturesForTeam,
  pickBestXi,
  computeTeamRating,
  positionName,
} from "../lib/analytics.js";
import { getManagerId } from "../lib/storage.js";

export default function MyTeam() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { squad, warning, error, loading } = useManagerData(playersById);
  const [horizon, setHorizon] = useState(4);

  const expectedPointsById = useMemo(() => {
    const result = {};
    for (const p of squad) {
      const upcoming = upcomingFixturesForTeam(fixtures, teamsById, p.team, horizon);
      result[p.id] = estimateExpectedPoints(p, gameweeksPlayed, upcoming);
    }
    return result;
  }, [squad, fixtures, teamsById, gameweeksPlayed, horizon]);

  const selection = useMemo(
    () => (squad.length === 15 ? pickBestXi(squad, expectedPointsById) : null),
    [squad, expectedPointsById]
  );

  const rating = useMemo(
    () => (selection ? computeTeamRating(squad, selection.starters, selection.bench, expectedPointsById, gameweeksPlayed) : null),
    [selection, squad, expectedPointsById, gameweeksPlayed]
  );

  if (!getManagerId()) {
    return <p>Set your manager ID on the Home page first.</p>;
  }
  if (loading) return <p>Loading…</p>;
  if (error) return <p className="warning">{error}</p>;
  if (warning) return <p className="warning">{warning}</p>;
  if (!selection) return <p>No squad picks found yet.</p>;

  return (
    <div>
      <h1>📋 My Team</h1>
      <label>
        Planning horizon (gameweeks):{" "}
        <input type="number" min="1" max="8" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
      </label>

      <div className="card">
        <h2>Team rating: {rating.overall.toFixed(0)} / 100</h2>
        <details>
          <summary>How this was calculated</summary>
          {rating.components.map((c) => (
            <p key={c.key}>
              <strong>{c.label}</strong>: {c.score.toFixed(0)}/100 (weight {(c.weight * 100).toFixed(0)}%) — {c.explanation}
            </p>
          ))}
        </details>
      </div>

      <div className="card">
        <h3>Recommended starting XI — formation {selection.formation}</h3>
        <table>
          <thead>
            <tr>
              <th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Expected pts</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {selection.starters.map((p) => (
              <tr key={p.id}>
                <td>{p.web_name}</td>
                <td>{positionName(p.element_type)}</td>
                <td>{teamsById[p.team]?.short_name}</td>
                <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                <td>{expectedPointsById[p.id]?.central.toFixed(1)}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Bench (in play order)</h3>
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th>Expected pts</th><th>Status</th></tr></thead>
          <tbody>
            {selection.bench.map((p) => (
              <tr key={p.id}>
                <td>{p.web_name}</td>
                <td>{positionName(p.element_type)}</td>
                <td>{expectedPointsById[p.id]?.central.toFixed(1)}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Starting XI/bench order is a greedy expected-points heuristic, not a full constraint solver.
        Never auto-applied to your real FPL team.
      </p>
    </div>
  );
}
