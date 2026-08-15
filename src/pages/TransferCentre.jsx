import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import {
  estimatePointsForDraft,
  upcomingFixturesForTeam,
  suggestReplacements,
  suggestMultiTransfers,
  explainPlayerPick,
  analyzeFixtureSwing,
  detectFormDrop,
} from "../lib/analytics.js";
import { getManagerId } from "../lib/storage.js";
import ManagerGate from "../components/ManagerGate.jsx";
import InfoBanner from "../components/InfoBanner.jsx";
import { classifySafety, SAFETY_ICON } from "../lib/recommendationSafety.js";

const WATCHLIST_HORIZON = 8; // longer lookahead than the main horizon, so a swing 5-6 GWs out is still caught

export default function TransferCentre() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { profile, squad, seasonNotStarted, error, loading } = useManagerData(playersById);
  const [horizon, setHorizon] = useState(4);
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const bankM = profile?.last_deadline_bank != null ? profile.last_deadline_bank / 10 : 0;

  const upcomingByTeam = useMemo(() => {
    const cache = {};
    return (teamId) => (cache[teamId] ||= upcomingFixturesForTeam(fixtures, teamsById, teamId, horizon));
  }, [fixtures, teamsById, horizon]);

  const upcomingByTeamLong = useMemo(() => {
    const cache = {};
    return (teamId) => (cache[teamId] ||= upcomingFixturesForTeam(fixtures, teamsById, teamId, WATCHLIST_HORIZON));
  }, [fixtures, teamsById]);

  const expectedPointsById = useMemo(() => {
    const result = {};
    for (const p of players) {
      result[p.id] = estimatePointsForDraft(p, gameweeksPlayed, upcomingByTeam(p.team));
    }
    return result;
  }, [players, gameweeksPlayed, upcomingByTeam]);

  const suggestions = useMemo(() => {
    if (!squad.length) return [];
    return suggestReplacements(squad, players, expectedPointsById, bankM, freeTransfers, 6.0, 0.5, 3);
  }, [squad, players, expectedPointsById, bankM, freeTransfers]);

  const doubleSuggestions = useMemo(() => {
    if (!squad.length) return [];
    return suggestMultiTransfers(squad, players, expectedPointsById, bankM, freeTransfers, 6.0, 0.5, 3, 2);
  }, [squad, players, expectedPointsById, bankM, freeTransfers]);

  const tripleSuggestions = useMemo(() => {
    if (!squad.length) return [];
    return suggestMultiTransfers(squad, players, expectedPointsById, bankM, freeTransfers, 6.0, 0.5, 3, 3);
  }, [squad, players, expectedPointsById, bankM, freeTransfers]);

  const watchlist = useMemo(() => {
    return squad
      .map((p) => {
        const swing = analyzeFixtureSwing(upcomingByTeamLong(p.team));
        const formDrop = detectFormDrop(p, gameweeksPlayed);
        return { player: p, swing, formDrop };
      })
      .filter((w) => w.swing.direction === "worsens" || w.formDrop.isDropping);
  }, [squad, upcomingByTeamLong, gameweeksPlayed]);

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
      <div className="card flex-row">
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

      {watchlist.length > 0 && (
        <div className="card">
          <h3>⏰ Watchlist — sell timing signals</h3>
          <p className="muted">
            Players with no immediate swap suggested below, but a fixture swing or a real form decline worth
            planning around over the next {WATCHLIST_HORIZON} gameweeks.
          </p>
          {watchlist.map(({ player, swing, formDrop }) => (
            <div key={player.id} style={{ marginBottom: "0.6rem" }}>
              <strong>{player.web_name}</strong> ({teamsById[player.team]?.short_name})
              {swing.direction === "worsens" && <div className="muted">{swing.note}</div>}
              {formDrop.isDropping && <div className="muted">{formDrop.note}</div>}
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="card">No transfer clears the minimum-gain threshold this week.</div>
      ) : (
        suggestions.slice(0, 10).map((s, i) => {
          const expanded = expandedIndex === i;
          const outUpcoming = upcomingByTeam(s.playerOut.team);
          const outSwing = analyzeFixtureSwing(upcomingByTeamLong(s.playerOut.team));
          const outFormDrop = detectFormDrop(s.playerOut, gameweeksPlayed);
          const outReasons = explainPlayerPick(
            s.playerOut, teamsById[s.playerOut.team], outUpcoming, expectedPointsById[s.playerOut.id], gameweeksPlayed
          );
          const inReasons = explainPlayerPick(
            s.playerIn, teamsById[s.playerIn.team], upcomingByTeam(s.playerIn.team), expectedPointsById[s.playerIn.id], gameweeksPlayed
          );
          return (
            <div className="card" key={i}>
              <p><strong>OUT:</strong> {s.playerOut.web_name} → <strong>IN:</strong> {s.playerIn.web_name}</p>
              <div className="metric-row">
                <div className="metric"><div className="label">Gain (before hit)</div><div className="value">{s.expectedGainBeforeHit > 0 ? "+" : ""}{s.expectedGainBeforeHit}</div></div>
                <div className="metric"><div className="label">Hit cost</div><div className="value">{s.hitCost ? `-${s.hitCost}` : "0"}</div></div>
                <div className="metric"><div className="label">Gain (after hit)</div><div className="value">{s.expectedGainAfterHit > 0 ? "+" : ""}{s.expectedGainAfterHit}</div></div>
              </div>
              <p className="muted">Cash impact: {s.cashDeltaM >= 0 ? "+" : ""}{s.cashDeltaM}m in the bank afterwards.</p>
              {(() => {
                const conf = Math.min(expectedPointsById[s.playerOut.id]?.confidence ?? 0, expectedPointsById[s.playerIn.id]?.confidence ?? 0);
                const safety = classifySafety(conf, gameweeksPlayed);
                return <p className="muted">{SAFETY_ICON[safety.label]} {safety.label} — {safety.reason}</p>;
              })()}
              {(outSwing.direction === "worsens" || outFormDrop.isDropping) && (
                <InfoBanner title="Timing signal" icon="⏰">
                  {outSwing.direction === "worsens" && <div>{outSwing.note}</div>}
                  {outFormDrop.isDropping && <div>{outFormDrop.note}</div>}
                </InfoBanner>
              )}
              <button onClick={() => setExpandedIndex(expanded ? null : i)}>
                {expanded ? "Hide detailed reasoning" : "Why sell / why buy?"}
              </button>
              {expanded && (
                <div className="metric-row" style={{ marginTop: "0.75rem" }}>
                  <div className="card" style={{ flex: 1 }}>
                    <strong>Why sell {s.playerOut.web_name}</strong>
                    <ul>{outReasons.map((r, j) => <li key={j} className="muted" style={{ fontSize: "0.85rem" }}>{r}</li>)}</ul>
                  </div>
                  <div className="card" style={{ flex: 1 }}>
                    <strong>Why buy {s.playerIn.web_name}</strong>
                    <ul>{inReasons.map((r, j) => <li key={j} className="muted" style={{ fontSize: "0.85rem" }}>{r}</li>)}</ul>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <MultiTransferSection title="Two-transfer combinations" suggestions={doubleSuggestions} />
      <MultiTransferSection title="Three-transfer combinations" suggestions={tripleSuggestions} />

      <p className="muted">
        Covers single-, two-, and three-transfer suggestions with budget/hit-cost math (bounded top-5-per-leg
        search, not exhaustive). Timing signals are based on published fixture difficulty and already-observed
        form — nobody can predict future form. Never auto-applied — you decide.
      </p>
    </div>
  );
}

function MultiTransferSection({ title, suggestions }) {
  return (
    <>
      <h3 style={{ marginTop: "1.5rem" }}>{title}</h3>
      {suggestions.length === 0 ? (
        <div className="card">No combination clears the minimum-gain threshold this week.</div>
      ) : (
        suggestions.map((s, i) => (
          <div className="card" key={i}>
            {s.moves.map((m, j) => (
              <p key={j}>
                <strong>OUT:</strong> {m.playerOut.web_name} ({m.expectedPointsOut.toFixed(1)} pts) →{" "}
                <strong>IN:</strong> {m.playerIn.web_name} ({m.expectedPointsIn.toFixed(1)} pts)
              </p>
            ))}
            <div className="metric-row">
              <div className="metric"><div className="label">Combined gain (before hit)</div><div className="value">{s.expectedGainBeforeHit > 0 ? "+" : ""}{s.expectedGainBeforeHit}</div></div>
              <div className="metric"><div className="label">Hit cost</div><div className="value">{s.hitCost ? `-${s.hitCost}` : "0"}</div></div>
              <div className="metric"><div className="label">Combined gain (after hit)</div><div className="value">{s.expectedGainAfterHit > 0 ? "+" : ""}{s.expectedGainAfterHit}</div></div>
            </div>
            <p className="muted">Cash impact: {s.totalCashDeltaM >= 0 ? "+" : ""}{s.totalCashDeltaM}m in the bank afterwards.</p>
          </div>
        ))
      )}
    </>
  );
}
