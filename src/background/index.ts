import browser from 'webextension-polyfill';
import { getStorage, setStorage, Rule } from '../utils/storage';

const checkAndResetRules = async () => {
  const data = await getStorage();
  const now = Date.now();
  let changed = false;

  for (const domain in data.watchlist) {
    const rule = data.watchlist[domain];
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      rule.consumedTime = 0;
      rule.lastReset = now;
      rule.isBlocked = false;
      changed = true;
    }
  }

  if (changed) {
    await setStorage(data);
  }
};

// Check every minute
setInterval(checkAndResetRules, 60000);

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SCROLL_ACTIVITY') {
    handleScrollActivity(sender.tab?.url);
  } else if (message.type === 'CHECK_STATUS') {
    return checkStatus(sender.tab?.url);
  }
});

const checkStatus = async (url?: string) => {
  if (!url) return { isBlocked: false };
  try {
    const domain = new URL(url).hostname;
    const data = await getStorage();
    return { isBlocked: !!data.watchlist[domain]?.isBlocked };
  } catch (e) {
    return { isBlocked: false };
  }
};

const handleScrollActivity = async (url?: string) => {
  if (!url) return;
  
  const domain = new URL(url).hostname;
  const data = await getStorage();
  const rule = data.watchlist[domain];

  if (rule && !rule.isBlocked) {
    rule.consumedTime += 1;
    
    if (rule.consumedTime >= rule.allowedDuration) {
      rule.isBlocked = true;
      // Notify all tabs of this domain
      const tabs = await browser.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && new URL(tab.url).hostname === domain) {
          browser.tabs.sendMessage(tab.id!, { type: 'BLOCK_PAGE' });
        }
      });
    }
    await setStorage(data);
  }
};

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = new URL(tab.url).hostname;
    const data = await getStorage();
    if (data.watchlist[domain]?.isBlocked) {
      browser.tabs.sendMessage(tabId, { type: 'BLOCK_PAGE' });
    }
  }
});
