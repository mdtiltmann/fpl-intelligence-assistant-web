import React from "react";
import { Link } from "react-router-dom";

export default function Guide() {
  return (
    <div>
      <h1>📘 How to use this app</h1>
      <p className="muted">
        A practical weekly workflow, in the order that actually makes sense. Nothing in this app ever
        submits anything to your real FPL team — every suggestion is advisory, and you make the actual
        change on fantasy.premierleague.com yourself.
      </p>

      <div className="card">
        <h3>1. First-time setup</h3>
        <p>
          Open <Link to="/">Home</Link>, enter your FPL manager ID (the number in your team's URL:
          <code> .../entry/1234567/event/1</code> → <code>1234567</code>).
        </p>
        <p>Click <strong>"🔄 Refresh players/teams/fixtures"</strong>. Do this at the start of every session — it's not automatic.</p>
      </div>

      <div className="card">
        <h3>2. Check your team's current state — My Team</h3>
        <p>Shows your real squad, a 0–100 team rating with a full component breakdown (click "How this was calculated" to see why), and a recommended starting XI/bench.</p>
        <p>Look at the <strong>READY/LIMITED/EXPERIMENTAL/BLOCKED</strong> badge next to the rating — EXPERIMENTAL means trust it less (usually pre-season or early gameweeks with little data).</p>
        <p>Click <strong>"Why?"</strong> next to any player for the reasoning behind their projection.</p>
        <Link to="/my-team">Go to My Team →</Link>
      </div>

      <div className="card">
        <h3>3. See what the elite are doing — Top Managers</h3>
        <p>Compares your squad against the current Top 5's ownership/captaincy.</p>
        <p>Look at <strong>"My blind spots"</strong> (players elite managers own that you don't) before making transfer decisions — but read the warning banner: a 5-manager sample this early in a season is noisy, don't blindly copy it.</p>
        <Link to="/top-managers">Go to Top Managers →</Link>
      </div>

      <div className="card">
        <h3>4. Decide your transfer(s) — Transfer Centre</h3>
        <p>Set your horizon and free-transfer count at the top.</p>
        <p>Single-, two-, and three-transfer sections are shown separately — check all three, since sometimes a double clears the bar when a single doesn't.</p>
        <p>Click <strong>"Why sell / why buy?"</strong> on any suggestion for the full reasoning.</p>
        <p>Watch the <strong>⏰ Watchlist</strong> section — flags players worth selling soon due to a tough fixture run or real form decline, even if no swap is suggested yet.</p>
        <p className="muted">Never act on anything below LIMITED confidence without your own judgment.</p>
        <Link to="/transfer-centre">Go to Transfer Centre →</Link>
      </div>

      <div className="card">
        <h3>5. Pick your captain — Captaincy</h3>
        <p>Shows safest vs. highest-upside options side by side. If you're playing it safe, go with "Safest"; if you're chasing rank, "Highest-upside."</p>
        <Link to="/captaincy">Go to Captaincy →</Link>
      </div>

      <div className="card">
        <h3>6. Planning a chip? — History</h3>
        <p>Shows your calculated free transfers, real chip availability (windows FPL actually gives you this season), and a Bench Boost/Triple Captain timing comparison across your next 6 gameweeks — tells you which upcoming week is genuinely best, not just "now."</p>
        <Link to="/history">Go to History →</Link>
      </div>

      <div className="card">
        <h3>7. Rebuilding for a new season or a Wildcard — Draft Squad and Squad Translator</h3>
        <p><strong>Squad Translator</strong>: paste your squad from memory (one name per line) to get each player classified Keep/Reassess/Avoid/No-Longer-Available — a good starting point before a Wildcard.</p>
        <p><strong>Draft Squad</strong>: build a fresh 15 from scratch within budget, with auto-suggest and a live rating — use this to actually construct the replacement squad.</p>
        <div className="flex-row">
          <Link to="/squad-translator">Go to Squad Translator →</Link>
          <Link to="/draft-squad">Go to Draft Squad →</Link>
        </div>
      </div>

      <div className="card">
        <h3>General rules for trusting it</h3>
        <ul>
          <li><strong>Confidence/safety badges matter</strong> — EXPERIMENTAL and pre-season numbers are real calculations but rest on thin data; don't treat them as certain.</li>
          <li><strong>Refresh players/teams/fixtures before every session</strong> — stale FPL data (prices, injuries) will silently produce wrong suggestions otherwise.</li>
          <li><strong>Nothing here submits anything to your real FPL team</strong> — every suggestion is advisory; you make the actual transfer/captain change on fantasy.premierleague.com yourself.</li>
        </ul>
      </div>
    </div>
  );
}
