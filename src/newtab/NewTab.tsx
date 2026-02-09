import React, { useEffect, useState } from 'react';
import { getStorage } from '../utils/storage';

const GREETINGS = [
  "Doomscrolling is for amateurs.",
  "Time is your only non-renewable resource.",
  "Create more than you consume.",
  "Focus is the new IQ.",
  "Be the pilot, not the passenger.",
  "Scroll less, live more.",
  "Your future self is watching.",
  "Discipline is freedom.",
  "What could you build right now?",
  "Stay hungry, stay foolish, stay focused."
];

const NewTab = () => {
  const [stats, setStats] = useState({ savedMinutes: 0, blocks: 0 });
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Set random greeting
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

    // Update clock
    const timer = setInterval(() => setTime(new Date()), 1000);

    // Load stats
    getStorage().then(data => {
      const blocks = data.stats?.totalBlocks || 0;
      // Assumption: Each block saves ~15 minutes of doomscrolling
      setStats({
        blocks,
        savedMinutes: blocks * 15
      });
    });

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center selection:bg-primary selection:text-white">
      <div className="absolute top-8 left-8">
        <h1 className="text-xl font-black tracking-tighter text-gray-900 flex items-center gap-2">
          <span className="text-2xl">⏳</span> ScrollWatch
        </h1>
      </div>

      <main className="max-w-4xl w-full animate-fade-in-up">
        <div className="mb-12">
          <h2 className="text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 tracking-tighter select-none">
            {formatTime(time)}
          </h2>
          <p className="text-2xl text-gray-500 font-medium mt-4 italic">
            "{greeting}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="text-4xl font-black text-primary mb-2">
              {stats.savedMinutes >= 60 
                ? `${(stats.savedMinutes / 60).toFixed(1)}h` 
                : `${stats.savedMinutes}m`}
            </div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Time Reclaimed</div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:transform hover:scale-[1.02] transition-all duration-300">
            <div className="text-4xl font-black text-accent mb-2">
              {stats.blocks}
            </div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Doomscrolls Blocked</div>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-8 text-gray-300 text-sm font-medium">
        You are strictly your habits.
      </footer>
    </div>
  );
};

export default NewTab;
