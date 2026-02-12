import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { Rule } from "../utils/storage";
import { formatTime } from "../utils/time";

// Helper to check if we are in an extension context
const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;

interface RuleCardProps {
  rule: Rule;
  onDelete: (domain: string) => void;
}

/**
 * Card displaying a single rule with progress bar
 */
export const RuleCard = ({ rule, onDelete }: RuleCardProps) => {
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  const [visualConsumed, setVisualConsumed] = useState(rule.consumedTime);

  // Sync visual time with official time ONLY on initialization or reset
  useEffect(() => {
    setVisualConsumed((prev) => {
      // If the official time jumped significantly (more than 2s difference)
      // or if it's a reset (new official < current visual), we sync.
      // Otherwise, we let the local optimistic timer lead for smoothness.
      if (Math.abs(rule.consumedTime - prev) > 2 || rule.consumedTime < prev || rule.isBlocked) {
        return rule.consumedTime;
      }
      return prev;
    });
  }, [rule.consumedTime, rule.isBlocked]);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const resetTime = rule.lastReset + rule.resetInterval * 1000;
      const left = Math.max(0, Math.floor((resetTime - now) / 1000));
      setTimeUntilReset(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rule.lastReset, rule.resetInterval]);

  // Optimistic Increment: Listen for heartbeats to tick up locally
  useEffect(() => {
    if (!isExtension) return;

    const messageListener = (message: any) => {
      if (message.type === "ACTIVITY_HEARTBEAT") {
        try {
          const domain = new URL(message.url).hostname.replace("www.", "");
          if (domain === rule.domain && !rule.isBlocked) {
            setVisualConsumed(prev => Math.min(rule.allowedDuration, prev + 1));
          }
        } catch (e) {}
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    return () => browser.runtime.onMessage.removeListener(messageListener);
  }, [rule.domain, rule.isBlocked, rule.allowedDuration]);

  const consumptionProgress = Math.min(
    100,
    (visualConsumed / rule.allowedDuration) * 100,
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
              {formatTime(visualConsumed)} /{" "}
              {formatTime(rule.allowedDuration)}
            </span>
          </div>
          <div className="h-2 bg-bg border border-border w-full">
            <div
              className={`h-full transition-[width] duration-1000 ease-linear ${rule.isBlocked ? "bg-red-500" : "bg-white"}`}
              style={{ width: `${consumptionProgress}%` }}
            />
          </div>
        </div>

        {/* Reset Timer Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted uppercase">
            <span>Reset In</span>
            <span>{formatTime(timeUntilReset)}</span>
          </div>
          <div className="h-2 bg-bg border border-border w-full">
            <div
              className={`h-full transition-all duration-300 ${
                rule.isBlocked ? "bg-blue-500" : "bg-blue-500/50"
              }`}
              style={{
                width: `${(timeUntilReset / rule.resetInterval) * 100}%`,
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
