import React from "react";
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "🏠 Home", end: true },
  { to: "/my-team", label: "📋 My Team" },
  { to: "/player-explorer", label: "🔍 Player Explorer" },
  { to: "/draft-squad", label: "🧪 Draft Squad" },
  { to: "/captaincy", label: "👑 Captaincy" },
  { to: "/fixtures", label: "📅 Fixtures" },
  { to: "/transfer-centre", label: "🔄 Transfer Centre" },
];

export default function Nav() {
  return (
    <div className="sidebar">
      <h1>⚽ FPL Assistant</h1>
      <nav>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Advisory only. Never modifies your real FPL team.
      </p>
    </div>
  );
}
