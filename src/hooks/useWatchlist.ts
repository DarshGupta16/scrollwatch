import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import { getStorage, setStorage, Rule } from "../utils/storage";
import { toSeconds } from "../utils/time";
import { normalizeDomain } from "../utils/domain";
import type { TimeHMS } from "../utils/time";

// Helper to check if we are in an extension context
const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;

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
    let data = null;
    try {
      if (isExtension) {
        // Try to get real-time data from background first
        const liveData = await browser.runtime.sendMessage({ type: "GET_STATE" });
        if (liveData && liveData.watchlist) {
          data = liveData;
        }
      }
    } catch (e) {
      // Background might be sleeping or unreachable
    }

    if (!data) {
      data = await getStorage();
    }
    
    const newWatchlist = data.watchlist || {};
    
    // Apply monotonicity to the polled data
    setWatchlist(prev => {
      const merged = { ...prev };
      let changed = false;

      for (const domain in newWatchlist) {
        const incoming = newWatchlist[domain];
        const current = prev[domain];

        if (!current) {
          merged[domain] = incoming;
          changed = true;
          continue;
        }

        const isNewReset = incoming.lastReset > current.lastReset;
        const isTimeIncrease = incoming.consumedTime > current.consumedTime;
        const configChanged = incoming.allowedDuration !== current.allowedDuration;

        if (isNewReset || isTimeIncrease || configChanged) {
          merged[domain] = incoming;
          changed = true;
        }
      }
      
      // Also handle removals
      for (const domain in prev) {
        if (!newWatchlist[domain]) {
          delete merged[domain];
          changed = true;
        }
      }

      return changed ? merged : prev;
    });

    setStats(data.stats || { totalBlocks: 0, startTime: Date.now() });
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);

    let messageListener: any = null;
    if (isExtension) {
      messageListener = (message: any) => {
        if (message.type === "STATE_UPDATED") {
          setWatchlist(prev => {
            const currentRule = prev[message.domain];
            const newRule = message.rule;

            if (currentRule) {
              const isNewReset = newRule.lastReset > currentRule.lastReset;
              const isTimeIncrease = newRule.consumedTime > currentRule.consumedTime;
              const configChanged = newRule.allowedDuration !== currentRule.allowedDuration;

              if (!isNewReset && !isTimeIncrease && !configChanged) {
                return prev;
              }
            }

            return {
              ...prev,
              [message.domain]: newRule
            };
          });
          if (message.stats) {
            setStats(message.stats);
          }
        }
      };
      browser.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      clearInterval(interval);
      if (isExtension && messageListener) {
        browser.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, [refresh, refreshInterval]);

  const addRule = useCallback(
    async (domain: string, durationTime: TimeHMS, resetTime: TimeHMS) => {
      const cleanDomain = normalizeDomain(domain);
      const rule: Rule = {
        id: Math.random().toString(36).substr(2, 9),
        domain: cleanDomain,
        allowedDuration: toSeconds(durationTime),
        resetInterval: toSeconds(resetTime),
        consumedTime: 0,
        lastReset: Date.now(),
        isBlocked: false,
      };

      try {
        if (isExtension) {
          await browser.runtime.sendMessage({ type: "ADD_RULE", rule });
        } else {
          throw new Error("Not an extension");
        }
        await refresh();
      } catch (e) {
        // Fallback for dev mode/errors
        const data = await getStorage();
        data.watchlist[cleanDomain] = rule;
        await setStorage(data);
        await refresh();
      }
    },
    [refresh],
  );

  const deleteRule = useCallback(
    async (domain: string) => {
      try {
        if (isExtension) {
          await browser.runtime.sendMessage({ type: "DELETE_RULE", domain });
        } else {
          throw new Error("Not an extension");
        }
        await refresh();
      } catch (e) {
        // Fallback
        const data = await getStorage();
        delete data.watchlist[domain];
        await setStorage(data);
        await refresh();
      }
    },
    [refresh],
  );

  return { watchlist, stats, addRule, deleteRule, refresh };
};
