import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { positionName } from "../lib/analytics.js";

export default function PlayerExplorer() {
  const { players, teamsById, loading } = useFplData();
  const [positionFilter, setPositionFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState(15);
  const [sortBy, setSortBy] = useState("total_points");

  const rows = useMemo(() => {
    return players
      .filter((p) => positionFilter === "All" || positionName(p.element_type) === positionFilter)
      .filter((p) => p.now_cost / 10 <= maxPrice)
      .map((p) => ({
        ...p,
        pointsPerMillion: p.now_cost ? Math.round((p.total_points / (p.now_cost / 10)) * 100) / 100 : 0,
      }))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [players, positionFilter, maxPrice, sortBy]);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1>🔍 Player Explorer</h1>
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
            <option value="total_points">Total points</option>
            <option value="form">Form</option>
            <option value="pointsPerMillion">Points/£m</option>
            <option value="now_cost">Price</option>
            <option value="minutes">Minutes</option>
          </select>
        </label>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Total pts</th><th>Form</th><th>Pts/£m</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((p) => (
              <tr key={p.id}>
                <td>{p.web_name}</td>
                <td>{positionName(p.element_type)}</td>
                <td>{teamsById[p.team]?.short_name}</td>
                <td>£{(p.now_cost / 10).toFixed(1)}m</td>
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
