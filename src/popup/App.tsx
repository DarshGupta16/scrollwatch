import React, { useState, useEffect } from 'react';
import { getStorage, setStorage, Rule } from '../utils/storage';

const App = () => {
  const [watchlist, setWatchlist] = useState<Record<string, Rule>>({});
  const [newDomain, setNewDomain] = useState('');
  const [allowed, setAllowed] = useState({ h: 0, m: 5, s: 0 });
  const [reset, setReset] = useState({ h: 1, m: 0, s: 0 });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const data = await getStorage();
    setWatchlist(data.watchlist);
  };

  const toSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    const domain = newDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const data = await getStorage();
    
    data.watchlist[domain] = {
      id: Math.random().toString(36).substr(2, 9),
      domain,
      allowedDuration: toSeconds(allowed.h, allowed.m, allowed.s),
      resetInterval: toSeconds(reset.h, reset.m, reset.s),
      consumedTime: 0,
      lastReset: Date.now(),
      isBlocked: false
    };

    await setStorage(data);
    setNewDomain('');
    setShowAdd(false);
    loadData();
  };

  const deleteRule = async (domain: string) => {
    const data = await getStorage();
    delete data.watchlist[domain];
    await setStorage(data);
    loadData();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  return (
    <div className="p-4 bg-white min-h-[500px]">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-primary">ScrollWatch</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-primary hover:bg-secondary text-white p-2 rounded-full transition-all shadow-lg active:scale-95"
        >
          {showAdd ? '✕' : '+'}
        </button>
      </header>

      {showAdd ? (
        <form onSubmit={addRule} className="space-y-4 bg-gray-50 p-4 rounded-xl shadow-inner border border-gray-100 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Website Domain</label>
            <input 
              type="text" 
              placeholder="example.com"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Allowed (H:M:S)</label>
              <div className="flex gap-1">
                <input type="number" min="0" value={allowed.h} onChange={e => setAllowed({...allowed, h: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
                <input type="number" min="0" max="59" value={allowed.m} onChange={e => setAllowed({...allowed, m: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
                <input type="number" min="0" max="59" value={allowed.s} onChange={e => setAllowed({...allowed, s: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reset Every (H:M:S)</label>
              <div className="flex gap-1">
                <input type="number" min="0" value={reset.h} onChange={e => setReset({...reset, h: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
                <input type="number" min="0" max="59" value={reset.m} onChange={e => setReset({...reset, m: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
                <input type="number" min="0" max="59" value={reset.s} onChange={e => setReset({...reset, s: parseInt(e.target.value) || 0})} className="w-full p-1 border rounded" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-secondary transition-colors">
            Add to Watchlist
          </button>
        </form>
      ) : null}

      <div className="space-y-4">
        {Object.values(watchlist).length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🔭</div>
            <p>No websites watched yet.</p>
          </div>
        ) : (
          Object.values(watchlist).map(rule => (
            <div key={rule.domain} className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{rule.domain}</h3>
                  <p className="text-xs text-gray-500">Reset every {formatTime(rule.resetInterval)}</p>
                </div>
                <button onClick={() => deleteRule(rule.domain)} className="text-gray-300 hover:text-accent transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className={rule.isBlocked ? 'text-accent font-bold' : 'text-gray-600'}>
                    {rule.isBlocked ? 'Locked!' : `${formatTime(rule.consumedTime)} used`}
                  </span>
                  <span className="text-gray-400">{formatTime(rule.allowedDuration)} limit</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${rule.isBlocked ? 'bg-accent' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (rule.consumedTime / rule.allowedDuration) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <footer className="mt-8 text-center text-xs text-gray-400">
        ScrollWatch &copy; 2026 • Stay Focused
      </footer>
    </div>
  );
};

export default App;
