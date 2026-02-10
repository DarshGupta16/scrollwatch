import browser from "webextension-polyfill";
import { getStorage, setStorage, StorageData, Rule } from "../utils/storage";

export class BatchStorageManager {
  private data: StorageData | null = null;
  private isDirty: boolean = false;
  private dirtyCount: number = 0;
  private flushIntervalMs: number = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(flushIntervalMs = 5000) {
    this.flushIntervalMs = flushIntervalMs;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.data = await getStorage();
      this.startFlushLoop();

      // Listen for external updates (e.g. Options page adding rules)
      browser.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.scrollwatch) {
          this.syncFromStorage(changes.scrollwatch.newValue as StorageData);
        }
      });
    })();

    return this.initPromise;
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
        current.allowedDuration = incoming.allowedDuration;
        current.resetInterval = incoming.resetInterval;
        // Also sync isBlocked if it changed in storage (e.g. manual unblock/block)
        current.isBlocked = incoming.isBlocked;
      }
    }

    this.data.watchlist = currentWatchlist;
    
    // Sync stats if they are newer (simple heuristic: higher totalBlocks)
    if (newData.stats && (!this.data.stats || newData.stats.totalBlocks > this.data.stats.totalBlocks)) {
      this.data.stats = newData.stats;
    }
  }

  getRule(domain: string): Rule | undefined {
    return this.data?.watchlist[domain];
  }

  getStats() {
    return this.data?.stats;
  }

  async incrementTime(
    domain: string,
    seconds: number,
  ): Promise<{ isBlocked: boolean; justBlocked: boolean }> {
    await this.init();
    if (!this.data) return { isBlocked: false, justBlocked: false };

    const rule = this.data.watchlist[domain];
    if (!rule) return { isBlocked: false, justBlocked: false };

    // Check for reset first
    const now = Date.now();
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      rule.consumedTime = 0;
      rule.isBlocked = false;
      rule.lastReset = now;
      this.isDirty = true;
    }

    if (rule.isBlocked) return { isBlocked: true, justBlocked: false };

    rule.consumedTime += seconds;
    this.isDirty = true;
    this.dirtyCount++;

    // Proactive flush if many changes accumulated (e.g. 5 heartbeats)
    if (this.dirtyCount >= 5) {
      this.flush();
    }

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
    await this.init();

    const rule = this.data?.watchlist[domain];
    if (!rule) return false;

    // Lazy reset check
    const now = Date.now();
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      rule.consumedTime = 0;
      rule.isBlocked = false;
      rule.lastReset = now;
      this.isDirty = true;
    }

    return rule.isBlocked;
  }

  async checkAllRules() {
    await this.init();
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
      this.dirtyCount = 0;
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

  public async getData(): Promise<StorageData | null> {
    await this.init();
    return this.data;
  }
}

