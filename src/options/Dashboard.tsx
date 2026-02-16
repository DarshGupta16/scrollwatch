import { useState } from "react";
import { TimeValue } from "../components/TimeInput";
import { TabButton } from "../components/TabButton";
import { StatsTab } from "./tabs/StatsTab";
import { CommandTab } from "./tabs/CommandTab";
import { LogsTab } from "./tabs/LogsTab";
import { useWatchlist } from "../hooks/useWatchlist";
import { toHMS } from "../utils/time";
import { Rule } from "../utils/storage";

type TabType = "stats" | "command" | "logs";
type ModeType = "quota" | "cooldown";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [newDomain, setNewDomain] = useState("");
  const [durationTime, setDurationTime] = useState<TimeValue>({
    h: 0,
    m: 50,
    s: 0,
  });
  const [resetTime, setResetTime] = useState<TimeValue>({ h: 1, m: 0, s: 0 });
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [mode, setMode] = useState<ModeType>("quota");

  const { watchlist, stats, loading, addRule, updateRule, deleteRule } = useWatchlist();
  const rules = Object.values(watchlist);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-8 animate-pulse text-accent">
            ScrollWatch
          </h1>
          <div className="w-12 h-1 bg-border relative overflow-hidden mx-auto">
            <div className="absolute inset-0 bg-accent animate-[loading_1.5s_infinite]"></div>
          </div>
          <p className="mt-4 text-[10px] text-muted uppercase tracking-[0.3em]">
            System Calibration in Progress
          </p>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  const handleEditRule = (rule: Rule) => {
    setNewDomain(rule.domain);
    setDurationTime(toHMS(rule.allowedDuration));
    setResetTime(toHMS(rule.resetInterval));
    setEditingRuleId(rule.domain);
    setMode(rule.mode || "quota");
    setActiveTab("command");
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    if (editingRuleId) {
      await updateRule(editingRuleId, newDomain, durationTime, resetTime, mode);
      setEditingRuleId(null);
    } else {
      await addRule(newDomain, durationTime, resetTime, mode);
    }

    setNewDomain("");
    setDurationTime({ h: 0, m: 50, s: 0 });
    setResetTime({ h: 1, m: 0, s: 0 });
    setMode("quota");
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
          onAddRule={handleSubmitRule}
          onDeleteRule={deleteRule}
          onEditRule={handleEditRule}
          isEditing={!!editingRuleId}
          mode={mode}
          setMode={setMode}
        />
      )}
      {activeTab === "logs" && <LogsTab rules={rules} />}
    </div>
  );
};

export default Dashboard;
