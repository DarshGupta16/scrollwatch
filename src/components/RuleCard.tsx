import { Rule } from "../utils/storage";
import { formatTime } from "../utils/time";

interface RuleCardProps {
  rule: Rule;
  onDelete: (domain: string) => void;
}

/**
 * Card displaying a single rule with progress bar
 */
export const RuleCard = ({ rule, onDelete }: RuleCardProps) => {
  const progress = Math.min(
    100,
    (rule.consumedTime / rule.allowedDuration) * 100,
  );

  return (
    <div className="group bg-surface border border-border p-6 hover:border-accent transition-colors relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{rule.domain}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 ${rule.isBlocked ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
            ></div>
            <span className="text-xs text-muted uppercase tracking-widest">
              {rule.isBlocked ? "ACCESS LOCKED" : "MONITORING"}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(rule.domain)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 uppercase text-xs font-bold tracking-widest"
        >
          [TERMINATE]
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-muted uppercase">
          <span>Consumption</span>
          <span>
            {formatTime(rule.consumedTime)} / {formatTime(rule.allowedDuration)}
          </span>
        </div>
        <div className="h-2 bg-bg border border-border w-full">
          <div
            className={`h-full ${rule.isBlocked ? "bg-red-500" : "bg-white"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-xs text-muted mt-1">
          RESETS EVERY {formatTime(rule.resetInterval)}
        </div>
      </div>
    </div>
  );
};
