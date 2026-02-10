import browser, { Runtime } from "webextension-polyfill";
import { BatchStorageManager } from "./BatchStorageManager";
import { normalizeDomain } from "../utils/domain";

// Initialize Manager (10 second flush interval)
const manager = new BatchStorageManager(10000);

// Initialize on extension start
manager.init();

const checkRulesAlarm = async () => {
  await manager.checkAllRules();
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
    checkRulesAlarm();
  }
});

// Keep track of active sessions for elapsed time calculation
const activeSessions: Record<
  number,
  { domain: string; lastHeartbeat: number }
> = {};

browser.runtime.onMessage.addListener(
  (message: unknown, sender: Runtime.MessageSender) => {
    const msg = message as { type: string; url?: string };
    if (msg.type === "ACTIVITY_HEARTBEAT") {
      return handleHeartbeat(sender.tab?.id, msg.url || sender.tab?.url);
    } else if (msg.type === "CHECK_STATUS") {
      return checkStatus(msg.url || sender.tab?.url);
    }
  },
);

const handleHeartbeat = async (tabId?: number, url?: string) => {
  if (!tabId || !url) return;

  try {
    const domain = normalizeDomain(new URL(url).hostname);
    const now = Date.now();
    
    const session = activeSessions[tabId];
    let elapsed = 0;

    if (session && session.domain === domain) {
      // Calculate elapsed time since last heartbeat
      const diff = (now - session.lastHeartbeat) / 1000;
      
      // If gap is too large (e.g. > 2s), assume user was away/inactive/reloaded.
      // Don't penalize for time spent inactive. Treat as resume (0s).
      // We start counting from the NEXT heartbeat.
      if (diff > 2.0) {
        console.log(`[Heartbeat] Tab ${tabId} ${domain} - Large Gap (${diff.toFixed(2)}s) - Resetting elapsed to 0s`);
        elapsed = 0;
      } else {
        elapsed = diff;
      }
      // console.log(`[Heartbeat] Tab ${tabId} ${domain} - Diff: ${diff.toFixed(2)}s - Elapsed: ${elapsed.toFixed(2)}s`);
    } else {
      // First heartbeat in this session
      console.log(`[Heartbeat] Tab ${tabId} ${domain} - First heartbeat (New Session)`);
      elapsed = 0;
    }

    // Update via Manager
    const result = await manager.incrementTime(domain, elapsed);

    if (result.justBlocked) {
      // Notify this tab specifically
      browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" });
      
      // Also notify other tabs for this domain to keep them in sync
       const tabs = await browser.tabs.query({});
        tabs.forEach((tab) => {
          if (
            tab.id !== tabId && // Skip current tab as we just messaged it
            tab.url &&
            normalizeDomain(new URL(tab.url).hostname) === domain
          ) {
            browser.tabs.sendMessage(tab.id!, { type: "BLOCK_PAGE" });
          }
        });
    } else if (result.isBlocked) {
       // Should be blocked but wasn't *just* blocked. 
       // Ensure tab is blocked (idempotent)
       browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" });
    }

    activeSessions[tabId] = { domain, lastHeartbeat: now };
  } catch (e) {
    console.error("Heartbeat error:", e);
  }
};

const checkStatus = async (url?: string) => {
  if (!url) return { isBlocked: false };
  try {
    const domain = normalizeDomain(new URL(url).hostname);
    const isBlocked = await manager.checkStatus(domain);
    return { isBlocked };
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
  // Reset session tracking on navigation/reload
  if (changeInfo.status === "loading") {
    console.log(`[Background] Tab ${tabId} loading - Clearing session.`);
    delete activeSessions[tabId];
  }

  if (changeInfo.status === "complete" && tab.url) {
    const domain = normalizeDomain(new URL(tab.url).hostname);
    const isBlocked = await manager.checkStatus(domain);
    if (isBlocked) {
      browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" });
    }
  }
});

// Safety Net: Save on suspend
// Note: onSuspend is not supported in all browsers/manifest versions reliably, but good to have.
if (browser.runtime.onSuspend) {
  browser.runtime.onSuspend.addListener(() => {
    manager.forceSave();
  });
}