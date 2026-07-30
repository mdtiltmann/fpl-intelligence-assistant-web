import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getBootstrapStatic, getFixtures } from "./fplApi.js";

const FplDataContext = createContext(null);

export function FplDataProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootstrap, fixtureList] = await Promise.all([getBootstrapStatic(), getFixtures()]);
      setPlayers(bootstrap.elements || []);
      setTeams(bootstrap.teams || []);
      setEvents(bootstrap.events || []);
      setFixtures(fixtureList || []);
      setLastFetchedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const gameweeksPlayed = events.filter((e) => e.finished).length;
  const currentEvent = events.find((e) => e.is_current) || null;

  return (
    <FplDataContext.Provider
      value={{
        players,
        teams,
        teamsById,
        events,
        fixtures,
        gameweeksPlayed,
        currentEvent,
        lastFetchedAt,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </FplDataContext.Provider>
  );
}

export function useFplData() {
  const ctx = useContext(FplDataContext);
  if (!ctx) throw new Error("useFplData must be used within FplDataProvider");
  return ctx;
}
