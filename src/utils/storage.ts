import browser from 'webextension-polyfill';

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

export const getStorage = async (): Promise<StorageData> => {
  const data = await browser.storage.local.get('scrollwatch');
  return data.scrollwatch || { 
    watchlist: {}, 
    stats: { totalBlocks: 0, startTime: Date.now() } 
  };
};

export const setStorage = async (data: StorageData): Promise<void> => {
  await browser.storage.local.set({ scrollwatch: data });
};

export const updateRule = async (domain: string, updates: Partial<Rule>): Promise<void> => {
  const data = await getStorage();
  if (data.watchlist[domain]) {
    data.watchlist[domain] = { ...data.watchlist[domain], ...updates };
    await setStorage(data);
  }
};
