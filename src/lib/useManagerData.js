import { useCallback, useEffect, useState } from "react";
import { getEntry, getEntryHistory, getEntryPicks, getEntryTransfers } from "./fplApi.js";
import { getManagerId } from "./storage.js";

/** Fetches manager profile + current-gameweek picks. Manager history and
 * transfers are exposed separately since not every page needs them. */
export function useManagerData(playersById) {
  const managerId = getManagerId();
  const [profile, setProfile] = useState(null);
  const [picks, setPicks] = useState([]);
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seasonNotStarted, setSeasonNotStarted] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    setError(null);
    setSeasonNotStarted(false);
    try {
      const entry = await getEntry(managerId);
      setProfile(entry);
      const currentEvent = entry.current_event;
      if (!currentEvent) {
        // Expected pre-season state, not an error: FPL itself doesn't
        // expose squad picks until the season's first gameweek begins.
        setSeasonNotStarted(true);
        setPicks([]);
        setSquad([]);
        return;
      }
      const picksResponse = await getEntryPicks(managerId, currentEvent);
      setPicks(picksResponse.picks || []);
    } catch (err) {
      setError(
        "Couldn't load your team from the FPL servers. This is usually temporary — try Refresh again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!playersById || !picks.length) {
      setSquad([]);
      return;
    }
    setSquad(picks.map((p) => playersById[p.element]).filter(Boolean));
  }, [picks, playersById]);

  return { managerId, profile, picks, squad, loading, seasonNotStarted, error, refresh };
}

export function useManagerHistoryAndTransfers() {
  const managerId = getManagerId();
  const [history, setHistory] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    setError(null);
    try {
      const [historyResponse, transfersResponse] = await Promise.all([
        getEntryHistory(managerId),
        getEntryTransfers(managerId),
      ]);
      setHistory(historyResponse);
      setTransfers(transfersResponse || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, transfers, loading, error, refresh };
}
