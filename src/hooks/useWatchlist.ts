import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage, Rule } from "../utils/storage";
import { toSeconds } from "../utils/time";
import { normalizeDomain } from "../utils/domain";
import type { TimeHMS } from "../utils/time";

interface UseWatchlistReturn {
  watchlist: Record<string, Rule>;
  stats: { totalBlocks: number; startTime: number };
  addRule: (
    domain: string,
    durationTime: TimeHMS,
    resetTime: TimeHMS,
  ) => Promise<void>;
  updateRule: (
    originalDomain: string,
    newDomain: string,
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
      const cleanDomain = normalizeDomain(domain);
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

  const updateRule = useCallback(
    async (
      originalDomain: string,
      newDomain: string,
      durationTime: TimeHMS,
      resetTime: TimeHMS,
    ) => {
      const cleanNewDomain = normalizeDomain(newDomain);
      const data = await getStorage();

      if (originalDomain === cleanNewDomain) {
        if (data.watchlist[originalDomain]) {
          const rule = data.watchlist[originalDomain];
          rule.allowedDuration = toSeconds(durationTime);
          rule.resetInterval = toSeconds(resetTime);
          rule.isBlocked = rule.consumedTime >= rule.allowedDuration;
        }
      } else {
        if (data.watchlist[originalDomain]) {
          delete data.watchlist[originalDomain];
        }
        data.watchlist[cleanNewDomain] = {
          id: Math.random().toString(36).substr(2, 9),
          domain: cleanNewDomain,
          allowedDuration: toSeconds(durationTime),
          resetInterval: toSeconds(resetTime),
          consumedTime: 0,
          lastReset: Date.now(),
          isBlocked: false,
        };
      }

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

  return { watchlist, stats, addRule, updateRule, deleteRule, refresh };
};
