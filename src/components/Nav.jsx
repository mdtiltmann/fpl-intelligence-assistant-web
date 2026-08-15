import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "🏠 Home", end: true },
  { to: "/my-team", label: "📋 My Team" },
  { to: "/player-explorer", label: "🔍 Player Explorer" },
  { to: "/draft-squad", label: "🧪 Draft Squad" },
  { to: "/captaincy", label: "👑 Captaincy" },
  { to: "/fixtures", label: "📅 Fixtures" },
  { to: "/transfer-centre", label: "🔄 Transfer Centre" },
  { to: "/top-managers", label: "🏆 Top Managers" },
  { to: "/squad-translator", label: "🔁 Squad Translator" },
  { to: "/history", label: "📜 History" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes (link tap) so it never
  // stays open after navigating on mobile.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const current = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)));

  return (
    <>
      <div className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          ☰
        </button>
        <h1>{current ? current.label : "⚽ FPL Assistant"}</h1>
        <span style={{ width: 42 }} />
      </div>

      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className={`sidebar${open ? " open" : ""}`}>
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
    </>
  );
}
