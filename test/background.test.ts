import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetStorage } from './setup';
import { BatchStorageManager } from '../src/background/BatchStorageManager'; // This is what we will build
import { Rule } from '../src/utils/storage';

// Mock getStorage and setStorage from utils since our Manager will likely use them or replace them
// Actually, let's mock the underlying browser.storage.local to be safe
const mockSet = vi.spyOn(global.browser.storage.local, 'set');
const mockGet = vi.spyOn(global.browser.storage.local, 'get');

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
          allowedDuration: 100, // 100 seconds
          resetInterval: 3600,
          consumedTime: 50,
          lastReset: Date.now(),
          isBlocked: false,
        } as Rule
      },
      stats: { totalBlocks: 0, startTime: Date.now() }
    };
    global.browser.storage.local.set({ scrollwatch: initialData });

    manager = new BatchStorageManager();
    mockSet.mockClear(); // Clear the setup call
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load data from storage on init', async () => {
    await manager.init();
    expect(manager.getRule('example.com')).toBeDefined();
    expect(manager.getRule('example.com')?.consumedTime).toBe(50);
  });

  it('should update consumed time in memory without writing to storage immediately', async () => {
    await manager.init();
    
    await manager.incrementTime('example.com', 5);
    
    expect(manager.getRule('example.com')?.consumedTime).toBe(55);
    expect(mockSet).not.toHaveBeenCalled(); // Should not write yet
  });

  it('should flush to storage after the flush interval', async () => {
    await manager.init();
    
    await manager.incrementTime('example.com', 5);
    
    // Fast forward 10 seconds (default flush interval)
    vi.advanceTimersByTime(10000);
    
    expect(mockSet).toHaveBeenCalled();
    const callArgs = mockSet.mock.calls[0][0];
    expect(callArgs.scrollwatch.watchlist['example.com'].consumedTime).toBe(55);
  });

  it('should block immediately and save when limit is reached', async () => {
    await manager.init();
    
    // Limit is 100, current is 50. Add 50.
    const result = await manager.incrementTime('example.com', 50);
    
    expect(result.isBlocked).toBe(true);
    expect(result.justBlocked).toBe(true);
    expect(manager.getRule('example.com')?.isBlocked).toBe(true);
    expect(mockSet).toHaveBeenCalled(); // Should save immediately on block
  });

  it('should reset status if interval passed during checkStatus', async () => {
    await manager.init();
    
    // Manually block it
    const rule = manager.getRule('example.com');
    if (rule) {
      rule.isBlocked = true;
      rule.lastReset = Date.now() - 4000000; // > 3600*1000 (3.6m)
    }

    const isBlocked = await manager.checkStatus('example.com');
    expect(isBlocked).toBe(false);
    expect(manager.getRule('example.com')?.consumedTime).toBe(0);
  });

  it('should automatically unblock when incrementing time after reset interval', async () => {
    await manager.init();
    
    // 1. Block it
    await manager.incrementTime('example.com', 100);
    expect(manager.getRule('example.com')?.isBlocked).toBe(true);
    
    // 2. Simulate time passing (move lastReset to past)
    const rule = manager.getRule('example.com');
    if (rule) {
      // Interval is 3600s. Move lastReset back 3601s.
      rule.lastReset = Date.now() - 3601000;
    }

    // 3. Increment time (simulating new activity after reset)
    const result = await manager.incrementTime('example.com', 1);
    
    // Should be unblocked and count start at 1 (or 0+1)
    expect(result.isBlocked).toBe(false);
    expect(manager.getRule('example.com')?.isBlocked).toBe(false);
    expect(manager.getRule('example.com')?.consumedTime).toBe(1);
    expect(mockSet).toHaveBeenCalled(); // Should save the reset state
  });

  it('should return the current state via getData()', async () => {
    await manager.init();
    await manager.incrementTime('example.com', 10);
    
    const data = await manager.getData();
    expect(data?.watchlist['example.com'].consumedTime).toBe(60); // 50 (init) + 10
  });

  it('should add a rule and persist to storage', async () => {
    await manager.init();
    const newRule: Rule = {
      id: '2',
      domain: 'new.com',
      allowedDuration: 60,
      resetInterval: 3600,
      consumedTime: 0,
      lastReset: Date.now(),
      isBlocked: false,
    };
    
    await manager.addRule(newRule);
    
    expect(manager.getRule('new.com')).toBeDefined();
    expect(mockSet).toHaveBeenCalled();
  });

  it('should delete a rule and persist to storage', async () => {
    await manager.init();
    await manager.deleteRule('example.com');
    
    expect(manager.getRule('example.com')).toBeUndefined();
    expect(mockSet).toHaveBeenCalled();
  });

  it('should recover data from session storage if available', async () => {
    const sessionData = {
      watchlist: {
        'session.com': {
          id: 's1',
          domain: 'session.com',
          allowedDuration: 100,
          resetInterval: 3600,
          consumedTime: 10,
          lastReset: Date.now(),
          isBlocked: false,
        }
      }
    };
    
    // Manually prime the mock session storage
    global.browser.storage.session.set({ "scrollwatch_cache": sessionData });
    
    const newManager = new BatchStorageManager();
    await newManager.init();
    
    expect(newManager.getRule('session.com')).toBeDefined();
    expect(newManager.getRule('session.com')?.consumedTime).toBe(10);
  });
});
