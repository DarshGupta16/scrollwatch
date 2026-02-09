import { Rule } from "../../utils/storage";
import { formatTime } from "../../utils/time";

interface LogsTabProps {
  rules: Rule[];
}

export const LogsTab = ({ rules }: LogsTabProps) => (
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
