import { Rule, Stats } from "../../utils/storage";

interface StatsTabProps {
  stats: Stats;
  rules: Rule[];
}

export const StatsTab = ({ stats, rules }: StatsTabProps) => {
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
              ? (totalTimeSaved / 60).toFixed(1) + "h"
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
