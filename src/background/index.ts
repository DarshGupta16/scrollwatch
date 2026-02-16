import browser, { Runtime } from "webextension-polyfill";
import { normalizeDomain } from "../utils/domain";
import { storageManager } from "./BatchStorageManager";
import { StorageData } from "../utils/storage";

// Track last processed TICK timestamp per domain to prevent double-counting
const lastProcessedTicks: Record<string, number> = {};

const notifyStateChange = async (domain: string, type: "BLOCK_PAGE" | "UNBLOCK_PAGE") => {
  // Notify tabs (for content scripts)
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && normalizeDomain(new URL(tab.url).hostname) === domain) {
      browser.tabs.sendMessage(tab.id!, { type }).catch(() => {});
    }
  }
  
  // Notify internal extension pages (Popup, Dashboard)
  browser.runtime.sendMessage({ type, domain }).catch(() => {});
};

const checkAndResetRules = async () => {
  const data = await storageManager.getData();
  const now = Date.now();
  let changed = false;

  for (const domain in data.watchlist) {
    const rule = data.watchlist[domain];
    const mode = rule.mode || "quota";

    if (mode === "cooldown") {
      if (rule.isBlocked && rule.blockStartTime) {
        if (now - rule.blockStartTime >= rule.resetInterval * 1000) {
          rule.consumedTime = 0;
          rule.isBlocked = false;
          rule.blockStartTime = null;
          changed = true;
          notifyStateChange(domain, "UNBLOCK_PAGE");
        }
      }
    } else {
      if (now - rule.lastReset >= rule.resetInterval * 1000) {
        rule.consumedTime = 0;
        rule.isBlocked = false;
        rule.lastReset = now;
        changed = true;
        notifyStateChange(domain, "UNBLOCK_PAGE");
      }
    }
  }

  if (changed) {
    await storageManager.setData(data, true); // Immediate flush on reset
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

browser.runtime.onMessage.addListener(
  (message: unknown, sender: Runtime.MessageSender) => {
    const msg = message as { type: string; domain?: string; timestamp?: number; watchlist?: Record<string, any> };
    
    if (msg.type === "TICK") {
      return handleTick(msg.domain, msg.timestamp);
    } else if (msg.type === "CHECK_STATUS") {
      return checkStatus(msg.domain || (sender.tab?.url ? normalizeDomain(new URL(sender.tab.url).hostname) : undefined));
    } else if (msg.type === "UPDATE_RULES" && msg.watchlist) {
      return handleUpdateRules(msg.watchlist);
    }
  },
);

const handleUpdateRules = async (watchlist: Record<string, any>) => {
  const data = await storageManager.getData();
  data.watchlist = watchlist;
  await storageManager.setData(data, true); // Immediate flush
};

const handleTick = async (domain?: string, timestamp?: number) => {
  if (!domain || !timestamp) return;

  const lastTick = lastProcessedTicks[domain] || 0;
  const now = Date.now();
  
  // Heuristic: compute elapsed time (max 1000ms)
  const elapsedMs = Math.min(now - lastTick, 1000);
  // Only process if at least 800ms passed since last tick (prevent jitter/double counts)
  if (lastTick !== 0 && now - lastTick < 800) {
    return;
  }

  const data = await storageManager.getData();
  const rule = data.watchlist[domain];

  if (rule && !rule.isBlocked) {
    rule.consumedTime += elapsedMs / 1000;
    lastProcessedTicks[domain] = now;

    if (rule.consumedTime >= rule.allowedDuration) {
      rule.isBlocked = true;
      if (rule.mode === "cooldown") {
        rule.blockStartTime = now;
      }

      if (!data.stats) data.stats = { totalBlocks: 0, startTime: Date.now() };
      data.stats.totalBlocks += 1;

      // Immediate block and global notify
      await notifyStateChange(domain, "BLOCK_PAGE");
      await storageManager.setData(data, true); // Immediate flush on block
    } else {
      await storageManager.setData(data, false); // Batched write
    }
  }
};

const checkStatus = async (domain?: string) => {
  if (!domain) return { isBlocked: false };
  const data = await storageManager.getData();
  const rule = data.watchlist[domain];
  
  if (rule && rule.isBlocked) {
    const now = Date.now();
    const mode = rule.mode || "quota";
    let shouldUnblock = false;

    if (mode === "cooldown") {
      if (rule.blockStartTime && now - rule.blockStartTime >= rule.resetInterval * 1000) {
        shouldUnblock = true;
      }
    } else {
      if (now - rule.lastReset >= rule.resetInterval * 1000) {
        shouldUnblock = true;
      }
    }

    if (shouldUnblock) {
      rule.consumedTime = 0;
      rule.isBlocked = false;
      if (mode === "quota") {
        rule.lastReset = now;
      } else {
        rule.blockStartTime = null;
      }
      
      await storageManager.setData(data, true);
      notifyStateChange(domain, "UNBLOCK_PAGE");
      return { isBlocked: false };
    }
  }

  return { isBlocked: rule?.isBlocked || false };
};

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const domain = normalizeDomain(new URL(tab.url).hostname);
    const data = await storageManager.getData();
    if (data.watchlist[domain]?.isBlocked) {
      browser.tabs.sendMessage(tabId, { type: "BLOCK_PAGE" }).catch(() => {});
    }
  }
});

// Handle extension suspend
browser.runtime.onSuspend?.addListener(() => {
  storageManager.flush();
});
