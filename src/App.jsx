import React from "react";
import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import { FplDataProvider } from "./lib/FplDataContext.jsx";
import Home from "./pages/Home.jsx";
import MyTeam from "./pages/MyTeam.jsx";
import PlayerExplorer from "./pages/PlayerExplorer.jsx";
import Captaincy from "./pages/Captaincy.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import TransferCentre from "./pages/TransferCentre.jsx";
import DraftSquad from "./pages/DraftSquad.jsx";

export default function App() {
  return (
    <FplDataProvider>
      <div className="app-shell">
        <Nav />
        <div className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/player-explorer" element={<PlayerExplorer />} />
            <Route path="/captaincy" element={<Captaincy />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/transfer-centre" element={<TransferCentre />} />
            <Route path="/draft-squad" element={<DraftSquad />} />
          </Routes>
        </div>
      </div>
    </FplDataProvider>
  );
}
