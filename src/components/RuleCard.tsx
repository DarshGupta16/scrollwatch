import { useEffect, useState } from "react";
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
  const [timeUntilReset, setTimeUntilReset] = useState(0);

  useEffect(() => {
    if (!rule.isBlocked) {
      setTimeUntilReset(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const resetTime = rule.lastReset + rule.resetInterval * 1000;
      const left = Math.max(0, Math.floor((resetTime - now) / 1000));
      setTimeUntilReset(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rule.isBlocked, rule.lastReset, rule.resetInterval]);

  const consumptionProgress = Math.min(
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

      <div className="space-y-4">
        {/* Consumption Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted uppercase">
            <span>Consumption</span>
            <span>
              {formatTime(rule.consumedTime)} /{" "}
              {formatTime(rule.allowedDuration)}
            </span>
          </div>
          <div className="h-2 bg-bg border border-border w-full">
            <div
              className={`h-full transition-all duration-300 ${rule.isBlocked ? "bg-red-500" : "bg-white"}`}
              style={{ width: `${consumptionProgress}%` }}
            />
          </div>
        </div>

        {/* Reset Timer Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted uppercase">
            <span>Reset In</span>
            <span>
              {rule.isBlocked
                ? formatTime(timeUntilReset)
                : "WAITING FOR BLOCK"}
            </span>
          </div>
          <div className="h-2 bg-bg border border-border w-full">
            <div
              className={`h-full transition-all duration-300 ${
                rule.isBlocked ? "bg-blue-500" : "bg-blue-500/30"
              }`}
              style={{
                width: `${
                  rule.isBlocked
                    ? (timeUntilReset / rule.resetInterval) * 100
                    : 100
                }%`,
              }}
            />
          </div>
          <div className="text-right text-[10px] text-muted uppercase">
            Interval: {formatTime(rule.resetInterval)}
          </div>
        </div>
      </div>
    </div>
  );
};
