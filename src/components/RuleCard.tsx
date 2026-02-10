import { useEffect, useState } from "react";
import { Rule } from "../utils/storage";
import { formatTime } from "../utils/time";

interface RuleCardProps {
  rule: Rule;
  onDelete?: (domain: string) => void;
  onEdit?: (rule: Rule) => void;
  showControls?: boolean;
}

/**
 * Card displaying a single rule with progress bar
 */
export const RuleCard = ({
  rule,
  onDelete = () => {},
  onEdit = () => {},
  showControls = true,
}: RuleCardProps) => {
  const [time, setTime] = useState(0);
  const mode = rule.mode || "quota";

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      let newTime = 0;

      if (mode === "cooldown") {
        if (rule.isBlocked && rule.blockStartTime) {
          const cooldownEnd = rule.blockStartTime + rule.resetInterval * 1000;
          newTime = Math.max(0, Math.floor((cooldownEnd - now) / 1000));
        }
      } else {
        // Quota mode
        const resetTime = rule.lastReset + rule.resetInterval * 1000;
        newTime = Math.max(0, Math.floor((resetTime - now) / 1000));
      }
      setTime(newTime);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    rule.lastReset,
    rule.resetInterval,
    rule.isBlocked,
    rule.blockStartTime,
    mode,
  ]);

  const consumptionProgress = Math.min(
    100,
    (rule.consumedTime / rule.allowedDuration) * 100,
  );

  const secondBarLabel = mode === "cooldown" ? "Cooldown" : "Reset In";
  const secondBarProgress =
    mode === "cooldown"
      ? rule.isBlocked
        ? (time / rule.resetInterval) * 100
        : 100
      : (time / rule.resetInterval) * 100;
  const secondBarTime =
    mode === "cooldown"
      ? rule.isBlocked
        ? formatTime(time)
        : "[WAITING FOR BLOCK]"
      : formatTime(time);

  return (
    <div className="group bg-surface border border-border p-6 hover:border-accent transition-colors relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{rule.domain}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 ${
                rule.isBlocked ? "bg-red-500" : "bg-green-500 animate-pulse"
              }`}
            ></div>
            <span className="text-xs text-muted uppercase tracking-widest">
              {rule.isBlocked ? "ACCESS LOCKED" : "MONITORING"}
            </span>
          </div>
        </div>
        {showControls && (
          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(rule)}
              className="text-muted hover:text-accent uppercase text-xs font-bold tracking-widest"
            >
              [EDIT]
            </button>
            <button
              onClick={() => onDelete(rule.domain)}
              className="text-muted hover:text-red-500 uppercase text-xs font-bold tracking-widest"
            >
              [TERMINATE]
            </button>
          </div>
        )}
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
              className={`h-full transition-all duration-300 ${
                rule.isBlocked ? "bg-red-500" : "bg-white"
              }`}
              style={{ width: `${consumptionProgress}%` }}
            />
          </div>
        </div>

        {/* Reset / Cooldown Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted uppercase">
            <span>{secondBarLabel}</span>
            <span>{secondBarTime}</span>
          </div>
          <div className="h-2 bg-bg border border-border w-full">
            <div
              className={`h-full transition-all duration-300 ${
                rule.isBlocked ? "bg-blue-500" : "bg-blue-500/50"
              }`}
              style={{
                width: `${secondBarProgress}%`,
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
