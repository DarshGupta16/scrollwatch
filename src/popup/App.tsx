import React, { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { useWatchlist } from "../hooks/useWatchlist";
import { RuleCard } from "../components/RuleCard";
import { normalizeDomain } from "../utils/domain";

const App = () => {
  const { watchlist, stats, deleteRule } = useWatchlist(1000); // Faster refresh for popup
  const [currentDomain, setCurrentDomain] = useState<string>("");

  useEffect(() => {
    // Get current tab's domain
    const getCurrentTab = async () => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.url) {
          const domain = normalizeDomain(new URL(tabs[0].url).hostname);
          setCurrentDomain(domain);
        }
      } catch {
        // Ignore errors
      }
    };
    getCurrentTab();
  }, []);

  const currentRule = currentDomain ? watchlist[currentDomain] : null;

  const openDashboard = () => {
    browser.runtime.openOptionsPage();
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
      {/* Current Site Status */}
      {currentDomain && (
        <div className="mb-6">
          {currentRule ? (
            <RuleCard rule={currentRule} onDelete={deleteRule} />
          ) : (
            <div className="bg-surface border border-border p-4">
              <h3 className="text-lg font-bold tracking-tight truncate mb-2">
                {currentDomain}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted"></div>
                <span className="text-xs text-muted uppercase tracking-widest">
                  NOT TRACKED
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex-1 space-y-4">
        <div>
          <div className="text-3xl font-bold text-text leading-none">
            {stats.totalBlocks}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest mt-1">
            Blocks Today
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-text leading-none">
            {((stats.totalBlocks * 15) / 60).toFixed(1)}h
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
