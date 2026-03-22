
import React, { useState, useEffect } from 'react';

interface LocalClockProps {
  onOpenLuckySpin?: () => void;
}

export const LocalClock: React.FC<LocalClockProps> = ({ onOpenLuckySpin }) => {
  const [time, setTime] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      // Uses local system time automatically by omitting timeZone
      setTime(new Intl.DateTimeFormat(undefined, options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[2000] flex items-center gap-2">
        {onOpenLuckySpin && (
          <button 
            onClick={onOpenLuckySpin}
            className="w-10 h-10 bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] flex items-center justify-center clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_10px_rgba(220,176,107,0.3)] hover:scale-110"
            title="Lucky Spin"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-10 h-10 bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] flex items-center justify-center clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_10px_rgba(220,176,107,0.3)] hover:scale-110"
          title="Expand Clock"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[2000] flex items-center gap-2">
      {onOpenLuckySpin && (
        <button 
          onClick={onOpenLuckySpin}
          className="w-10 h-10 bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] flex items-center justify-center clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_10px_rgba(220,176,107,0.3)] hover:scale-110"
          title="Lucky Spin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
      <div className="w-32 bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b]/50 clip-corner-sm flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-5 bg-[#dcb06b]/20 flex items-center justify-between px-2 border-b border-[#dcb06b]/30">
          <div className="flex gap-1 items-center">
             <div className="w-1 h-1 bg-[#dcb06b] rounded-full animate-pulse"></div>
             <span className="text-[7px] font-orbitron font-bold text-[#dcb06b] tracking-tighter">LOCAL SYSTEM</span>
          </div>
          <button onClick={() => setIsMinimized(true)} className="text-[#dcb06b] hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
        </div>
        
        {/* Time Display */}
        <div className="p-2 flex flex-col items-center relative">
           <div className="text-lg font-orbitron font-black text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {time}
           </div>
           <div className="text-[6px] font-orbitron text-[#dcb06b] uppercase tracking-[0.2em] mt-0.5 opacity-60">
              LOCAL TIME
           </div>
        </div>
      </div>
    </div>
  );
};
