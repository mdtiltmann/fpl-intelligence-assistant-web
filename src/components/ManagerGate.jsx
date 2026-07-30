import React from "react";
import { Link } from "react-router-dom";
import InfoBanner from "./InfoBanner.jsx";

/** Shared "not ready yet" states for any page that needs a squad to show
 * recommendations (My Team, Captaincy, Transfer Centre). Keeps the
 * messaging consistent and non-technical across all three instead of
 * each page inventing its own wording. Returns null when everything is
 * ready and the page should render its real content. */
export default function ManagerGate({ managerId, loading, error, seasonNotStarted, hasData }) {
  if (!managerId) {
    return (
      <InfoBanner title="No manager ID set yet" icon="👋">
        Head to the <Link to="/">Home page</Link> and enter your FPL manager ID to see this page.
      </InfoBanner>
    );
  }
  if (loading) {
    return <p className="muted">Loading your team…</p>;
  }
  if (error) {
    return <p className="warning">⚠️ {error}</p>;
  }
  if (seasonNotStarted) {
    return (
      <InfoBanner title="Season hasn't started yet" icon="📅">
        This page needs your squad picks, which the FPL API only publishes once Gameweek 1 begins
        (deadline 21 Aug 2026). Check back once the season starts — no action needed on your part.
      </InfoBanner>
    );
  }
  if (!hasData) {
    return (
      <InfoBanner title="No squad data yet" icon="🔄">
        Go to the Home page and click "Refresh players/teams/fixtures", then come back here.
      </InfoBanner>
    );
  }
  return null;
}
