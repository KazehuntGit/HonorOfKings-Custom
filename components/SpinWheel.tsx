
import React, { useState, useEffect, useRef } from 'react';

interface SpinWheelProps {
  candidates: string[];
  winnerName: string;
  onComplete: () => void;
  onCancel: () => void;
  team: 'azure' | 'crimson';
  roleName: string;
  roomId: string;
  duration: number;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ candidates, winnerName, onComplete, onCancel, team, roleName, roomId, duration }) => {
  const [status, setStatus] = useState<'scrolling' | 'completed'>('scrolling');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showInterference, setShowInterference] = useState(true);
  const reelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const ITEM_HEIGHT = 70; 
  const VISIBLE_ITEMS = 5; 
  const [winnerIndex] = useState(() => Math.floor(duration / 25) + Math.floor(Math.random() * 30 - 15)); 
  const [reelItems, setReelItems] = useState<string[]>([]);

  useEffect(() => {
    const interTimer = setTimeout(() => setShowInterference(false), 300);
    const targetY = calculateTargetPosition();
    const scrollTimer = setTimeout(() => setScrollPosition(targetY), 50);
    timerRef.current = setTimeout(() => {
       setStatus('completed');
       setTimeout(() => onComplete(), 1500);
    }, duration);
    return () => {
        clearTimeout(interTimer); clearTimeout(scrollTimer);
        if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration]);

  useEffect(() => {
    const items: string[] = [];
    const uniqueCandidates = Array.from(new Set(candidates)) as string[];
    if (uniqueCandidates.length <= 1) {
       for (let i = 0; i < winnerIndex + VISIBLE_ITEMS + 5; i++) items.push(winnerName);
    } else {
       let previousName = '';
       for (let i = 0; i < winnerIndex + VISIBLE_ITEMS + 5; i++) {
          if (i === winnerIndex) { items.push(winnerName); previousName = winnerName; }
          else {
            const pool = uniqueCandidates.filter(name => name !== previousName);
            const randomName = pool[Math.floor(Math.random() * pool.length)];
            items.push(randomName); previousName = randomName;
          }
       }
    }
    setReelItems(items);
  }, [candidates, winnerName, winnerIndex]);

  const calculateTargetPosition = () => {
    const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
    const centerOffset = (containerHeight / 2) - (ITEM_HEIGHT / 2);
    return -(winnerIndex * ITEM_HEIGHT) + centerOffset;
  };

  const themeColor = team === 'azure' ? '#00d2ff' : '#ef4444';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/98 backdrop-blur-2xl animate-slide-in">
      
      {showInterference && (
          <div className="absolute inset-0 z-[70] bg-[#05090f] flex items-center justify-center">
              <div className="text-[#dcb06b] font-orbitron text-xs tracking-[1.2em] animate-pulse uppercase">Syncing Roster...</div>
          </div>
      )}

      {/* NAVIGATION CONTROLS */}
      <div className="absolute top-6 right-6 z-50 flex gap-4">
        {status === 'scrolling' && (
          <button 
            onClick={() => { if(timerRef.current) clearTimeout(timerRef.current); setStatus('completed'); setScrollPosition(calculateTargetPosition()); setTimeout(onComplete, 500); }} 
            className="px-4 py-2 bg-[#dcb06b]/10 border border-[#dcb06b]/50 text-[#dcb06b] font-orbitron font-bold text-[10px] uppercase tracking-widest hover:bg-[#dcb06b] hover:text-black transition-all clip-corner-sm"
          >
            Skip Sync
          </button>
        )}
        <button 
          onClick={onCancel} 
          className="w-10 h-10 rounded-full border border-[#1e3a5f] bg-[#05090f] text-[#4a5f78] hover:text-white flex items-center justify-center transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* HEADER SECTION */}
      <div className="mb-8 text-center flex flex-col items-center max-w-full px-6">
        <h2 className="text-3xl md:text-5xl font-black font-orbitron text-white uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] tracking-wider animate-pulse mb-4">
          <span style={{ color: themeColor }}>{team}</span> {roleName.replace(' Lane', '')}
        </h2>

        {/* ROOM ID HIGHLIGHT */}
        <div className="flex flex-col items-center gap-1 scale-[0.75] origin-top">
            <span className="text-[#dcb06b] font-orbitron text-[10px] tracking-[0.4em] font-black uppercase mb-1.5 opacity-80">ROOM ID</span>
            <div className="relative">
               <div className="absolute -inset-4 bg-[#dcb06b] blur-[25px] opacity-20 pointer-events-none"></div>
               <div className="relative bg-black/90 border border-[#dcb06b] px-12 py-3 clip-corner-sm flex flex-col items-center shadow-[0_0_20px_rgba(220,176,107,0.3)]">
                  <span className="text-2xl md:text-4xl font-orbitron font-black text-white tracking-[0.4em] drop-shadow-[0_0_10px_#dcb06b] animate-[chromatic_0.2s_infinite]">
                    {roomId}
                  </span>
               </div>
            </div>
        </div>
      </div>

      {/* THE REEL */}
      <div className="relative scale-100 md:scale-105">
         <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-[2px] bg-red-500/50 animate-pulse"></div>
         <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-[2px] bg-red-500/50 animate-pulse"></div>

         <div 
            className={`relative overflow-hidden bg-[#05090f] border-x-2 border-[#dcb06b]/30 shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-all duration-700 ${status === 'completed' ? 'border-[#dcb06b] scale-105 shadow-[0_0_50px_rgba(220,176,107,0.2)]' : ''}`} 
            style={{ width: '400px', height: `${ITEM_HEIGHT * VISIBLE_ITEMS}px` }}
         >
            <div 
              ref={reelRef} 
              className="w-full flex flex-col items-center will-change-transform" 
              style={{ transform: `translateY(${scrollPosition}px)`, filter: 'none', transition: status === 'scrolling' ? `transform ${duration}ms cubic-bezier(0.1, 0.7, 0.1, 1)` : 'none' }}
            >
               {reelItems.map((name, index) => (
                  <div key={index} className={`flex items-center justify-center w-full font-orbitron font-bold uppercase tracking-widest transition-all duration-300 ${(index === winnerIndex && status === 'completed') ? 'text-[#dcb06b] text-3xl md:text-4xl drop-shadow-[0_0_20px_#dcb06b] scale-110' : 'text-[#f0f4f8] text-xl md:text-2xl opacity-20'}`} style={{ height: `${ITEM_HEIGHT}px` }}>
                     {name}
                  </div>
               ))}
            </div>
            
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#05090f] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#05090f] to-transparent z-10 pointer-events-none"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[70px] z-20 flex items-center justify-between px-2 pointer-events-none">
               <div className={`h-full w-2 border-l-2 border-t-2 border-b-2 transition-all duration-500 ${status === 'completed' ? 'border-[#dcb06b] animate-pulse' : 'border-[#4a5f78]/30'}`}></div>
               <div className={`h-full w-2 border-r-2 border-t-2 border-b-2 transition-all duration-500 ${status === 'completed' ? 'border-[#dcb06b] animate-pulse' : 'border-[#4a5f78]/30'}`}></div>
            </div>
         </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="mt-8 h-20 flex flex-col items-center justify-center">
         {status === 'scrolling' ? (
             <div className="flex flex-col items-center animate-pulse">
                <div className="text-[#dcb06b] font-orbitron text-[10px] uppercase tracking-[0.6em] font-bold mb-2">SCANNING LOBBY...</div>
                <div className="w-48 h-[1px] bg-[#1e3a5f] relative overflow-hidden clip-corner-sm">
                    <div className="absolute inset-0 bg-[#dcb06b] animate-[loading-bar_1.5s_infinite]"></div>
                </div>
             </div>
         ) : (
             <div className="text-white font-orbitron text-[10px] uppercase tracking-[0.4em] animate-[bounce_0.6s_infinite] text-center font-bold">
                <span className="text-[#dcb06b] block text-[8px] mb-1">LOCK ACHIEVED</span>
                PLAYER CONFIRMED
             </div>
         )}
      </div>

      <style>{`
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes chromatic {
          0% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; }
          25% { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #0000ff; }
          50% { text-shadow: 2px -1px 0 #ff0000, -2px 1px 0 #0000ff; }
          75% { text-shadow: -2px 1px 0 #ff0000, 2px -1px 0 #0000ff; }
          100% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; }
        }
      `}</style>
    </div>
  );
};
