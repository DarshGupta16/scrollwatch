import browser from "webextension-polyfill";
import { getStorage, setStorage, StorageData, Rule } from "../utils/storage";

export class BatchStorageManager {
  private data: StorageData | null = null;
  private isDirty: boolean = false;
  private flushIntervalMs: number = 10000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(flushIntervalMs = 10000) {
    this.flushIntervalMs = flushIntervalMs;
  }

  async init() {
    this.data = await getStorage();
    this.startFlushLoop();
    
    // Listen for external updates (e.g. Options page adding rules)
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.scrollwatch) {
        this.syncFromStorage(changes.scrollwatch.newValue as StorageData);
      }
    });
  }

  /**
   * Merges external storage changes into memory without overwriting active tracking data.
   */
  private syncFromStorage(newData: StorageData | undefined) {
    if (!newData || !this.data) return;

    // 1. Sync Watchlist
    const newWatchlist = newData.watchlist || {};
    const currentWatchlist = this.data.watchlist || {};

    // Check for removed rules
    for (const domain in currentWatchlist) {
      if (!newWatchlist[domain]) {
        delete currentWatchlist[domain];
      }
    }

    // Check for added/updated rules
    for (const domain in newWatchlist) {
      const incoming = newWatchlist[domain];
      const current = currentWatchlist[domain];

      if (!current) {
        // New rule: Accept fully
        currentWatchlist[domain] = incoming;
      } else {
        // Existing rule: Update config, PRESERVE tracking state
        // If the UI overwrites consumedTime with 0 (stale), we ignore it.
        // We only accept config changes.
        current.allowedDuration = incoming.allowedDuration;
        current.resetInterval = incoming.resetInterval;
        
        // Note: If the user manually resets a rule in UI, we might miss it here?
        // But currently UI only deletes. 
      }
    }

    this.data.watchlist = currentWatchlist;
    // We don't sync stats usually, assuming Background is the writer.
  }

  getRule(domain: string): Rule | undefined {
    return this.data?.watchlist[domain];
  }

  getStats() {
    return this.data?.stats;
  }

  async incrementTime(domain: string, seconds: number): Promise<{ isBlocked: boolean; justBlocked: boolean }> {
    if (!this.data) await this.init();
    if (!this.data) return { isBlocked: false, justBlocked: false };

    const rule = this.data.watchlist[domain];
    if (!rule) return { isBlocked: false, justBlocked: false };

    // Check for reset first (logic moved from checkAndResetRules to here for consistency)
    const now = Date.now();
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      console.log(`[Manager] Resetting rule for ${domain}. Elapsed since reset: ${(now - rule.lastReset)/1000}s`);
      rule.consumedTime = 0;
      rule.isBlocked = false;
      rule.lastReset = now;
      this.isDirty = true;
    }

    if (rule.isBlocked) return { isBlocked: true, justBlocked: false };

    rule.consumedTime += seconds;
    this.isDirty = true;

    if (rule.consumedTime >= rule.allowedDuration) {
      rule.isBlocked = true;
      if (!this.data.stats) {
        this.data.stats = { totalBlocks: 0, startTime: Date.now() };
      }
      this.data.stats.totalBlocks += 1;
      
      // Flush IMMEDIATELY on block to ensure other tabs/popup see it ASAP
      await this.flush(); 
      return { isBlocked: true, justBlocked: true };
    }

    return { isBlocked: false, justBlocked: false };
  }

  async checkStatus(domain: string): Promise<boolean> {
    if (!this.data) await this.init();
    
    const rule = this.data?.watchlist[domain];
    if (!rule) return false;

    // Lazy reset check
    const now = Date.now();
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      console.log(`[Manager] checkStatus Resetting rule for ${domain}`);
      rule.consumedTime = 0;
      rule.isBlocked = false;
      rule.lastReset = now;
      this.isDirty = true;
      // We modified state, but maybe don't need to flush immediately unless we want to persist the reset timestamp
      // For safety, let's mark dirty and let the loop handle it
    }

    return rule.isBlocked;
  }

  async checkAllRules() {
    if (!this.data) await this.init();
    if (!this.data) return;

    const now = Date.now();
    let changed = false;

    for (const domain in this.data.watchlist) {
      const rule = this.data.watchlist[domain];
      if (now - rule.lastReset >= rule.resetInterval * 1000) {
        rule.consumedTime = 0;
        rule.isBlocked = false;
        rule.lastReset = now;
        changed = true;
      }
    }

    if (changed) {
      this.isDirty = true;
      await this.flush();
    }
  }

  async flush() {
    if (!this.data || !this.isDirty) return;
    
    try {
      await setStorage(this.data);
      this.isDirty = false;
    } catch (e) {
      console.error("Failed to flush storage:", e);
    }
  }

  private startFlushLoop() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  async forceSave() {
    await this.flush();
  }
}
