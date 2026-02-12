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
      // Try session storage first (fast, survives SW restart)
      try {
        if (browser.storage && (browser.storage as any).session) {
          const res = await (browser.storage as any).session.get("scrollwatch_cache");
          if (res.scrollwatch_cache) {
            this.data = res.scrollwatch_cache;
          }
        }
      } catch (e) {}

      if (!this.data) {
        this.data = await getStorage();
      }

      this.startFlushLoop();

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
        currentWatchlist[domain] = incoming;
      } else {
        // Update config, preserve live consumedTime if background has newer data
        current.allowedDuration = incoming.allowedDuration;
        current.resetInterval = incoming.resetInterval;
        
        // If storage has a reset (consumedTime=0) OR isBlocked is now false when it was true
        // (means manual unblock/reset from UI), we MUST accept it.
        if ((incoming.consumedTime === 0 && current.consumedTime > 0) || (current.isBlocked && !incoming.isBlocked)) {
           current.consumedTime = 0;
           current.lastReset = incoming.lastReset;
           current.isBlocked = false;
        }
      }
    }

    this.data.watchlist = currentWatchlist;
    if (newData.stats && (!this.data.stats || newData.stats.totalBlocks > this.data.stats.totalBlocks)) {
      this.data.stats = newData.stats;
    }
    this.updateCache();
  }

  private async updateCache() {
    if (!this.data) return;
    try {
      if (browser.storage && (browser.storage as any).session) {
        await (browser.storage as any).session.set({ "scrollwatch_cache": this.data });
      }
    } catch (e) {}
  }

  async addRule(rule: Rule) {
    await this.init();
    if (!this.data) return;
    this.data.watchlist[rule.domain] = rule;
    this.isDirty = true;
    this.updateCache();
    await this.flush(); 
  }

  async deleteRule(domain: string) {
    await this.init();
    if (!this.data) return;
    delete this.data.watchlist[domain];
    this.isDirty = true;
    this.updateCache();
    await this.flush(); 
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
  ): Promise<{ isBlocked: boolean; justBlocked: boolean; rule?: Rule }> {
    await this.init();
    if (!this.data) return { isBlocked: false, justBlocked: false };

    const rule = this.data.watchlist[domain];
    if (!rule) return { isBlocked: false, justBlocked: false };

    // Check for reset first
    const now = Date.now();
    let wasReset = false;
    if (now - rule.lastReset >= rule.resetInterval * 1000) {
      rule.consumedTime = 0;
      rule.isBlocked = false;
      rule.lastReset = now;
      this.isDirty = true;
      wasReset = true;
    }

    if (rule.isBlocked) return { isBlocked: true, justBlocked: false, rule };

    // Global Pulse Logic: 
    // If multiple tabs are open, we only count the time once per second for that domain.
    // We bypass this check if the rule was JUST reset so we don't drop the first second.
    if (!wasReset && rule.lastProcessed && now - rule.lastProcessed < 800) {
      return { isBlocked: false, justBlocked: false, rule };
    }

    rule.consumedTime += seconds;
    rule.lastProcessed = now;
    this.isDirty = true;
    this.dirtyCount++;
    this.updateCache();

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

      await this.flush();
      return { isBlocked: true, justBlocked: true, rule };
    }

    return { isBlocked: false, justBlocked: false, rule };
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
      this.updateCache();
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

