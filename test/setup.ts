import { vi } from 'vitest';

const storageMap = new Map();

const mockBrowser = {
  runtime: {
    id: 'mock-extension-id', // Needed for isExtension check
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  alarms: {
    get: vi.fn(),
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(),
    onUpdated: { addListener: vi.fn() },
  },
  storage: {
    local: {
      get: vi.fn((key) => {
        if (typeof key === 'string') {
          return Promise.resolve({ [key]: storageMap.get(key) });
        }
        return Promise.resolve(Object.fromEntries(storageMap));
      }),
      set: vi.fn((data) => {
        // console.trace("Storage SET called");
        Object.entries(data).forEach(([key, value]) => {
          storageMap.set(key, value);
        });
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    session: {
      get: vi.fn((key) => {
        if (typeof key === 'string') {
          return Promise.resolve({ [key]: storageMap.get('session_' + key) });
        }
        return Promise.resolve({});
      }),
      set: vi.fn((data) => {
        Object.entries(data).forEach(([key, value]) => {
          storageMap.set('session_' + key, value);
        });
        return Promise.resolve();
      }),
      remove: vi.fn((key) => {
        storageMap.delete('session_' + key);
        return Promise.resolve();
      }),
    }
  },
};

// Setup global browser mock
(globalThis as any).browser = mockBrowser;
(globalThis as any).chrome = mockBrowser; // Mock chrome as well for isExtension check

// MOCK THE MODULE
vi.mock('webextension-polyfill', () => {
  return {
    default: mockBrowser,
    __esModule: true,
  };
});

// Reset map before each test if needed
export const resetStorage = () => storageMap.clear();
