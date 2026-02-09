import React, { useState, useEffect } from "react";
import { getStorage, setStorage, Rule } from "../utils/storage";

const Dashboard = () => {
  const [watchlist, setWatchlist] = useState<Record<string, Rule>>({});
  const [newDomain, setNewDomain] = useState("");
  const [allowed, setAllowed] = useState({ h: 0, m: 5, s: 0 });
  const [reset, setReset] = useState({ h: 1, m: 0, s: 0 });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const data = await getStorage();
    setWatchlist(data.watchlist);
  };

  const toSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
  const toHMS = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    const domain = newDomain
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0];
    const data = await getStorage();

    data.watchlist[domain] = {
      id: Math.random().toString(36).substr(2, 9),
      domain,
      allowedDuration: toSeconds(allowed.h, allowed.m, allowed.s),
      resetInterval: toSeconds(reset.h, reset.m, reset.s),
      consumedTime: 0,
      lastReset: Date.now(),
      isBlocked: false,
    };

    await setStorage(data);
    setNewDomain("");
    loadData();
  };

  const deleteRule = async (domain: string) => {
    const data = await getStorage();
    delete data.watchlist[domain];
    await setStorage(data);
    loadData();
  };

  const formatTime = (seconds: number) => {
    const { h, m, s } = toHMS(seconds);
    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-bg text-text p-12 max-w-6xl mx-auto selection:bg-accent selection:text-black">
      <header className="mb-16 border-b border-border pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase mb-2">
            Command Center
          </h1>
          <p className="text-muted font-mono uppercase tracking-widest text-sm">
            ScrollWatch System v2.0
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm text-muted uppercase tracking-widest">
            Active Rules
          </div>
          <div className="text-4xl font-bold">
            {Object.keys(watchlist).length}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ADD RULE SECTION */}
        <section className="lg:col-span-1">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">
            Add Protocol
          </h2>
          <form
            onSubmit={addRule}
            className="space-y-6 bg-surface p-8 border border-border"
          >
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                Target Domain
              </label>
              <input
                type="text"
                placeholder="twitter.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full bg-bg border border-border p-3 text-sm focus:border-accent outline-none font-mono"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                  Duration Limit (H:M:S)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="H"
                    value={allowed.h}
                    onChange={(e) =>
                      setAllowed({
                        ...allowed,
                        h: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                  <input
                    type="number"
                    placeholder="M"
                    value={allowed.m}
                    onChange={(e) =>
                      setAllowed({
                        ...allowed,
                        m: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                  <input
                    type="number"
                    placeholder="S"
                    value={allowed.s}
                    onChange={(e) =>
                      setAllowed({
                        ...allowed,
                        s: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                  Reset Interval (H:M:S)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="H"
                    value={reset.h}
                    onChange={(e) =>
                      setReset({ ...reset, h: parseInt(e.target.value) || 0 })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                  <input
                    type="number"
                    placeholder="M"
                    value={reset.m}
                    onChange={(e) =>
                      setReset({ ...reset, m: parseInt(e.target.value) || 0 })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                  <input
                    type="number"
                    placeholder="S"
                    value={reset.s}
                    onChange={(e) =>
                      setReset({ ...reset, s: parseInt(e.target.value) || 0 })
                    }
                    className="bg-bg border border-border p-2 text-center"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-4 hover:bg-gray-200 transition-colors uppercase tracking-widest border border-white"
            >
              Initialize Rule
            </button>
          </form>
        </section>

        {/* WATCHLIST SECTION */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-border pl-4">
            Active Protocols
          </h2>

          <div className="grid gap-4">
            {Object.values(watchlist).length === 0 ? (
              <div className="p-12 border border-border border-dashed text-center text-muted uppercase tracking-widest">
                No active protocols detected.
              </div>
            ) : (
              Object.values(watchlist).map((rule) => (
                <div
                  key={rule.domain}
                  className="group bg-surface border border-border p-6 hover:border-accent transition-colors relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">
                        {rule.domain}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={`w-2 h-2 ${rule.isBlocked ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
                        ></div>
                        <span className="text-xs text-muted uppercase tracking-widest">
                          {rule.isBlocked ? "ACCESS LOCKED" : "MONITORING"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteRule(rule.domain)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 uppercase text-xs font-bold tracking-widest"
                    >
                      [TERMINATE]
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-muted uppercase">
                      <span>Consumption</span>
                      <span>
                        {formatTime(rule.consumedTime)} /{" "}
                        {formatTime(rule.allowedDuration)}
                      </span>
                    </div>
                    <div className="h-2 bg-bg border border-border w-full">
                      <div
                        className={`h-full ${rule.isBlocked ? "bg-red-500" : "bg-white"}`}
                        style={{
                          width: `${Math.min(100, (rule.consumedTime / rule.allowedDuration) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-right text-xs text-muted mt-1">
                      RESETS EVERY {formatTime(rule.resetInterval)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
