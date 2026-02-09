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

// Lazy load browser API only when needed
let browserApi: typeof import("webextension-polyfill") | null = null;

const getBrowser = async () => {
  if (browserApi) return browserApi;

  try {
    // Check if we're in extension context first
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      browserApi = await import("webextension-polyfill");
      return browserApi;
    }
  } catch {
    // Not in extension context
  }

  return null;
};

export const getStorage = async (): Promise<StorageData> => {
  const browser = await getBrowser();

  if (!browser) {
    // Dev mode: use localStorage
    const stored = localStorage.getItem("scrollwatch-dev");
    return stored ? JSON.parse(stored) : devStorage;
  }

  const data = await browser.storage.local.get("scrollwatch");
  return (
    data.scrollwatch || {
      watchlist: {},
      stats: { totalBlocks: 0, startTime: Date.now() },
    }
  );
};

export const setStorage = async (data: StorageData): Promise<void> => {
  const browser = await getBrowser();

  if (!browser) {
    localStorage.setItem("scrollwatch-dev", JSON.stringify(data));
    return;
  }

  await browser.storage.local.set({ scrollwatch: data });
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
