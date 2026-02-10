import browser from "webextension-polyfill";

export interface Rule {
  id: string;
  domain: string;
  allowedDuration: number; // in seconds
  resetInterval: number; // in seconds
  consumedTime: number; // in seconds
  lastReset: number; // timestamp
  isBlocked: boolean;
}

export interface Stats {
  totalBlocks: number;
  startTime: number;
}

export interface StorageData {
  watchlist: Record<string, Rule>;
  stats: Stats;
}

// Dev mode mock storage
const devStorage: StorageData = {
  watchlist: {
    "twitter.com": {
      id: "demo1",
      domain: "twitter.com",
      allowedDuration: 1800,
      resetInterval: 86400,
      consumedTime: 600,
      lastReset: Date.now(),
      isBlocked: false,
    },
    "reddit.com": {
      id: "demo2",
      domain: "reddit.com",
      allowedDuration: 900,
      resetInterval: 86400,
      consumedTime: 900,
      lastReset: Date.now(),
      isBlocked: true,
    },
  },
  stats: { totalBlocks: 5, startTime: Date.now() - 86400000 * 7 },
};

// Check if we're in extension context
const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;

export const getStorage = async (): Promise<StorageData> => {
  if (!isExtension) {
    // Dev mode: use localStorage
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("scrollwatch-dev");
      return stored ? JSON.parse(stored) : devStorage;
    }
    return devStorage;
  }

  try {
    const data = await browser.storage.local.get("scrollwatch");
    return (
      data.scrollwatch || {
        watchlist: {},
        stats: { totalBlocks: 0, startTime: Date.now() },
      }
    );
  } catch (e) {
    console.error("Error reading storage:", e);
    return {
      watchlist: {},
      stats: { totalBlocks: 0, startTime: Date.now() },
    };
  }
};

export const setStorage = async (data: StorageData): Promise<void> => {
  if (!isExtension) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("scrollwatch-dev", JSON.stringify(data));
    }
    return;
  }

  try {
    await browser.storage.local.set({ scrollwatch: data });
  } catch (e) {
    console.error("Error writing storage:", e);
  }
};

export const updateRule = async (
  domain: string,
  updates: Partial<Rule>,
): Promise<void> => {
  const data = await getStorage();
  if (data.watchlist[domain]) {
    data.watchlist[domain] = { ...data.watchlist[domain], ...updates };
    await setStorage(data);
  }
};