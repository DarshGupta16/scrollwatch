import React, { useState, useEffect, useRef } from "react";
import { getStorage, Rule } from "../utils/storage";
import browser from "webextension-polyfill";

const App = () => {
  const [stats, setStats] = useState({ blocks: 0, savedMinutes: 0 });
  const [currentSite, setCurrentSite] = useState<{
    domain: string;
    rule: Rule | null;
  }>({ domain: "", rule: null });

  // Local interpolation state for smooth timer
  const syncPointRef = useRef<{ time: number; value: number }>({
    time: Date.now(),
    value: 0,
  });
  const [displayTime, setDisplayTime] = useState(0);

  // Fast local tick for smooth display (every 100ms)
  useEffect(() => {
    const tick = setInterval(() => {
      if (currentSite.rule && !currentSite.rule.isBlocked) {
        const elapsed = (Date.now() - syncPointRef.current.time) / 1000;
        setDisplayTime(syncPointRef.current.value + elapsed);
      }
    }, 100);
    return () => clearInterval(tick);
  }, [currentSite.rule?.isBlocked]);

  // Storage sync (every 3 seconds for accuracy, plus initial load)
  useEffect(() => {
    loadData(); // Initial load
    const sync = setInterval(loadData, 3000);
    return () => clearInterval(sync);
  }, []);

  const loadData = async () => {
    const data = await getStorage();
    const blocks = data.stats?.totalBlocks || 0;
    setStats({
      blocks,
      savedMinutes: blocks * 15,
    });

    // Get current tab's domain
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        const rule = data.watchlist[domain] || null;
        setCurrentSite({ domain, rule });

        // Update sync point for interpolation
        if (rule) {
          syncPointRef.current = { time: Date.now(), value: rule.consumedTime };
          setDisplayTime(rule.consumedTime);
        }
      }
    } catch {
      // Ignore errors (e.g., chrome:// pages)
    }
  };

  const openDashboard = () => {
    browser.runtime.openOptionsPage();
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  };

  const getProgress = () => {
    if (!currentSite.rule) return 0;
    return Math.min(
      100,
      (displayTime / currentSite.rule.allowedDuration) * 100,
    );
  };

  return (
    <div className="w-72 bg-bg border-r border-border min-h-[360px] flex flex-col p-6">
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-widest uppercase text-accent">
          ScrollWatch
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 bg-green-500 rounded-none animate-pulse"></div>
          <span className="text-xs text-muted uppercase tracking-widest">
            System Active
          </span>
        </div>
      </header>

      {/* Current Site Status */}
      {currentSite.domain && (
        <div className="mb-6 bg-surface border border-border p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold tracking-tight truncate max-w-[180px]">
                {currentSite.domain}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {currentSite.rule ? (
                  <>
                    <div
                      className={`w-2 h-2 ${currentSite.rule.isBlocked ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
                    ></div>
                    <span className="text-xs text-muted uppercase tracking-widest">
                      {currentSite.rule.isBlocked ? "LOCKED" : "MONITORING"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-muted"></div>
                    <span className="text-xs text-muted uppercase tracking-widest">
                      NOT TRACKED
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {currentSite.rule && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted uppercase">
                <span>Usage</span>
                <span>
                  {formatTime(displayTime)} /{" "}
                  {formatTime(currentSite.rule.allowedDuration)}
                </span>
              </div>
              <div className="h-2 bg-bg border border-border w-full">
                <div
                  className={`h-full transition-all duration-100 ${currentSite.rule.isBlocked ? "bg-red-500" : "bg-white"}`}
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
              <div className="text-right text-xs text-muted">
                Resets every {formatTime(currentSite.rule.resetInterval)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex-1 space-y-4">
        <div>
          <div className="text-3xl font-bold text-text leading-none">
            {stats.blocks}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest mt-1">
            Blocks Today
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-text leading-none">
            {stats.savedMinutes >= 60
              ? (stats.savedMinutes / 60).toFixed(1) + "h"
              : stats.savedMinutes + "m"}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest mt-1">
            Time Reclaimed
          </div>
        </div>
      </div>

      <button
        onClick={openDashboard}
        className="w-full mt-6 py-3 bg-surface border border-border hover:bg-white hover:text-black hover:border-white transition-all text-xs font-bold uppercase tracking-widest"
      >
        Open Dashboard
      </button>
    </div>
  );
};

export default App;
