import React, { useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import { getManagerId, setManagerId } from "../lib/storage.js";
import InfoBanner from "../components/InfoBanner.jsx";

/** Accepts either a bare ID ("2123506") or a full FPL URL
 * (".../entry/2123506/..." or "...entry/2123506") and pulls out the
 * numeric manager ID either way — pasting the whole address bar URL is
 * an easy, common mistake. Returns null if no ID can be found. */
function extractManagerId(input) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/entry\/(\d+)/);
  return match ? match[1] : null;
}

export default function Home() {
  const { players, loading, error, refresh, lastFetchedAt } = useFplData();
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const { profile, seasonNotStarted, error: managerError, refresh: refreshManager } = useManagerData(playersById);
  const [savedId, setSavedId] = useState(getManagerId());
  const [inputId, setInputId] = useState(savedId);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    const extracted = extractManagerId(inputId);
    if (!extracted) {
      setSaveError(
        "Couldn't find a manager ID in that. Enter just the number (e.g. 2123506), or paste the full URL from your team page."
      );
      return;
    }
    setSaveError(null);
    setInputId(extracted);
    setManagerId(extracted);
    setSavedId(extracted);
    setJustSaved(true);
    refreshManager();
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div>
      <h1>⚽ FPL Intelligence Assistant</h1>
      <p className="muted">
        Local-first in spirit, hosted on Netlify. Never submits changes to your real FPL team — read-only, advisory only.
      </p>

      <div className="card">
        <p>
          {savedId
            ? "Change your FPL manager ID:"
            : "Enter your FPL manager ID (from the URL when viewing your team, e.g. .../entry/1234567/event/1):"}
        </p>
        <form onSubmit={handleSave} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input value={inputId} onChange={(e) => setInputId(e.target.value)} placeholder="1234567" />
          <button type="submit">{savedId ? "Save & switch" : "Save"}</button>
          {justSaved && <span className="muted">✓ Saved</span>}
        </form>
        {saveError && <p className="warning">{saveError}</p>}
        {savedId && <p className="muted">Currently using manager ID: {savedId}</p>}
      </div>

      <div className="card">
        <button onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "🔄 Refresh players/teams/fixtures"}
        </button>
        {error && <p className="warning">{error}</p>}
        {lastFetchedAt && (
          <p className="muted">Last fetched: {lastFetchedAt.toLocaleString()}</p>
        )}
      </div>

      {savedId && (
        <div className="card">
          <h3>{profile?.name || "Your team"}</h3>
          {managerError && <p className="warning">⚠️ {managerError}</p>}
          {seasonNotStarted && (
            <InfoBanner title="Season hasn't started yet" icon="📅">
              Your squad, team rating, and transfer suggestions will appear automatically once Gameweek 1
              begins (deadline 21 Aug 2026) — the FPL API doesn't publish squad picks before then. Everything
              else (Player Explorer, Fixtures) already works now.
            </InfoBanner>
          )}
          {profile && (
            <div className="metric-row">
              <div className="metric">
                <div className="label">Overall points</div>
                <div className="value">{profile.summary_overall_points ?? "—"}</div>
              </div>
              <div className="metric">
                <div className="label">Overall rank</div>
                <div className="value">{profile.summary_overall_rank?.toLocaleString() || "—"}</div>
              </div>
              <div className="metric">
                <div className="label">Bank</div>
                <div className="value">
                  {profile.last_deadline_bank != null ? `£${(profile.last_deadline_bank / 10).toFixed(1)}m` : "—"}
                </div>
              </div>
              <div className="metric">
                <div className="label">Squad value</div>
                <div className="value">
                  {profile.last_deadline_value != null ? `£${(profile.last_deadline_value / 10).toFixed(1)}m` : "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="muted">
        Use the sidebar for My Team, Player Explorer, Captaincy, Fixtures, and Transfer Centre.
      </p>
    </div>
  );
}
