import browser, { Runtime } from "webextension-polyfill";
import { BatchStorageManager } from "./BatchStorageManager";
import { normalizeDomain } from "../utils/domain";

// Initialize Manager (5 second flush interval)
const manager = new BatchStorageManager(5000);

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
// We use a local cache for speed, but ideally sync to storage.session
const activeSessions: Record<
  number,
  { domain: string; lastHeartbeat: number }
> = {};

// Helper to get/set session state reliably across SW restarts
const getSession = async (tabId: number) => {
  if (activeSessions[tabId]) return activeSessions[tabId];
  
  try {
    if (browser.storage && (browser.storage as any).session) {
      const res = await (browser.storage as any).session.get(`session_${tabId}`);
      if (res[`session_${tabId}`]) {
        activeSessions[tabId] = res[`session_${tabId}`];
        return activeSessions[tabId];
      }
    }
  } catch (e) {
    // Session storage not available or failed
  }
  return null;
};

const setSession = async (tabId: number, domain: string, lastHeartbeat: number) => {
  const session = { domain, lastHeartbeat };
  activeSessions[tabId] = session;
  
  try {
    if (browser.storage && (browser.storage as any).session) {
      await (browser.storage as any).session.set({ [`session_${tabId}`]: session });
    }
  } catch (e) {
    // Session storage not available or failed
  }
};

const removeSession = async (tabId: number) => {
  delete activeSessions[tabId];
  try {
    if (browser.storage && (browser.storage as any).session) {
      await (browser.storage as any).session.remove(`session_${tabId}`);
    }
  } catch (e) {
    // Session storage not available or failed
  }
};

browser.runtime.onMessage.addListener(
  (message: unknown, sender: Runtime.MessageSender) => {
    const msg = message as { type: string; url?: string; rule?: any; domain?: string };
    if (msg.type === "ACTIVITY_HEARTBEAT") {
      return handleHeartbeat(sender.tab?.id, msg.url || sender.tab?.url);
    } else if (msg.type === "CHECK_STATUS") {
      return checkStatus(msg.url || sender.tab?.url);
    } else if (msg.type === "GET_STATE") {
      return manager.getData();
    } else if (msg.type === "ADD_RULE") {
      return manager.addRule(msg.rule);
    } else if (msg.type === "DELETE_RULE") {
      return manager.deleteRule(msg.domain!);
    }
    return undefined;
  },
);

const handleHeartbeat = async (tabId?: number, url?: string) => {
  if (!tabId || !url) return;

  try {
    const domain = normalizeDomain(new URL(url).hostname);
    const now = Date.now();
    
    const session = await getSession(tabId);
    let elapsed = 0;

    if (session && session.domain === domain) {
      // Calculate elapsed time since last heartbeat
      const diff = (now - session.lastHeartbeat) / 1000;
      
      // Trust up to 5 seconds. If longer, assume user was away or tab was sleeping.
      if (diff > 5.0) {
        elapsed = 0;
      } else {
        elapsed = diff;
      }
    } else {
      // First heartbeat in this session
      elapsed = 0;
    }

    // Update via Manager
    const result = await manager.incrementTime(domain, elapsed);

    if (result.justBlocked) {
      // Notify this tab specifically
      browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" }).catch(() => {});
      
      // Also notify other tabs for this domain to keep them in sync
       const tabs = await browser.tabs.query({});
        tabs.forEach((tab) => {
          if (
            tab.id !== tabId && 
            tab.url &&
            normalizeDomain(new URL(tab.url).hostname) === domain
          ) {
            browser.tabs.sendMessage(tab.id!, { type: "BLOCK_PAGE" }).catch(() => {});
          }
        });
    } else if (result.isBlocked) {
       browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" }).catch(() => {});
    }

    await setSession(tabId, domain, now);
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
setInterval(async () => {
  const now = Date.now();
  for (const tabId in activeSessions) {
    if (now - activeSessions[parseInt(tabId)].lastHeartbeat > 30000) {
      await removeSession(parseInt(tabId));
    }
  }
}, 30000);

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Reset session tracking on navigation/reload
  if (changeInfo.status === "loading") {
    await removeSession(tabId);
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