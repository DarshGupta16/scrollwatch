import React, { useState, useEffect } from 'react';
import { getStorage } from '../utils/storage';
import browser from 'webextension-polyfill';

const App = () => {
  const [stats, setStats] = useState({ blocks: 0, savedMinutes: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getStorage();
    const blocks = data.stats?.totalBlocks || 0;
    setStats({
      blocks,
      savedMinutes: blocks * 15
    });
  };

  const openDashboard = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="w-64 bg-bg border-r border-border min-h-[300px] flex flex-col p-6">
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-widest uppercase text-accent">ScrollWatch</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 bg-green-500 rounded-none animate-pulse"></div>
          <span className="text-xs text-muted uppercase tracking-widest">System Active</span>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        <div>
          <div className="text-4xl font-bold text-text leading-none">{stats.blocks}</div>
          <div className="text-xs text-muted uppercase tracking-widest mt-1">Doomscrolls Blocked</div>
        </div>
        
        <div>
          <div className="text-4xl font-bold text-text leading-none">
             {stats.savedMinutes >= 60 
                ? (stats.savedMinutes / 60).toFixed(1) + 'h' 
                : stats.savedMinutes + 'm'}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest mt-1">Time Reclaimed</div>
        </div>
      </div>

      <button 
        onClick={openDashboard}
        className="w-full mt-8 py-3 bg-surface border border-border hover:bg-white hover:text-black hover:border-white transition-all text-xs font-bold uppercase tracking-widest"
      >
        Open Dashboard
      </button>
    </div>
  );
};

export default App;