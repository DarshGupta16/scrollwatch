export interface Rule {
  id: string;
  domain: string;
  allowedDuration: number; // in seconds
  resetInterval: number; // in seconds
  consumedTime: number; // in seconds
  lastReset: number; // timestamp
  isBlocked: boolean;
}

export interface StorageData {
  watchlist: Record<string, Rule>;
}

export const getStorage = async (): Promise<StorageData> => {
  const data = await chrome.storage.local.get('scrollwatch');
  return data.scrollwatch || { watchlist: {} };
};

export const setStorage = async (data: StorageData): Promise<void> => {
  await chrome.storage.local.set({ scrollwatch: data });
};

export const updateRule = async (domain: string, updates: Partial<Rule>): Promise<void> => {
  const data = await getStorage();
  if (data.watchlist[domain]) {
    data.watchlist[domain] = { ...data.watchlist[domain], ...updates };
    await setStorage(data);
  }
};
