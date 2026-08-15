import React, { useEffect, useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import { getEntryPicks, getStandings } from "../lib/fplApi.js";
import { computeConsensus, consensusLabel, compareSquadToConsensus, DISAGREEMENT_WARNING } from "../lib/eliteConsensus.js";
import { getManagerId } from "../lib/storage.js";
import InfoBanner from "../components/InfoBanner.jsx";

const COHORT_SIZE = 5;

export default function TopManagers() {
  const { players, events } = useFplData();
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const { squad } = useManagerData(playersById);

  const [standings, setStandings] = useState([]);
  const [consensus, setConsensus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentEvent = events.find((e) => e.is_current)?.id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStandings(314, 1);
        const results = data.standings?.results || [];
        if (cancelled) return;
        setStandings(results.slice(0, COHORT_SIZE));

        if (results.length && currentEvent) {
          const picksList = await Promise.all(
            results.slice(0, COHORT_SIZE).map((r) =>
              getEntryPicks(r.entry, currentEvent).catch(() => null)
            )
          );
          if (!cancelled) setConsensus(computeConsensus(picksList.filter(Boolean)));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentEvent]);

  const comparison = useMemo(
    () => (squad.length ? compareSquadToConsensus(squad.map((p) => p.id), consensus) : null),
    [squad, consensus]
  );

  return (
    <div>
      <h1>🏆 Top Managers Intelligence</h1>
      <InfoBanner title="Real official data" icon="ℹ️">
        From FPL's own "Overall" global league (id 314) — no scraping, no third-party service. Standings are
        genuinely empty before Gameweek 1 has any scores; that's expected, not a fetch failure.
      </InfoBanner>

      {loading && <p className="muted">Loading top {COHORT_SIZE} managers…</p>}
      {error && <p className="warning">⚠️ {error}</p>}

      {!loading && !error && standings.length === 0 && (
        <div className="card">No standings yet — check back once Gameweek 1 has scores.</div>
      )}

      {standings.length > 0 && (
        <div className="card">
          <h3>Current Top {standings.length}</h3>
          <table>
            <thead><tr><th>Rank</th><th>Manager</th><th>Team</th><th>Total points</th><th>GW points</th></tr></thead>
            <tbody>
              {standings.map((r) => (
                <tr key={r.entry}>
                  <td>{r.rank}</td><td>{r.player_name}</td><td>{r.entry_name}</td>
                  <td>{r.total}</td><td>{r.event_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(consensus).length > 0 && (
        <div className="card">
          <h3>Elite ownership/captaincy consensus</h3>
          <p className="muted">
            A small, separate signal — never replaces the model's own scoring. Shown side by side; a
            disagreement between this and your team is information, not something to auto-resolve.
          </p>
          <table>
            <thead><tr><th>Player</th><th>Owned by</th><th>Ownership %</th><th>Captained by</th><th>Label</th></tr></thead>
            <tbody>
              {Object.values(consensus)
                .sort((a, b) => b.ownershipPct - a.ownershipPct)
                .slice(0, 20)
                .map((entry) => (
                  <tr key={entry.playerId}>
                    <td>{playersById[entry.playerId]?.web_name || entry.playerId}</td>
                    <td>{entry.ownedBy}/{standings.length}</td>
                    <td>{entry.ownershipPct}%</td>
                    <td>{entry.captainedBy}</td>
                    <td>{consensusLabel(entry)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {comparison && (
        <div className="card">
          <h3>My Team vs Elite</h3>
          <p><strong>Shared core</strong>: {comparison.shared.length ? comparison.shared.map((pid) => playersById[pid]?.web_name).join(", ") : "None"}</p>
          <p><strong>My blind spots</strong> (elite commonly own, I don't): {comparison.blindSpots.length ? comparison.blindSpots.map((pid) => playersById[pid]?.web_name).join(", ") : "None"}</p>
          <p><strong>My differentials</strong> (I own, elite generally don't): {comparison.differentials.length ? comparison.differentials.map((pid) => playersById[pid]?.web_name).join(", ") : "None"}</p>
          <InfoBanner title="Keep this in perspective" icon="⚠️">{DISAGREEMENT_WARNING}</InfoBanner>
        </div>
      )}
      {!squad.length && (
        <p className="muted">Set your manager ID on the Home page to see a My-Team-vs-Elite comparison.</p>
      )}
    </div>
  );
}
