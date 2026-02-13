import browser from "webextension-polyfill";
import { StorageData } from "../utils/storage";

export class BatchStorageManager {
  private memoryData: StorageData | null = null;
  private lastWriteTime: number = 0;
  private writeInterval: number = 30000; // 30 seconds
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    const data = await browser.storage.local.get("scrollwatch");
    this.memoryData = data.scrollwatch || {
      watchlist: {},
      stats: { totalBlocks: 0, startTime: Date.now() },
    };
    
    // Also sync to session storage for UI calibration
    await browser.storage.session.set({ scrollwatch: this.memoryData });

    this.startTimer();
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), this.writeInterval);
  }

  async getData(): Promise<StorageData> {
    if (!this.memoryData) {
      const data = await browser.storage.local.get("scrollwatch");
      this.memoryData = data.scrollwatch || {
        watchlist: {},
        stats: { totalBlocks: 0, startTime: Date.now() },
      };
    }
    return this.memoryData!;
  }

  async setData(data: StorageData, immediate: boolean = false) {
    this.memoryData = data;
    // Always update session storage immediately for UI
    await browser.storage.session.set({ scrollwatch: data });

    if (immediate) {
      await this.flush();
    }
  }

  async flush() {
    if (!this.memoryData) return;
    
    try {
      await browser.storage.local.set({ scrollwatch: this.memoryData });
      this.lastWriteTime = Date.now();
      console.log("[BatchStorageManager] Flushed to storage.local");
    } catch (e) {
      console.error("[BatchStorageManager] Flush error:", e);
    }
  }
}

export const storageManager = new BatchStorageManager();
