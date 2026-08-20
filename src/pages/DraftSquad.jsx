import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import {
  positionName,
  estimatePointsForDraft,
  upcomingFixturesForTeam,
  autoFillDraftSquad,
  pickBestXi,
  computeTeamRating,
  rankCaptains,
  safestCaptain,
  highestUpsideCaptain,
  explainPlayerPick,
} from "../lib/analytics.js";
import InfoBanner from "../components/InfoBanner.jsx";
import { suggestRatingImprovements } from "../lib/ratingImprovements.js";

const SQUAD_SHAPE = { 1: 2, 2: 5, 3: 5, 4: 3 };
const POSITIONS = [1, 2, 3, 4];

export default function DraftSquad() {
  const { players, teamsById, fixtures, gameweeksPlayed, loading } = useFplData();
  const [budget, setBudget] = useState(100);
  const [maxPerClub, setMaxPerClub] = useState(3);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addPosition, setAddPosition] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [horizon] = useState(4);

  const estimatesById = useMemo(() => {
    const result = {};
    for (const p of players) {
      const upcoming = upcomingFixturesForTeam(fixtures, teamsById, p.team, horizon);
      result[p.id] = estimatePointsForDraft(p, gameweeksPlayed, upcoming);
    }
    return result;
  }, [players, fixtures, teamsById, gameweeksPlayed, horizon]);

  const squad = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean),
    [selectedIds, players]
  );

  const totalCost = squad.reduce((s, p) => s + p.now_cost, 0) / 10;
  const remaining = Math.round((budget - totalCost) * 10) / 10;
  const positionCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const clubCounts = {};
  for (const p of squad) {
    positionCounts[p.element_type]++;
    clubCounts[p.team] = (clubCounts[p.team] || 0) + 1;
  }
  const maxClubCount = Math.max(0, ...Object.values(clubCounts));
  const isComplete = squad.length === 15;
  const isLegal =
    isComplete &&
    remaining >= 0 &&
    maxClubCount <= maxPerClub &&
    POSITIONS.every((pos) => positionCounts[pos] === SQUAD_SHAPE[pos]);

  const candidates = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return players
      .filter((p) => !selectedSet.has(p.id))
      .filter((p) => addPosition === "All" || positionName(p.element_type) === addPosition)
      .filter((p) => !search || p.web_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (estimatesById[b.id]?.central || 0) - (estimatesById[a.id]?.central || 0))
      .slice(0, 30);
  }, [players, selectedIds, addPosition, search, estimatesById]);

  const canAdd = (p) => {
    if (squad.length >= 15) return false;
    if (positionCounts[p.element_type] >= SQUAD_SHAPE[p.element_type]) return false;
    if ((clubCounts[p.team] || 0) >= maxPerClub) return false;
    if (p.now_cost / 10 > remaining) return false;
    return true;
  };

  const addPlayer = (id) => setSelectedIds((prev) => [...prev, id]);
  const removePlayer = (id) => setSelectedIds((prev) => prev.filter((x) => x !== id));
  const clearSquad = () => setSelectedIds([]);

  const autoFill = () => {
    const excludeIds = new Set(selectedIds);
    const additions = autoFillDraftSquad(
      players.filter((p) => !excludeIds.has(p.id) && positionCounts[p.element_type] < SQUAD_SHAPE[p.element_type]),
      estimatesById,
      remaining,
      maxPerClub,
      excludeIds
    );
    // autoFillDraftSquad fills a fresh 15; when topping up a partial squad
    // we only want as many as are actually still needed per position.
    const stillNeeded = { ...SQUAD_SHAPE };
    for (const pos of POSITIONS) stillNeeded[pos] -= positionCounts[pos];
    const picked = [];
    const localCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of additions) {
      if (localCounts[p.element_type] >= stillNeeded[p.element_type]) continue;
      picked.push(p.id);
      localCounts[p.element_type]++;
    }
    setSelectedIds((prev) => [...prev, ...picked]);
  };

  const selection = useMemo(
    () => (isComplete ? pickBestXi(squad, estimatesById) : null),
    [isComplete, squad, estimatesById]
  );
  const rating = useMemo(
    () =>
      selection
        ? computeTeamRating(squad, selection.starters, selection.bench, estimatesById, gameweeksPlayed, fixtures, teamsById, horizon)
        : null,
    [selection, squad, estimatesById, gameweeksPlayed, fixtures, teamsById, horizon]
  );
  const captains = useMemo(
    () => (selection ? rankCaptains(selection.starters, estimatesById, gameweeksPlayed) : []),
    [selection, estimatesById, gameweeksPlayed]
  );

  const ratingImprovements = useMemo(() => {
    if (!isLegal) return { suggestions: [] };
    return suggestRatingImprovements({
      squad, allPlayers: players, expectedPointsById: estimatesById, budgetRemainingM: remaining, maxPerClub,
      gameweeksPlayed, fixtures, teamsById, horizon,
    });
  }, [isLegal, squad, players, estimatesById, remaining, maxPerClub, gameweeksPlayed, fixtures, teamsById, horizon]);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1>🧪 Draft Squad</h1>
      <InfoBanner title="Plan your opening-day squad" icon="🧪">
        Build a full 15-player squad from scratch (no manager ID needed) and get an instant rating —
        useful for deciding your opening-day team before the season locks in your real squad.
      </InfoBanner>

      <div className="card" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <label>Budget: £<input type="number" step="0.5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: 70 }} />m</label>
        <label>Max per club: <input type="number" min="1" max="15" value={maxPerClub} onChange={(e) => setMaxPerClub(Number(e.target.value))} style={{ width: 50 }} /></label>
        <button onClick={autoFill} disabled={squad.length >= 15}>✨ Auto-suggest remaining players</button>
        <button onClick={clearSquad} disabled={!squad.length}>Clear squad</button>
      </div>

      <div className="metric-row">
        <div className="metric"><div className="label">Squad</div><div className="value">{squad.length}/15</div></div>
        <div className="metric"><div className="label">Spent</div><div className="value">£{totalCost.toFixed(1)}m</div></div>
        <div className="metric"><div className="label">Remaining</div><div className="value">£{remaining.toFixed(1)}m</div></div>
        <div className="metric"><div className="label">Max from one club</div><div className="value">{maxClubCount}</div></div>
      </div>
      {isComplete && !isLegal && (
        <p className="warning">
          ⚠️ This squad isn't legal yet — check position counts ({POSITIONS.map((p) => `${positionName(p)}: ${positionCounts[p]}/${SQUAD_SHAPE[p]}`).join(", ")}),
          budget, and the {maxPerClub}-per-club limit.
        </p>
      )}

      <div className="card">
        <h3>Your squad</h3>
        {squad.length === 0 ? (
          <p className="muted">No players yet — add some below or click "Auto-suggest remaining players".</p>
        ) : (
          <table>
            <thead><tr><th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Projection</th><th></th></tr></thead>
            <tbody>
              {squad.map((p) => (
                <tr key={p.id}>
                  <td>{p.web_name}</td>
                  <td>{positionName(p.element_type)}</td>
                  <td>{teamsById[p.team]?.short_name}</td>
                  <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                  <td>{estimatesById[p.id]?.central.toFixed(1)}</td>
                  <td><button onClick={() => removePlayer(p.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isLegal && rating && (
        <div className="card">
          <h2>Squad rating: {rating.overall.toFixed(0)} / 100</h2>
          <details>
            <summary>How this was calculated</summary>
            {rating.components.map((c) => (
              <p key={c.key}>
                <strong>{c.label}</strong>: {c.score.toFixed(0)}/100 (weight {(c.weight * 100).toFixed(0)}%) — {c.explanation}
              </p>
            ))}
          </details>
          <p className="muted">Formation: {selection.formation}</p>
          {captains.length > 0 && (
            <p className="muted">
              Best captain option: <strong>{captains[0].player.web_name}</strong> ({captains[0].expectedPoints.toFixed(1)} pts) —
              safest: {safestCaptain(captains)?.player.web_name}, highest upside: {highestUpsideCaptain(captains)?.player.web_name}.
            </p>
          )}
        </div>
      )}

      {isLegal && ratingImprovements.suggestions.length > 0 && (
        <div className="card">
          <h3>How to raise your rating — swap options (within budget)</h3>
          <p className="muted">
            For each swappable squad player, the best same-position, affordable replacement that actually
            raises your team rating — not just expected points. Only genuine improvements are shown.
          </p>
          {ratingImprovements.suggestions.map((s, i) => (
            <div key={i} className="card" style={{ background: "rgba(79,140,255,0.06)" }}>
              <p>
                <strong>OUT:</strong> {s.playerOut.web_name} → <strong>IN:</strong> {s.playerIn.web_name}{" "}
                (£{(s.playerIn.now_cost / 10).toFixed(1)}m)
              </p>
              <div className="metric-row">
                <div className="metric"><div className="label">Rating before</div><div className="value">{s.ratingBefore.toFixed(0)}</div></div>
                <div className="metric"><div className="label">Rating after</div><div className="value">{s.ratingAfter.toFixed(0)}</div></div>
                <div className="metric"><div className="label">Change</div><div className="value">+{s.ratingDelta.toFixed(1)}</div></div>
              </div>
              <p className="muted">Cash impact: {s.cashDeltaM >= 0 ? "+" : ""}{s.cashDeltaM}m of budget remaining afterwards.</p>
              {s.componentDiffs.length > 0 && (
                <p>
                  <strong>Why:</strong>{" "}
                  {s.componentDiffs.map((d, j) => (
                    <span key={j}>{d.label} {d.delta > 0 ? "+" : ""}{d.delta}{j < s.componentDiffs.length - 1 ? ", " : ""}</span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Add players</h3>
        <div className="flex-row" style={{ marginBottom: "0.75rem" }}>
          <select value={addPosition} onChange={(e) => setAddPosition(e.target.value)}>
            <option>All</option><option>GKP</option><option>DEF</option><option>MID</option><option>FWD</option>
          </select>
          <input placeholder="Search player name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        </div>
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Projection</th><th></th><th></th></tr></thead>
          <tbody>
            {candidates.map((p) => {
              const addable = canAdd(p);
              const upcoming = upcomingFixturesForTeam(fixtures, teamsById, p.team, horizon);
              const expanded = expandedId === p.id;
              return (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>{p.web_name}</td>
                    <td>{positionName(p.element_type)}</td>
                    <td>{teamsById[p.team]?.short_name}</td>
                    <td>£{(p.now_cost / 10).toFixed(1)}m</td>
                    <td>{estimatesById[p.id]?.central.toFixed(1)}</td>
                    <td><button onClick={() => setExpandedId(expanded ? null : p.id)}>{expanded ? "Hide" : "Why?"}</button></td>
                    <td><button onClick={() => addPlayer(p.id)} disabled={!addable}>Add</button></td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={7} style={{ background: "rgba(79,140,255,0.06)" }}>
                        <ul style={{ margin: "0.4rem 0" }}>
                          {explainPlayerPick(p, teamsById[p.team], upcoming, estimatesById[p.id], gameweeksPlayed).map((r, i) => (
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

      <p className="muted">
        Auto-suggest is a greedy heuristic (not a full optimiser) — a fast starting point to refine by hand,
        not a guaranteed-optimal squad. Never auto-applied to your real FPL team.
      </p>
    </div>
  );
}
