import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import {
  estimatePointsForDraft,
  upcomingFixturesForTeam,
  pickBestXi,
  computeTeamRating,
  positionName,
  explainPlayerPick,
} from "../lib/analytics.js";
import { getManagerId } from "../lib/storage.js";
import ManagerGate from "../components/ManagerGate.jsx";
import { classifySafety, SAFETY_ICON } from "../lib/recommendationSafety.js";
import { suggestRatingImprovements } from "../lib/ratingImprovements.js";

export default function MyTeam() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { squad, profile, seasonNotStarted, error, loading } = useManagerData(playersById);
  const bankM = profile?.last_deadline_bank != null ? profile.last_deadline_bank / 10 : 0;
  const [horizon, setHorizon] = useState(4);
  const [expandedId, setExpandedId] = useState(null);

  const upcomingByTeam = useMemo(() => {
    const cache = {};
    return (teamId) => (cache[teamId] ||= upcomingFixturesForTeam(fixtures, teamsById, teamId, horizon));
  }, [fixtures, teamsById, horizon]);

  const expectedPointsById = useMemo(() => {
    // Covers every player, not just the squad, so rating-improvement
    // suggestions below can evaluate any same-position replacement.
    const result = {};
    for (const p of players) {
      result[p.id] = estimatePointsForDraft(p, gameweeksPlayed, upcomingByTeam(p.team));
    }
    return result;
  }, [players, gameweeksPlayed, upcomingByTeam]);

  const selection = useMemo(
    () => (squad.length === 15 ? pickBestXi(squad, expectedPointsById) : null),
    [squad, expectedPointsById]
  );

  const rating = useMemo(
    () => (selection ? computeTeamRating(squad, selection.starters, selection.bench, expectedPointsById, gameweeksPlayed, fixtures, teamsById, horizon) : null),
    [selection, squad, expectedPointsById, gameweeksPlayed, fixtures, teamsById, horizon]
  );

  const safety = useMemo(() => {
    if (!selection) return null;
    const confidences = selection.starters.map((p) => expectedPointsById[p.id]?.confidence ?? 0);
    const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    return classifySafety(avgConfidence, gameweeksPlayed);
  }, [selection, expectedPointsById, gameweeksPlayed]);

  const ratingImprovements = useMemo(() => {
    if (squad.length !== 15) return { suggestions: [] };
    return suggestRatingImprovements({
      squad, allPlayers: players, expectedPointsById, budgetRemainingM: bankM, maxPerClub: 3,
      gameweeksPlayed, fixtures, teamsById, horizon,
    });
  }, [squad, players, expectedPointsById, bankM, gameweeksPlayed, fixtures, teamsById, horizon]);

  // ManagerGate has no hooks of its own, so calling it directly (rather
  // than rendering <ManagerGate/>) lets us check whether it actually has
  // something to show before deciding whether to short-circuit the page.
  const gate = ManagerGate({
    managerId: getManagerId(),
    loading,
    error,
    seasonNotStarted,
    hasData: Boolean(selection),
  });
  if (gate) {
    return (
      <div>
        <h1>📋 My Team</h1>
        {gate}
      </div>
    );
  }

  const renderRow = (p) => {
    const expanded = expandedId === p.id;
    return (
      <React.Fragment key={p.id}>
        <tr>
          <td>{p.web_name}</td>
          <td>{positionName(p.element_type)}</td>
          <td>{teamsById[p.team]?.short_name}</td>
          <td>£{(p.now_cost / 10).toFixed(1)}m</td>
          <td>{expectedPointsById[p.id]?.central.toFixed(1)}</td>
          <td>{p.status}</td>
          <td><button onClick={() => setExpandedId(expanded ? null : p.id)}>{expanded ? "Hide" : "Why?"}</button></td>
        </tr>
        {expanded && (
          <tr>
            <td colSpan={7} style={{ background: "rgba(79,140,255,0.06)" }}>
              <ul style={{ margin: "0.4rem 0" }}>
                {explainPlayerPick(p, teamsById[p.team], upcomingByTeam(p.team), expectedPointsById[p.id], gameweeksPlayed).map((r, i) => (
                  <li key={i} className="muted" style={{ fontSize: "0.85rem" }}>{r}</li>
                ))}
              </ul>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div>
      <h1>📋 My Team</h1>
      <label>
        Planning horizon (gameweeks):{" "}
        <input type="number" min="1" max="8" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
      </label>

      <div className="card">
        <h2>
          Team rating: {rating.overall.toFixed(0)} / 100
          {safety && <span style={{ fontSize: "0.9rem", marginLeft: "0.6rem" }}>{SAFETY_ICON[safety.label]} {safety.label}</span>}
        </h2>
        {safety && <p className="muted">{safety.reason}</p>}
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
        <h3>How to raise your rating — swap options (within budget)</h3>
        <p className="muted">
          For each swappable squad player, the best same-position, affordable replacement that actually
          raises your team rating — not just expected points. Only genuine improvements are shown.
        </p>
        {ratingImprovements.suggestions.length === 0 ? (
          <p className="muted">No affordable same-position swap raises your rating right now — your squad is well-optimised for its budget.</p>
        ) : (
          ratingImprovements.suggestions.map((s, i) => (
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
              <p className="muted">Cash impact: {s.cashDeltaM >= 0 ? "+" : ""}{s.cashDeltaM}m in the bank afterwards.</p>
              {s.componentDiffs.length > 0 && (
                <p>
                  <strong>Why:</strong>{" "}
                  {s.componentDiffs.map((d, j) => (
                    <span key={j}>{d.label} {d.delta > 0 ? "+" : ""}{d.delta}{j < s.componentDiffs.length - 1 ? ", " : ""}</span>
                  ))}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Recommended starting XI — formation {selection.formation}</h3>
        <table>
          <thead>
            <tr>
              <th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Expected pts</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>{selection.starters.map(renderRow)}</tbody>
        </table>
      </div>

      <div className="card">
        <h3>Bench (in play order)</h3>
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th>Club</th><th>Price</th><th>Expected pts</th><th>Status</th><th></th></tr></thead>
          <tbody>{selection.bench.map(renderRow)}</tbody>
        </table>
      </div>
      <p className="muted">
        Starting XI/bench order is a greedy expected-points heuristic, not a full constraint solver.
        Never auto-applied to your real FPL team. Click "Why?" on any player for the full reasoning
        behind their projection (price, form, fixtures, team strength).
      </p>
    </div>
  );
}
