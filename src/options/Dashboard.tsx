import React, { useState } from "react";
import { TimeInput, TimeValue } from "../components/TimeInput";
import { RuleCard } from "../components/RuleCard";
import { useWatchlist } from "../hooks/useWatchlist";
import { formatTime } from "../utils/time";

type TabType = "stats" | "command" | "logs";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [newDomain, setNewDomain] = useState("");
  const [durationTime, setDurationTime] = useState<TimeValue>({
    h: 0,
    m: 50,
    s: 0,
  });
  const [resetTime, setResetTime] = useState<TimeValue>({ h: 1, m: 0, s: 0 });

  const { watchlist, stats, addRule, deleteRule } = useWatchlist();
  const rules = Object.values(watchlist);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    await addRule(newDomain, durationTime, resetTime);
    setNewDomain("");
  };

  // Tab button
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
        activeTab === tab
          ? "border-white text-white"
          : "border-transparent text-muted hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  // Stats Tab
  const StatsTab = () => {
    const daysSinceStart =
      Math.floor((Date.now() - stats.startTime) / (1000 * 60 * 60 * 24)) || 1;
    const avgBlocksPerDay = (stats.totalBlocks / daysSinceStart).toFixed(1);
    const totalTimeSaved = stats.totalBlocks * 15;

    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface border border-border p-8 text-center">
            <div className="text-6xl font-bold mb-2">{stats.totalBlocks}</div>
            <div className="text-xs text-muted uppercase tracking-widest">
              Total Blocks
            </div>
          </div>
          <div className="bg-surface border border-border p-8 text-center">
            <div className="text-6xl font-bold mb-2">
              {totalTimeSaved >= 60
                ? Math.floor(totalTimeSaved / 60) + "h"
                : totalTimeSaved + "m"}
            </div>
            <div className="text-xs text-muted uppercase tracking-widest">
              Time Reclaimed
            </div>
          </div>
          <div className="bg-surface border border-border p-8 text-center">
            <div className="text-6xl font-bold mb-2">{avgBlocksPerDay}</div>
            <div className="text-xs text-muted uppercase tracking-widest">
              Avg Blocks/Day
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border p-8">
          <h3 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">
            Active Monitoring
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rules.length === 0 ? (
              <div className="col-span-full text-center text-muted uppercase tracking-widest py-8">
                No domains being monitored
              </div>
            ) : (
              rules.map((rule) => (
                <div key={rule.domain} className="p-4 border border-border">
                  <div className="font-bold truncate">{rule.domain}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`w-2 h-2 ${rule.isBlocked ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
                    ></div>
                    <span className="text-xs text-muted uppercase">
                      {rule.isBlocked ? "Locked" : "Active"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Command Tab
  const CommandTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <section className="lg:col-span-1">
        <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">
          Add Protocol
        </h2>
        <form
          onSubmit={handleAddRule}
          className="space-y-6 bg-surface p-8 border border-border"
        >
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
              Target Domain
            </label>
            <input
              type="text"
              placeholder="twitter.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full bg-bg border border-border p-3 text-sm focus:border-accent outline-none font-mono"
            />
          </div>
          <TimeInput
            label="Duration Limit (H:M:S)"
            value={durationTime}
            onChange={setDurationTime}
          />
          <TimeInput
            label="Reset Interval (H:M:S)"
            value={resetTime}
            onChange={setResetTime}
          />
          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-4 hover:bg-gray-200 transition-colors uppercase tracking-widest border border-white"
          >
            Initialize Rule
          </button>
        </form>
      </section>

      <section className="lg:col-span-2">
        <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-border pl-4">
          Active Protocols
        </h2>
        <div className="grid gap-4">
          {rules.length === 0 ? (
            <div className="p-12 border border-border border-dashed text-center text-muted uppercase tracking-widest">
              No active protocols detected.
            </div>
          ) : (
            rules.map((rule) => (
              <RuleCard key={rule.domain} rule={rule} onDelete={deleteRule} />
            ))
          )}
        </div>
      </section>
    </div>
  );

  // Logs Tab
  const LogsTab = () => (
    <div className="space-y-6">
      <div className="bg-surface border border-border p-8">
        <h3 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">
          Activity Log
        </h3>
        <div className="space-y-2 font-mono text-sm">
          {rules.length === 0 ? (
            <div className="text-center text-muted uppercase tracking-widest py-12">
              No activity recorded yet.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.domain}
                className="flex justify-between items-center py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 ${rule.isBlocked ? "bg-red-500" : "bg-green-500"}`}
                  ></div>
                  <span className="font-bold">{rule.domain}</span>
                </div>
                <div className="text-muted">
                  {formatTime(rule.consumedTime)} consumed
                  {rule.isBlocked && (
                    <span className="text-red-500 ml-4">[BLOCKED]</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="text-center text-xs text-muted uppercase tracking-widest">
        Detailed logging coming in future updates
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text p-12 max-w-6xl mx-auto selection:bg-accent selection:text-black">
      <header className="mb-8 border-b border-border pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase mb-2">
            ScrollWatch
          </h1>
          <p className="text-muted font-mono uppercase tracking-widest text-sm">
            System v2.0
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm text-muted uppercase tracking-widest">
            Active Rules
          </div>
          <div className="text-4xl font-bold">{rules.length}</div>
        </div>
      </header>

      <nav className="flex gap-0 border-b border-border mb-12">
        <TabButton tab="stats" label="Stats" />
        <TabButton tab="command" label="Command Center" />
        <TabButton tab="logs" label="Logs" />
      </nav>

      {activeTab === "stats" && <StatsTab />}
      {activeTab === "command" && <CommandTab />}
      {activeTab === "logs" && <LogsTab />}
    </div>
  );
};

export default Dashboard;
