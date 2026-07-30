import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { positionName } from "../lib/analytics.js";
import InfoBanner from "../components/InfoBanner.jsx";

const POSITIONS = ["GKP", "DEF", "MID", "FWD"];

export default function PlayerExplorer() {
  const { players, teamsById, gameweeksPlayed, loading } = useFplData();
  const [positionFilter, setPositionFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState(15);
  const [sortBy, setSortBy] = useState("epNext");

  const withMetrics = useMemo(
    () =>
      players.map((p) => ({
        ...p,
        epNext: Number(p.ep_next) || 0,
        pointsPerMillion: p.now_cost ? Math.round((p.total_points / (p.now_cost / 10)) * 100) / 100 : 0,
      })),
    [players]
  );

  const topPicksByPosition = useMemo(() => {
    const result = {};
    for (const pos of POSITIONS) {
      result[pos] = withMetrics
        .filter((p) => positionName(p.element_type) === pos && p.status === "a")
        .sort((a, b) => b.epNext - a.epNext)
        .slice(0, 5);
    }
    return result;
  }, [withMetrics]);

  const rows = useMemo(() => {
    return withMetrics
      .filter((p) => positionFilter === "All" || positionName(p.element_type) === positionFilter)
      .filter((p) => p.now_cost / 10 <= maxPrice)
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [withMetrics, positionFilter, maxPrice, sortBy]);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1>🔍 Player Explorer</h1>

      <InfoBanner title="Buy suggestions, ranked by FPL's own next-gameweek projection" icon="💰">
        {gameweeksPlayed === 0
          ? "The season hasn't started, so there's no real recent form yet — these rankings use FPL's own official " +
            '"expected points next gameweek" figure (ep_next) plus last season\'s total points, not our own model ' +
            "(which needs actual matches played to say anything meaningful). Treat this as a starting point for your " +
            "initial squad, not a guarantee."
          : "Ranked by FPL's own official \"expected points next gameweek\" figure. No player is guaranteed to start or score."}
      </InfoBanner>

      <div className="metric-row" style={{ alignItems: "stretch" }}>
        {POSITIONS.map((pos) => (
          <div className="card" style={{ flex: 1, minWidth: 220 }} key={pos}>
            <h4 style={{ marginTop: 0 }}>Top {pos} picks</h4>
            <table>
              <thead><tr><th>Player</th><th>Club</th><th>Price</th><th>Next GW</th></tr></thead>
              <tbody>
                {topPicksByPosition[pos].map((p) => (
                  <tr key={p.id}>
                    <td>{p.web_name}</td>
                    <td>{teamsById[p.team]?.short_name}</td>
                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                    <td>{p.epNext.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <label>
          Position:{" "}
          <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            <option>All</option><option>GKP</option><option>DEF</option><option>MID</option><option>FWD</option>
          </select>
        </label>
        <label>
          Max price: £{maxPrice}m{" "}
          <input type="range" min="3.5" max="15" step="0.5" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
        </label>
        <label>
          Sort by:{" "}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="epNext">Next GW projection</option>
            <option value="total_points">Total points (last season)</option>
            <option value="form">Form</option>
            <option value="pointsPerMillion">Points/£m (last season)</option>
            <option value="now_cost">Price</option>
            <option value="minutes">Minutes (last season)</option>
          </select>
        </label>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Next GW</th><th>Total pts (last season)</th><th>Form</th><th>Pts/£m</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((p) => (
              <tr key={p.id}>
                <td>{p.web_name}</td>
                <td>{positionName(p.element_type)}</td>
                <td>{teamsById[p.team]?.short_name}</td>
                <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                <td>{p.epNext.toFixed(1)}</td>
                <td>{p.total_points}</td>
                <td>{p.form}</td>
                <td>{p.pointsPerMillion}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">{rows.length} players match your filters (showing up to 200).</p>
      </div>
    </div>
  );
}
