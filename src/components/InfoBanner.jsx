import React from "react";

/** A calm, non-alarming banner for expected states (like "season hasn't
 * started yet") — distinct from the red/brown .warning style, which is
 * reserved for genuine errors so users can tell the difference at a glance. */
export default function InfoBanner({ title, children, icon = "ℹ️" }) {
  return (
    <div className="info-banner">
      <span className="icon">{icon}</span>
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
