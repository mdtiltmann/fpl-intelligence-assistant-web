import React, { useMemo, useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { getElementSummary } from "../lib/fplApi.js";
import { estimatePointsForDraft, upcomingFixturesForTeam } from "../lib/analytics.js";
import {
  classifyPlayer, resolvePlayerByName, suggestReplacementFor,
  KEEP_AS_CORE, STILL_STRONG, REASSESS_AT_NEW_PRICE, INJURY_OR_AVAILABILITY_RISK, AVOID, NO_LONGER_AVAILABLE,
} from "../lib/squadTranslator.js";

const ICON = {
  [KEEP_AS_CORE]: "🟢", [STILL_STRONG]: "🟢", [REASSESS_AT_NEW_PRICE]: "🟡",
  [INJURY_OR_AVAILABILITY_RISK]: "🟠", [AVOID]: "🔴", [NO_LONGER_AVAILABLE]: "⚫",
};
const NEEDS_REPLACEMENT = new Set([AVOID, NO_LONGER_AVAILABLE, INJURY_OR_AVAILABILITY_RISK]);

export default function SquadTranslator() {
  const { players, teamsById, fixtures, gameweeksPlayed } = useFplData();
  const [namesText, setNamesText] = useState("");
  const [translations, setTranslations] = useState(null);
  const [replacements, setReplacements] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    const names = namesText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    setLoading(true);
    try {
      const results = [];
      for (const name of names) {
        const currentPlayer = resolvePlayerByName(name, players);
        let elementSummary = null;
        if (currentPlayer) {
          try {
            elementSummary = await getElementSummary(currentPlayer.id);
          } catch {
            elementSummary = null;
          }
        }
        results.push(classifyPlayer(name, currentPlayer, elementSummary));
      }
      setTranslations(results);

      // Same-position replacement suggestions for weak players.
      const expectedPointsById = {};
      for (const p of players) {
        expectedPointsById[p.id] = estimatePointsForDraft(p, gameweeksPlayed, upcomingFixturesForTeam(fixtures, teamsById, p.team, 5));
      }
      const usedIds = new Set(results.filter((t) => t.currentPlayer).map((t) => t.currentPlayer.id));
      const repl = {};
      for (const t of results) {
        if (!NEEDS_REPLACEMENT.has(t.classification)) continue;
        const r = suggestReplacementFor(t, players, usedIds, expectedPointsById);
        if (r) { repl[t.originalName] = r; usedIds.add(r.id); }
      }
      setReplacements(repl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>🔁 Last-Season Squad Translator</h1>
      <p className="muted">
        Type your remembered squad from last season (one name per line — FPL "known as" names work best,
        e.g. "Raya", "Saka", "Haaland"). Each is matched against the current real player list and classified
        using their historical output and current status — never a guarantee of this season's performance.
        A name that can't be matched at all means the player genuinely isn't in this season's player list.
      </p>

      <div className="card">
        <textarea
          rows={10}
          style={{ width: "100%", fontFamily: "inherit", fontSize: "0.95rem", padding: "0.5rem" }}
          placeholder={"Raya\nGabriel\nvan Dijk\nSaka\n..."}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
        <div style={{ marginTop: "0.6rem" }}>
          <button onClick={handleTranslate} disabled={loading || !namesText.trim()}>
            {loading ? "Translating…" : "Translate squad"}
          </button>
        </div>
      </div>

      {translations && (
        <div className="card">
          <h3>Results</h3>
          <table>
            <thead><tr><th>Name typed</th><th>Matched to</th><th>Classification</th><th>Pre-Season Rating</th></tr></thead>
            <tbody>
              {translations.map((t, i) => (
                <tr key={i}>
                  <td>{t.originalName}</td>
                  <td>{t.currentPlayer?.web_name || "— not matched —"}</td>
                  <td>{ICON[t.classification] || ""} {t.classification}</td>
                  <td>{t.preSeasonRating != null ? `${t.preSeasonRating}/100` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {translations && (
        <div className="card">
          <h3>Reasoning</h3>
          {translations.map((t, i) => (
            <details key={i} style={{ marginBottom: "0.5rem" }}>
              <summary>{t.originalName} — {t.classification}</summary>
              <ul>{t.reasons.map((r, j) => <li key={j} className="muted" style={{ fontSize: "0.85rem" }}>{r}</li>)}</ul>
            </details>
          ))}
        </div>
      )}

      {translations && (
        <div className="card">
          <h3>Suggested replacements</h3>
          <p className="muted">
            A simple same-position, similar-price substitute for players classified Avoid, an
            Injury/Availability Risk, or No Longer Available — not a full budget-constrained squad solve
            (use Draft Squad for that).
          </p>
          {Object.keys(replacements).length === 0 ? (
            <p className="muted">No replacements needed — every matched player cleared the threshold.</p>
          ) : (
            Object.entries(replacements).map(([name, r]) => (
              <p key={name}><strong>{name}</strong> → {r.web_name} (£{(r.now_cost / 10).toFixed(1)}m)</p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
