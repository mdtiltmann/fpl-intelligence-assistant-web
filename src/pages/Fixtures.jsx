import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { upcomingFixturesForTeam } from "../lib/analytics.js";

export default function Fixtures() {
  const { teams, teamsById, fixtures, loading } = useFplData();
  const [teamId, setTeamId] = useState(null);
  const [horizon, setHorizon] = useState(5);

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);
  const selectedTeamId = teamId || sortedTeams[0]?.id;

  const upcoming = useMemo(
    () => (selectedTeamId ? upcomingFixturesForTeam(fixtures, teamsById, selectedTeamId, horizon) : []),
    [fixtures, teamsById, selectedTeamId, horizon]
  );

  if (loading) return <p>Loading…</p>;

  const avgDifficulty = upcoming.length
    ? (upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length).toFixed(2)
    : "—";

  return (
    <div>
      <h1>📅 Fixtures</h1>
      <div className="card" style={{ display: "flex", gap: "1rem" }}>
        <label>
          Club:{" "}
          <select value={selectedTeamId || ""} onChange={(e) => setTeamId(Number(e.target.value))}>
            {sortedTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          Horizon:{" "}
          <input type="number" min="1" max="10" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </label>
      </div>
      <div className="card">
        <p>Average official difficulty: <strong>{avgDifficulty}</strong></p>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming fixtures found in this horizon.</p>
        ) : (
          <table>
            <thead><tr><th>Gameweek</th><th>Opponent</th><th>Venue</th><th>Official difficulty</th><th>Calculated difficulty</th></tr></thead>
            <tbody>
              {upcoming.map((f, i) => (
                <tr key={i}>
                  <td>{f.event ?? "—"}</td>
                  <td>{f.opponentShortName}</td>
                  <td>{f.isHome ? "Home" : "Away"}</td>
                  <td>{f.difficulty}</td>
                  <td>{f.calculatedDifficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
