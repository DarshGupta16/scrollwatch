import browser from "webextension-polyfill";
import { StorageData } from "../utils/storage";

export class BatchStorageManager {
  private memoryData: StorageData | null = null;
  private lastWriteTime: number = 0;
  private writeInterval: number = 30000; // 30 seconds
  private timer: ReturnType<typeof setInterval> | null = null;

  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // 1. Try Session Storage first (Hot memory)
        const sessionData = await browser.storage.session.get("scrollwatch");
        if (sessionData.scrollwatch) {
          this.memoryData = sessionData.scrollwatch as StorageData;
          console.log("[BatchStorageManager] Initialized from session storage");
        } else {
          // 2. Fallback to Local Storage (Cold memory)
          const localData = await browser.storage.local.get("scrollwatch");
          this.memoryData = localData.scrollwatch || {
            watchlist: {},
            stats: { totalBlocks: 0, startTime: Date.now() },
          };
          
          // Seed session storage immediately
          await browser.storage.session.set({ scrollwatch: this.memoryData });
          console.log("[BatchStorageManager] Initialized from local storage");
        }
      } catch (e) {
        console.error("[BatchStorageManager] Init error:", e);
        this.memoryData = {
          watchlist: {},
          stats: { totalBlocks: 0, startTime: Date.now() },
        };
      }

      this.startTimer();
    })();

    return this.initPromise;
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.flush(), this.writeInterval);
  }

  async getData(): Promise<StorageData> {
    await this.init();
    return this.memoryData!;
  }

  async setData(data: StorageData, immediate: boolean = false) {
    await this.init();
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
