import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage, Rule, StorageData } from "../utils/storage";
import { toSeconds } from "../utils/time";
import type { TimeHMS } from "../utils/time";

interface UseWatchlistReturn {
  watchlist: Record<string, Rule>;
  stats: { totalBlocks: number; startTime: number };
  addRule: (
    domain: string,
    durationTime: TimeHMS,
    resetTime: TimeHMS,
  ) => Promise<void>;
  deleteRule: (domain: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing watchlist data and CRUD operations
 */
export const useWatchlist = (refreshInterval = 5000): UseWatchlistReturn => {
  const [watchlist, setWatchlist] = useState<Record<string, Rule>>({});
  const [stats, setStats] = useState({ totalBlocks: 0, startTime: Date.now() });

  const refresh = useCallback(async () => {
    const data = await getStorage();
    setWatchlist(data.watchlist);
    setStats(data.stats || { totalBlocks: 0, startTime: Date.now() });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  const addRule = useCallback(
    async (domain: string, durationTime: TimeHMS, resetTime: TimeHMS) => {
      const cleanDomain = domain
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .split("/")[0];
      const data = await getStorage();

      data.watchlist[cleanDomain] = {
        id: Math.random().toString(36).substr(2, 9),
        domain: cleanDomain,
        allowedDuration: toSeconds(durationTime),
        resetInterval: toSeconds(resetTime),
        consumedTime: 0,
        lastReset: Date.now(),
        isBlocked: false,
      };

      await setStorage(data);
      await refresh();
    },
    [refresh],
  );

  const deleteRule = useCallback(
    async (domain: string) => {
      const data = await getStorage();
      delete data.watchlist[domain];
      await setStorage(data);
      await refresh();
    },
    [refresh],
  );

  return { watchlist, stats, addRule, deleteRule, refresh };
};
