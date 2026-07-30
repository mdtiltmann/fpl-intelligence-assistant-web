import React, { useState } from "react";
import { useFplData } from "../lib/FplDataContext.jsx";
import { useManagerData } from "../lib/useManagerData.js";
import { getManagerId, setManagerId } from "../lib/storage.js";

export default function Home() {
  const { players, loading, error, refresh, lastFetchedAt } = useFplData();
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const { profile, warning, error: managerError, refresh: refreshManager } = useManagerData(playersById);
  const [savedId, setSavedId] = useState(getManagerId());
  const [inputId, setInputId] = useState(savedId);
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = inputId.trim();
    setManagerId(trimmed);
    setSavedId(trimmed);
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
          {managerError && <p className="warning">{managerError}</p>}
          {warning && <p className="warning">{warning}</p>}
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
