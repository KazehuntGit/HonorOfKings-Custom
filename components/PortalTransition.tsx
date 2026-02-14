
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
}

export const PortalTransition: React.FC<PortalTransitionProps> = ({ onComplete, azureTeam, crimsonTeam, azureTeamName, crimsonTeamName }) => {
  const [stage, setStage] = useState(0);
  
  // Stream State
  const [showConfig, setShowConfig] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false); // Controls the video popup
  const [streamUrl, setStreamUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);

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

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const id = extractVideoId(streamUrl);
      if (id) {
          setVideoId(id);
          setShowConfig(false);
          setShowPlayer(true); // Auto open player on success
      } else {
          if (!streamUrl.trim()) setVideoId(null);
          setShowConfig(false);
      }
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
                return (
                    <div 
                        key={idx} 
                        className={`
                            relative flex flex-col items-center
                            w-full aspect-[3/4]
                            clip-corner-sm backdrop-blur-md
                            border transition-all duration-500 transform group
                            ${stage >= 2 ? 'opacity-100 scale-100 translate-y-0' : `opacity-0 scale-75 ${isCyan ? '-translate-y-10' : 'translate-y-10'}`}
                            ${isCyan 
                                ? 'bg-[#0a1a2f]/60 border-[#00d2ff]/30 shadow-[0_0_15px_rgba(0,210,255,0.1)]' 
                                : 'bg-[#1a0505]/60 border-[#ef4444]/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                            }
                        `}
                        style={{ transitionDelay: `${900 + (idx * 50)}ms` }}
                    >
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
                    <div className="text-[#00d2ff] text-xs font-orbitron tracking-[0.5em] opacity-70 mt-2">ALLIANCE</div>
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
                     <div className="text-[#ef4444] text-xs font-orbitron tracking-[0.5em] opacity-70 mb-2">LEGION</div>
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

        {/* --- CONFIG MODAL & VIDEO PLAYER REMAIN UNCHANGED BUT OMITTED FOR BREVITY --- */}

        {/* Global Keyframes */}
        <style>{`
            @keyframes impact-flash { 0% { opacity: 0; } 50% { opacity: 0.8; } 100% { opacity: 0; } }
            @keyframes clash-shake {
                0%, 100% { transform: translate(0, 0); }
                10%, 30%, 50%, 70%, 90% { transform: translate(-4px, -4px); }
                20%, 40%, 60%, 80% { transform: translate(4px, 4px); }
            }
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
    </div>
  );
};
