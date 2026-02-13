import { useState, useEffect, useCallback, useRef } from "react";
import browser from "webextension-polyfill";
import { Rule, StorageData } from "../utils/storage";
import { toSeconds } from "../utils/time";
import { normalizeDomain } from "../utils/domain";
import type { TimeHMS } from "../utils/time";

interface UseWatchlistReturn {
  watchlist: Record<string, Rule>;
  stats: { totalBlocks: number; startTime: number };
  loading: boolean;
  addRule: (
    domain: string,
    durationTime: TimeHMS,
    resetTime: TimeHMS,
    mode: "quota" | "cooldown",
  ) => Promise<void>;
  updateRule: (
    originalDomain: string,
    newDomain: string,
    durationTime: TimeHMS,
    resetTime: TimeHMS,
    mode: "quota" | "cooldown",
  ) => Promise<void>;
  deleteRule: (domain: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWatchlist = (): UseWatchlistReturn => {
  const [watchlist, setWatchlist] = useState<Record<string, Rule>>({});
  const [stats, setStats] = useState({ totalBlocks: 0, startTime: Date.now() });
  const [loading, setLoading] = useState(true);
  
  // Use a ref to track the latest watchlist state for the message listener
  const watchlistRef = useRef<Record<string, Rule>>({});
  // Use a ref to track the last tick time per domain in UI too
  const lastTickTimeRef = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      // Always calibrate from session storage if possible, fallback to local
      const sessionData = await browser.storage.session.get("scrollwatch");
      let data = sessionData.scrollwatch as StorageData;
      
      if (!data) {
        const localData = await browser.storage.local.get("scrollwatch");
        data = localData.scrollwatch;
      }

      if (data) {
        setWatchlist((prev) => {
          const next: Record<string, Rule> = { ...data.watchlist };
          // SAFETY RULE: uiTime = max(uiTime, sessionTime)
          // This prevents snap-back if background is slightly behind UI
          for (const domain in next) {
            if (prev[domain]) {
              next[domain].consumedTime = Math.max(prev[domain].consumedTime, next[domain].consumedTime);
            }
          }
          watchlistRef.current = next;
          return next;
        });
        setStats(data.stats || { totalBlocks: 0, startTime: Date.now() });
      }
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const calibrate = async () => {
      setLoading(true);
      // Intentional delay for UX calibration as per PLAN.md
      await new Promise((resolve) => setTimeout(resolve, 500));
      await refresh();
    };

    calibrate();

    // Listen for TICK messages
    const handleMessage = (message: any) => {
      if (message.type === "TICK") {
        const { domain } = message;
        const now = Date.now();
        const lastTick = lastTickTimeRef.current[domain] || 0;
        
        // Deduplicate multiple tabs: ignore if tick arrived too soon
        if (now - lastTick < 800) return;
        lastTickTimeRef.current[domain] = now;

        setWatchlist((prev) => {
          const rule = prev[domain];
          if (rule && !rule.isBlocked) {
            // MONOTONIC INCREMENT: exactly +1 second
            const updatedRule = {
              ...rule,
              consumedTime: rule.consumedTime + 1,
            };
            
            // Check if it should be blocked visually
            if (updatedRule.consumedTime >= updatedRule.allowedDuration) {
              updatedRule.isBlocked = true;
            }

            const next = { ...prev, [domain]: updatedRule };
            watchlistRef.current = next;
            return next;
          }
          return prev;
        });
      } else if (message.type === "UNBLOCK_PAGE") {
        refresh();
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, [refresh]);

  const addRule = useCallback(
    async (
      domain: string,
      durationTime: TimeHMS,
      resetTime: TimeHMS,
      mode: "quota" | "cooldown",
    ) => {
      const cleanDomain = normalizeDomain(domain);
      // We don't read storage here, we send a message to background or just use a helper
      // To keep it simple and follow the "Accountant" model, we should let background handle writes
      // But we can update local state optimistically or just refresh
      
      const newRule: Rule = {
        id: Math.random().toString(36).substr(2, 9),
        domain: cleanDomain,
        allowedDuration: toSeconds(durationTime),
        resetInterval: toSeconds(resetTime),
        consumedTime: 0,
        lastReset: Date.now(),
        isBlocked: false,
        mode,
        blockStartTime: null,
      };

      // Optimistic update
      setWatchlist(prev => ({ ...prev, [cleanDomain]: newRule }));
      
      // Notify background to save
      await browser.runtime.sendMessage({
        type: "UPDATE_RULES",
        watchlist: { ...watchlistRef.current, [cleanDomain]: newRule }
      });
      
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
      mode: "quota" | "cooldown",
    ) => {
      const cleanNewDomain = normalizeDomain(newDomain);
      const nextWatchlist = { ...watchlistRef.current };

      if (originalDomain === cleanNewDomain) {
        if (nextWatchlist[originalDomain]) {
          const rule = { ...nextWatchlist[originalDomain] };
          const oldMode = rule.mode || "quota";
          
          rule.allowedDuration = toSeconds(durationTime);
          rule.resetInterval = toSeconds(resetTime);
          rule.mode = mode;
          rule.isBlocked = rule.consumedTime >= rule.allowedDuration;

          if (oldMode !== mode) {
            if (mode === "cooldown") {
              rule.blockStartTime = rule.isBlocked ? Date.now() : null;
            } else {
              rule.blockStartTime = null;
              rule.lastReset = Date.now();
            }
          }
          nextWatchlist[originalDomain] = rule;
        }
      } else {
        delete nextWatchlist[originalDomain];
        nextWatchlist[cleanNewDomain] = {
          id: Math.random().toString(36).substr(2, 9),
          domain: cleanNewDomain,
          allowedDuration: toSeconds(durationTime),
          resetInterval: toSeconds(resetTime),
          consumedTime: 0,
          lastReset: Date.now(),
          isBlocked: false,
          mode,
          blockStartTime: null,
        };
      }

      await browser.runtime.sendMessage({
        type: "UPDATE_RULES",
        watchlist: nextWatchlist
      });
      
      await refresh();
    },
    [refresh],
  );

  const deleteRule = useCallback(
    async (domain: string) => {
      const nextWatchlist = { ...watchlistRef.current };
      delete nextWatchlist[domain];
      
      await browser.runtime.sendMessage({
        type: "UPDATE_RULES",
        watchlist: nextWatchlist
      });
      
      await refresh();
    },
    [refresh],
  );

  return { watchlist, stats, loading, addRule, updateRule, deleteRule, refresh };
};
