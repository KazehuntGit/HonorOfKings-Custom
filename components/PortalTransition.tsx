
import React, { useEffect, useState } from 'react';
import { TeamSlot, Role } from '../types';
import { Button } from './Button';
import { RoleIcons, ROLES_ORDER } from '../constants';

interface PortalTransitionProps {
  onComplete: () => void;
  azureTeam: TeamSlot[];
  crimsonTeam: TeamSlot[];
  azureTeamName: string;
  crimsonTeamName: string;
  roomId?: string;
}

export const PortalTransition: React.FC<PortalTransitionProps> = ({ onComplete, azureTeam, crimsonTeam, azureTeamName, crimsonTeamName, roomId }) => {
  const [stage, setStage] = useState(0);
  
  useEffect(() => {
    // Animation sequence
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 800);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
    };
  }, []);

  const handleNext = () => {
    setStage(3); // Fade out
    setTimeout(() => {
        onComplete();
    }, 500);
  };

  const renderTeamGrid = (teamSlots: TeamSlot[], teamColor: 'cyan' | 'red') => {
      const displaySlots = [...teamSlots].sort((a, b) => {
          if (a.role === Role.COACH) return 1;
          if (b.role === Role.COACH) return -1;
          return ROLES_ORDER.indexOf(a.role) - ROLES_ORDER.indexOf(b.role);
      });

      const isCyan = teamColor === 'cyan';
      
      return (
        <div className="grid grid-cols-5 gap-3 md:gap-6 w-full max-w-6xl mx-auto px-6 relative z-10">
            {displaySlots.map((slot, idx) => {
                const isCoach = slot.role === Role.COACH;
                const isMvp = slot.player.isLastMatchMvp;

                let borderClass = isCyan 
                    ? 'border-[#00d2ff]/30 shadow-[0_0_15px_rgba(0,210,255,0.1)]' 
                    : 'border-[#ef4444]/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
                
                // Enhanced MVP Styling
                if (isMvp && !isCoach) {
                    borderClass = 'border-[#fbbf24] shadow-[0_0_25px_rgba(251,191,36,0.6)] bg-[#fbbf24]/5 scale-105 z-20 ring-1 ring-[#fbbf24]/50';
                }

                return (
                    <div 
                        key={idx} 
                        className={`
                            relative flex flex-col items-center
                            w-full aspect-[3/4]
                            clip-corner-sm backdrop-blur-md
                            border transition-all duration-500 transform group
                            ${stage >= 2 ? 'opacity-100 scale-100 translate-y-0' : `opacity-0 scale-75 ${isCyan ? '-translate-y-10' : 'translate-y-10'}`}
                            ${isCyan ? 'bg-[#0a1a2f]/60' : 'bg-[#1a0505]/60'}
                            ${borderClass}
                        `}
                        style={{ transitionDelay: `${900 + (idx * 50)}ms` }}
                    >
                        {isMvp && !isCoach && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-black text-[8px] font-black px-2 py-0.5 clip-corner-sm shadow-lg z-30 tracking-widest">
                                MVP
                            </div>
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-b ${isCyan ? 'from-[#00d2ff]/10' : 'from-[#ef4444]/10'} to-transparent opacity-50`}></div>
                        <div className={`w-full h-1 ${isCyan ? 'bg-[#00d2ff]' : 'bg-[#ef4444]'} opacity-70`}></div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2 w-full relative z-10">
                            <div className={`
                                mb-2 transform transition-transform duration-300 group-hover:scale-110 
                                ${isCyan ? 'text-[#00d2ff] drop-shadow-[0_0_8px_rgba(0,210,255,0.6)]' : 'text-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'}
                                opacity-90
                            `}>
                                <div className="scale-110 md:scale-125">
                                   {RoleIcons[slot.role]}
                                </div>
                            </div>
                            <div className="w-full flex justify-between px-2 mb-2 opacity-30">
                                <div className={`h-[1px] w-3 ${isCyan ? 'bg-cyan-400' : 'bg-red-500'}`}></div>
                                <div className={`h-[1px] w-3 ${isCyan ? 'bg-cyan-400' : 'bg-red-500'}`}></div>
                            </div>
                            <div className="w-full relative">
                                <div className="absolute inset-0 bg-black/60 blur-sm"></div>
                                {/* Discord Info */}
                                {slot.player.discordName && (
                                    <div className="relative z-10 flex justify-center items-center gap-1 mb-0.5 opacity-80">
                                        <svg className="w-2.5 h-2.5 text-[#5865F2]" viewBox="0 0 127 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M107.701 8.04901C107.701 8.04901 98.7997 0.941655 88.5997 0C88.1997 0.541667 87.2997 2.04902 86.2997 3.34902C75.2997 1.84902 64.3997 1.84902 53.6997 3.34902C52.6997 2.04902 51.7997 0.541667 51.3997 0C41.1997 0.941655 32.2997 8.04901 32.2997 8.04901C13.8997 35.549 14.3997 62.449 16.8997 88.949C28.2997 97.449 43.0997 102.449 57.8997 102.449C61.3997 97.749 64.3997 92.749 66.8997 87.449C61.6997 85.449 56.7997 82.949 52.1997 80.049C53.4997 79.149 54.6997 78.149 55.7997 77.149C82.3997 89.449 111.4 89.449 137.6 77.149C138.8 78.249 140 79.249 141.3 80.049C136.7 82.949 131.8 85.449 126.6 87.449C129.1 92.749 132.1 97.749 135.6 102.449C150.4 102.449 165.2 97.449 176.6 88.949C179.3 61.249 174.5 35.549 156.1 8.04901C156.1 8.04901 147.2 0.941655 137 0C136.6 0.541667 135.7 2.04902 134.7 3.34902C124 1.84902 113.1 1.84902 102.1 3.34902C101.1 2.04902 100.2 0.541667 99.8003 0C89.6003 0.941655 80.7003 8.04901 80.7003 8.04901ZM64.0997 68.349C56.2997 68.349 49.8997 61.249 49.8997 52.549C49.8997 43.849 56.0997 36.749 64.0997 36.749C72.0997 36.749 78.4997 43.849 78.2997 52.549C78.2997 61.249 72.0997 68.349 64.0997 68.349ZM124.3 68.349C116.5 68.349 110.1 61.249 110.1 52.549C110.1 43.849 116.3 36.749 124.3 36.749C132.3 36.749 138.7 43.849 138.5 52.549C138.5 61.249 132.3 68.349 124.3 68.349Z" fill="currentColor" />
                                        </svg>
                                        <span className="text-[8px] text-white/70 font-orbitron">{slot.player.discordName}</span>
                                    </div>
                                )}
                                <span className="relative z-10 block text-[9px] md:text-xs font-orbitron font-bold text-white truncate w-full text-center tracking-wider py-1">
                                    {slot.player.name}
                                </span>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${isCyan ? 'border-[#00d2ff]' : 'border-[#ef4444]'}`}></div>
                        <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${isCyan ? 'border-[#00d2ff]' : 'border-[#ef4444]'}`}></div>
                        {isCoach && (
                            <div className="absolute top-2 right-2 text-[8px] font-black uppercase text-white bg-white/20 px-1 rounded">COACH</div>
                        )}
                    </div>
                );
            })}
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#05090f] flex flex-col items-center justify-center overflow-hidden font-inter select-none">
        
        {/* --- GLOBAL BACKGROUND EFFECTS --- */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ backgroundImage: 'linear-gradient(#1e3a5f 1px, transparent 1px), linear-gradient(90deg, #1e3a5f 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none"></div>
        <div className={`absolute inset-0 bg-white pointer-events-none z-[60] mix-blend-overlay ${stage === 2 ? 'animate-[impact-flash_0.3s_ease-out_forwards]' : 'opacity-0'}`}></div>
        
        {/* --- ROOM ID DISPLAY (TOP RIGHT) --- */}
        <div className={`
             absolute top-6 right-8 z-[80] flex flex-col items-end gap-1 scale-[0.85] origin-top-right animate-slide-in
             transition-opacity duration-700
             ${stage >= 1 ? 'opacity-100' : 'opacity-0'}
        `}>
            <span className="text-[#dcb06b] font-orbitron text-[10px] tracking-[0.4em] font-black uppercase mb-1.5 opacity-80 shadow-black drop-shadow-md">ROOM ID</span>
            <div className="relative">
               <div className="absolute -inset-4 bg-[#dcb06b] blur-[25px] opacity-20 pointer-events-none"></div>
               <div className="relative bg-black/80 border border-[#dcb06b] px-10 py-2 clip-corner-sm flex flex-col items-center shadow-[0_0_20px_rgba(220,176,107,0.3)] backdrop-blur-sm">
                  <span className="text-3xl font-orbitron font-black text-white tracking-[0.3em] drop-shadow-[0_0_10px_#dcb06b] animate-[chromatic_0.2s_infinite]">
                    {roomId || '----'}
                  </span>
               </div>
            </div>
        </div>

        {/* --- MAIN ANIMATION CONTAINER --- */}
        <div className={`
            absolute inset-0 flex flex-col w-full h-full z-10 pointer-events-none
            ${stage === 2 ? 'animate-[clash-shake_0.4s_ease-in-out]' : ''}
            transition-opacity duration-700
            ${stage === 3 ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}
        `}>
            
            {/* TOP HALF (AZURE) */}
            <div className={`
                absolute top-0 left-0 right-0 h-[50vh]
                bg-gradient-to-b from-[#0a1a2f] via-[#0a1a2f]/80 to-[#00d2ff]/10
                flex flex-col items-center justify-end
                transform transition-all duration-500 cubic-bezier(0.22, 1, 0.36, 1)
                ${stage >= 1 ? 'translate-y-0' : '-translate-y-full'}
                z-10 pb-16
            `}>
                <div className="absolute top-[15%] flex flex-col items-center w-full px-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00d2ff] tracking-[0.2em] drop-shadow-[0_0_20px_rgba(0,210,255,0.5)] uppercase max-w-full leading-tight break-words">{azureTeamName}</h2>
                    <div className="text-[#00d2ff] text-xs font-orbitron tracking-[0.5em] opacity-70 mt-2">AZURE GOLEM</div>
                </div>
                {renderTeamGrid(azureTeam, 'cyan')}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00d2ff] shadow-[0_0_30px_#00d2ff] z-20"></div>
            </div>

            {/* BOTTOM HALF (CRIMSON) */}
            <div className={`
                absolute bottom-0 left-0 right-0 h-[50vh] 
                bg-gradient-to-t from-[#1a0505] via-[#1a0505]/80 to-[#ef4444]/10
                flex flex-col items-center justify-start
                transform transition-all duration-500 cubic-bezier(0.22, 1, 0.36, 1)
                ${stage >= 1 ? 'translate-y-0' : 'translate-y-full'}
                z-10 pt-16
            `}>
                 <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ef4444] shadow-[0_0_30px_#ef4444] z-20"></div>
                 {renderTeamGrid(crimsonTeam, 'red')}
                 <div className="absolute bottom-[25%] flex flex-col items-center w-full px-10 text-center">
                     <div className="text-[#ef4444] text-xs font-orbitron tracking-[0.5em] opacity-70 mb-2">CRIMSON GOLEM</div>
                     <h2 className="text-3xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-[#ef4444] to-[#7f1d1d] tracking-[0.2em] drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] uppercase max-w-full leading-tight break-words">{crimsonTeamName}</h2>
                 </div>
            </div>

            {/* CENTER UI (VS) */}
            <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[50]
                flex items-center justify-center transform transition-all duration-300
                ${stage >= 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            `}>
                <div className={`absolute inset-0 border-2 border-[#dcb06b] rounded-full opacity-0 ${stage === 2 ? 'animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]' : ''}`}></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#05090f] rotate-45 border-2 border-[#dcb06b] shadow-[0_0_40px_rgba(220,176,107,0.5)] animate-[spin_8s_linear_infinite]"></div>
                    <div className="absolute inset-2 border border-[#dcb06b]/50 rotate-45 bg-black/40 backdrop-blur-sm"></div>
                    <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-[#f3dcb1] to-[#dcb06b] font-orbitron font-black text-4xl md:text-5xl italic drop-shadow-sm pr-1 pt-1">VS</span>
                    <div className="absolute top-1/2 left-[-40px] w-10 h-[2px] bg-gradient-to-l from-[#dcb06b] to-transparent"></div>
                    <div className="absolute top-1/2 right-[-40px] w-10 h-[2px] bg-gradient-to-r from-[#dcb06b] to-transparent"></div>
                </div>
            </div>

            {/* Enter Button (Bottom Center) */}
            <div className={`
                absolute bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-6 pointer-events-auto
                transform transition-all duration-700 delay-300
                ${stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
            `}>
                <Button 
                    onClick={handleNext} 
                    className="w-full py-6 text-xl font-black tracking-[0.3em] border-2 border-[#dcb06b] text-[#dcb06b] bg-[#0a1a2f]/90 hover:bg-[#dcb06b] hover:text-black shadow-[0_0_30px_rgba(220,176,107,0.2)] hover:shadow-[0_0_50px_rgba(220,176,107,0.6)] transition-all duration-300 clip-corner-md"
                >
                    ENTER BATTLEFIELD
                </Button>
            </div>
        </div>

        {/* Global Keyframes */}
        <style>{`
            @keyframes impact-flash { 0% { opacity: 0; } 50% { opacity: 0.8; } 100% { opacity: 0; } }
            @keyframes clash-shake {
                0%, 100% { transform: translate(0, 0); }
                10%, 30%, 50%, 70%, 90% { transform: translate(-4px, -4px); }
                20%, 40%, 60%, 80% { transform: translate(4px, 4px); }
            }
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes chromatic { 0% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; } 25% { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #0000ff; } 50% { text-shadow: 2px -1px 0 #ff0000, -2px 1px 0 #0000ff; } 75% { text-shadow: -2px 1px 0 #ff0000, 2px -1px 0 #0000ff; } 100% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; } }
        `}</style>
    </div>
  );
};
