import browser, { Runtime } from "webextension-polyfill";
import { getStorage, setStorage, Rule } from "../utils/storage";

const checkAndResetRules = async () => {
  const data = await getStorage();
  const now = Date.now();
  let changed = false;

  for (const domain in data.watchlist) {
    const rule = data.watchlist[domain];
    // Constant Interval: Reset if time passed, regardless of block status
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      rule.consumedTime = 0;
      rule.isBlocked = false;
      // Reset logic: advance lastReset to now (or conceptually start of new interval)
      rule.lastReset = now;
      changed = true;
    }
  }

  if (changed) {
    await setStorage(data);
  }
};

const ensureAlarm = async () => {
  const alarm = await browser.alarms.get("checkRules");
  if (!alarm) {
    await browser.alarms.create("checkRules", { periodInMinutes: 1 });
  }
};

browser.runtime.onInstalled.addListener(ensureAlarm);
browser.runtime.onStartup.addListener(ensureAlarm);
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkRules") {
    checkAndResetRules();
  }
});

// Keep track of active sessions
const activeSessions: Record<
  number,
  { domain: string; lastHeartbeat: number }
> = {};

browser.runtime.onMessage.addListener(
  (message: unknown, sender: Runtime.MessageSender) => {
    const msg = message as { type: string };
    if (msg.type === "ACTIVITY_HEARTBEAT") {
      handleHeartbeat(sender.tab?.id, sender.tab?.url);
    } else if (msg.type === "CHECK_STATUS") {
      return checkStatus(sender.tab?.url);
    }
  },
);

const handleHeartbeat = async (tabId?: number, url?: string) => {
  if (!tabId || !url) return;

  try {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const data = await getStorage();
    const rule = data.watchlist[domain];

    if (rule && !rule.isBlocked) {
      const session = activeSessions[tabId];

      if (session && session.domain === domain) {
        // Calculate elapsed time since last heartbeat (max 5s to prevent jumps)
        const elapsed = Math.min((now - session.lastHeartbeat) / 1000, 5);
        rule.consumedTime += elapsed;

        if (rule.consumedTime >= rule.allowedDuration) {
          rule.isBlocked = true;
          // Constant Interval: Do NOT reset lastReset on block
          // rule.lastReset = now;

          if (!data.stats)
            data.stats = { totalBlocks: 0, startTime: Date.now() };
          data.stats.totalBlocks += 1;

          // Notify all tabs
          const tabs = await browser.tabs.query({});
          tabs.forEach((tab) => {
            if (tab.url && new URL(tab.url).hostname === domain) {
              browser.tabs.sendMessage(tab.id!, { type: "BLOCK_PAGE" });
            }
          });
        }
      }

      activeSessions[tabId] = { domain, lastHeartbeat: now };
      await setStorage(data);
    }
  } catch (e) {
    console.error("Heartbeat error:", e);
  }
};

const checkStatus = async (url?: string) => {
  if (!url) return { isBlocked: false };
  try {
    const domain = new URL(url).hostname;
    const data = await getStorage();
    const rule = data.watchlist[domain];

    if (rule) {
      // Lazy reset: Check if we should reset right now
      const now = Date.now();
      if (now - rule.lastReset >= rule.resetInterval * 1000) {
        rule.consumedTime = 0;
        rule.isBlocked = false;
        rule.lastReset = now; // Update timestamp
        await setStorage(data); // Save the unblock immediately
      }
    }

    return { isBlocked: data.watchlist[domain]?.isBlocked || false };
  } catch {
    return { isBlocked: false };
  }
};

// Cleanup inactive sessions
setInterval(() => {
  const now = Date.now();
  for (const tabId in activeSessions) {
    if (now - activeSessions[tabId].lastHeartbeat > 10000) {
      delete activeSessions[tabId];
    }
  }
}, 10000);

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const domain = new URL(tab.url).hostname;
    const data = await getStorage();
    if (data.watchlist[domain]?.isBlocked) {
      browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" });
    }
  }
});
