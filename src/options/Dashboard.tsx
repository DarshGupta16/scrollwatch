import { useState } from "react";
import { TimeValue } from "../components/TimeInput";
import { TabButton } from "../components/TabButton";
import { StatsTab } from "./tabs/StatsTab";
import { CommandTab } from "./tabs/CommandTab";
import { LogsTab } from "./tabs/LogsTab";
import { useWatchlist } from "../hooks/useWatchlist";

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
        <TabButton
          tab="stats"
          activeTab={activeTab}
          label="Stats"
          onClick={(tab) => setActiveTab(tab as TabType)}
        />
        <TabButton
          tab="command"
          activeTab={activeTab}
          label="Command Center"
          onClick={(tab) => setActiveTab(tab as TabType)}
        />
        <TabButton
          tab="logs"
          activeTab={activeTab}
          label="Logs"
          onClick={(tab) => setActiveTab(tab as TabType)}
        />
      </nav>

      {activeTab === "stats" && <StatsTab stats={stats} rules={rules} />}
      {activeTab === "command" && (
        <CommandTab
          newDomain={newDomain}
          setNewDomain={setNewDomain}
          durationTime={durationTime}
          setDurationTime={setDurationTime}
          resetTime={resetTime}
          setResetTime={setResetTime}
          rules={rules}
          onAddRule={handleAddRule}
          onDeleteRule={deleteRule}
        />
      )}
      {activeTab === "logs" && <LogsTab rules={rules} />}
    </div>
  );
};

export default Dashboard;
