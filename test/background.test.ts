import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetStorage } from './setup';
import { BatchStorageManager } from '../src/background/BatchStorageManager';

const mockSet = vi.spyOn(global.browser.storage.local, 'set');
const mockGet = vi.spyOn(global.browser.storage.local, 'get');
const mockSessionSet = vi.spyOn(global.browser.storage.session, 'set');

describe('BatchStorageManager', () => {
  let manager: BatchStorageManager;

  beforeEach(() => {
    resetStorage();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Seed initial storage
    const initialData = {
      watchlist: {
        'example.com': {
          id: '1',
          domain: 'example.com',
          allowedDuration: 100,
          resetInterval: 3600,
          consumedTime: 50,
          lastReset: Date.now(),
          isBlocked: false,
        }
      },
      stats: { totalBlocks: 0, startTime: Date.now() }
    };
    global.browser.storage.local.set({ scrollwatch: initialData });

    manager = new BatchStorageManager();
    // BatchStorageManager calls init in constructor
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load data from storage on init', async () => {
    const data = await manager.getData();
    expect(data.watchlist['example.com']).toBeDefined();
    expect(data.watchlist['example.com'].consumedTime).toBe(50);
  });

  it('should sync to session storage on init', async () => {
    // Advance timers and wait for promises to allow init to complete
    vi.runAllTicks();
    await Promise.resolve();
    expect(mockSessionSet).toHaveBeenCalled();
  });

  it('should update memory and session storage immediately but delay local storage', async () => {
    const data = await manager.getData();
    data.watchlist['example.com'].consumedTime = 60;
    
    await manager.setData(data, false); // Not immediate
    
    // Should update session storage
    expect(mockSessionSet).toHaveBeenCalled();
    
    // Should NOT have called local set yet
    const localCallsBefore = mockSet.mock.calls.length;
    
    // Fast forward 29 seconds (less than 30s interval)
    vi.advanceTimersByTime(29000);
    expect(mockSet.mock.calls.length).toBe(localCallsBefore);
    
    // Fast forward to 30s
    vi.advanceTimersByTime(1000);
    expect(mockSet).toHaveBeenCalled();
  });

  it('should flush to local storage immediately if requested', async () => {
    const data = await manager.getData();
    data.watchlist['example.com'].consumedTime = 70;
    
    await manager.setData(data, true); // Immediate
    
    expect(mockSet).toHaveBeenCalled();
    const callArgs = mockSet.mock.calls[mockSet.mock.calls.length - 1][0];
    expect(callArgs.scrollwatch.watchlist['example.com'].consumedTime).toBe(70);
  });

  it('should manually flush when requested', async () => {
    const data = await manager.getData();
    data.watchlist['example.com'].consumedTime = 80;
    await manager.setData(data, false);
    
    await manager.flush();
    expect(mockSet).toHaveBeenCalled();
  });
});
