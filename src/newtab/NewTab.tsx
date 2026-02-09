import React, { useEffect, useState } from 'react';
import { getStorage } from '../utils/storage';

const QUOTES = [
  "CONSUMPTION IS A CHOICE.",
  "TIME IS NON-REFUNDABLE.",
  "CREATE. DON'T SCROLL.",
  "THE ALGORITHM IS NOT YOUR FRIEND.",
  "FOCUS IS CURRENCY.",
  "DISCIPLINE EQUALS FREEDOM.",
  "WHAT ARE YOU BUILDING?",
  "SILENCE THE NOISE.",
  "YOU ARE WHAT YOU DO REPEATEDLY.",
  "DO NOT YIELD TO DISTRACTION."
];

const NewTab = () => {
  const [stats, setStats] = useState({ savedMinutes: 0, blocks: 0 });
  const [quote, setQuote] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    getStorage().then(data => {
      const blocks = data.stats?.totalBlocks || 0;
      setStats({ blocks, savedMinutes: blocks * 15 });
    });

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 selection:bg-white selection:text-black">
      <div className="absolute top-8 left-8 border border-border px-4 py-2">
        <h1 className="text-sm font-bold tracking-widest text-muted uppercase">ScrollWatch System</h1>
      </div>

      <main className="w-full max-w-5xl">
        <div className="text-center mb-24">
          <h2 className="text-[12rem] md:text-[16rem] leading-none font-bold text-white tracking-tighter select-none font-mono">
            {formatTime(time)}
          </h2>
          <div className="inline-block border-l-2 border-accent pl-6 text-left">
            <p className="text-xl md:text-2xl text-muted font-bold uppercase tracking-widest max-w-xl">
              {quote}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border border border-border max-w-2xl mx-auto">
          <div className="bg-bg p-12 text-center group hover:bg-surface transition-colors">
            <div className="text-6xl font-bold text-white mb-2 font-mono">
              {stats.savedMinutes >= 60 
                ? (stats.savedMinutes / 60).toFixed(1) + 'H' 
                : stats.savedMinutes + 'M'}
            </div>
            <div className="text-xs font-bold text-muted uppercase tracking-[0.2em] group-hover:text-accent transition-colors">
              Time Reclaimed
            </div>
          </div>

          <div className="bg-bg p-12 text-center group hover:bg-surface transition-colors">
            <div className="text-6xl font-bold text-white mb-2 font-mono">
              {stats.blocks}
            </div>
            <div className="text-xs font-bold text-muted uppercase tracking-[0.2em] group-hover:text-accent transition-colors">
              Interventions
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-8 w-full text-center">
        <div className="inline-block px-4 py-1 border border-border text-[10px] text-muted uppercase tracking-widest">
          Status: Operational
        </div>
      </footer>
    </div>
  );
};

export default NewTab;