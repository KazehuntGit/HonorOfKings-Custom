
import React, { useEffect, useState, useRef } from 'react';
import { MatchResult, Role } from '../types';
import { RoleIcons, ROLES_ORDER } from '../constants';
import { Button } from './Button';

interface EvaluationScreenProps {
  match: MatchResult;
  winner: 'azure' | 'crimson';
  onComplete: (mvpId?: string, ratings?: Record<string, number>) => void;
}

export const EvaluationScreen: React.FC<EvaluationScreenProps> = ({ match, winner, onComplete }) => {
  const [mvpId, setMvpId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadingTimer = setTimeout(() => setIsLoading(false), 2000);
    return () => {
       clearTimeout(loadingTimer);
       if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !timerRef.current) {
        timerRef.current = window.setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
  }, [isLoading]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("type", "mvp-token");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, playerId: string) => {
     e.preventDefault();
     if (e.dataTransfer.getData("type") === "mvp-token") setMvpId(playerId);
  };

  const cycleRatingUp = (playerId: string) => {
      setRatings(prev => {
          const current = prev[playerId] || 0;
          let next = (current < 0) ? 1 : (current === 0) ? 1 : (current === 1) ? 2 : 0;
          const newState = { ...prev, [playerId]: next };
          if (next === 0) delete newState[playerId];
          return newState;
      });
  };

  const cycleRatingDown = (playerId: string) => {
    setRatings(prev => {
        const current = prev[playerId] || 0;
        let next = (current > 0) ? -1 : (current === 0) ? -1 : (current === -1) ? -2 : 0;
        const newState = { ...prev, [playerId]: next };
        if (next === 0) delete newState[playerId];
        return newState;
    });
  };

  const renderRatingButton = (playerId: string, direction: 'up' | 'down', currentRating: number) => {
      const isUp = direction === 'up';
      const isActive = isUp ? currentRating > 0 : currentRating < 0;
      const isDouble = isUp ? currentRating === 2 : currentRating === -2;
      const colorClass = isUp ? (isActive ? 'text-green-400' : 'text-gray-600') : (isActive ? 'text-red-500' : 'text-gray-600');
      const glowClass = isActive ? (isUp ? 'drop-shadow-[0_0_10px_#4ade80]' : 'drop-shadow-[0_0_10px_#ef4444]') : '';

      return (
          <button onClick={() => isUp ? cycleRatingUp(playerId) : cycleRatingDown(playerId)} className={`p-1.5 hover:bg-white/10 transition-all ${colorClass} ${glowClass} flex flex-col items-center -space-y-1.5`}>
              {isUp ? (
                  <>{isDouble && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={7}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>}<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={7}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></>
              ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={7}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>{isDouble && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={7}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>}</>
              )}
          </button>
      );
  };

  const renderTeamColumn = (teamSlots: any[], teamName: string, isWinner: boolean, teamColor: 'cyan' | 'red') => {
      const textColor = teamColor === 'cyan' ? 'text-cyan-400' : 'text-red-500';
      const hexColor = teamColor === 'cyan' ? '#00d2ff' : '#ef4444';
      const rolesToRender = match.isCoachMode ? [Role.COACH, ...ROLES_ORDER] : ROLES_ORDER;
      const innerBgColor = teamColor === 'cyan' ? (isWinner ? 'bg-[#0a1a2f]/95' : 'bg-[#0a1a2f]/60') : (isWinner ? 'bg-[#1a0505]/95' : 'bg-[#1a0505]/60');

      return (
        <div className={`flex-1 w-full relative flex flex-col h-full clip-corner-md transition-all duration-700 p-[3px] ${isWinner ? `shadow-[0_0_50px_${hexColor}] z-10 scale-[1.02]` : 'shadow-[0_0_20px_rgba(0,0,0,0.5)] opacity-50 scale-95'}`}>
            {isWinner ? (
                <div className="absolute inset-[-50%] animate-[spin_3s_linear_infinite]" style={{ background: `conic-gradient(from 0deg, transparent 0deg, transparent 60deg, ${hexColor} 120deg, ${hexColor} 180deg, transparent 240deg)` }}></div>
            ) : (
                <div className={`absolute inset-0 ${teamColor === 'cyan' ? 'bg-[#1e3a5f]' : 'bg-[#450a0a]'}`}></div>
            )}
            <div className={`relative z-10 w-full h-full flex flex-col ${innerBgColor} clip-corner-md overflow-hidden`}>
                <div className={`p-5 flex justify-between items-center border-b border-white/10 ${teamColor === 'cyan' ? 'bg-[#00d2ff]/20' : 'bg-[#ef4444]/20'}`}>
                    <h3 className={`${textColor} font-cinzel font-black text-xl tracking-[0.2em] drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>{teamName}</h3>
                    {isWinner && <span className="text-[#05090f] font-black uppercase tracking-[0.2em] text-[10px] border border-[#dcb06b] px-4 py-1.5 rounded bg-[#dcb06b] shadow-[0_0_15px_#dcb06b] animate-pulse">Victory</span>}
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    {rolesToRender.map(role => {
                        const slot = teamSlots.find(s => s.role === role);
                        if(!slot) return null;
                        const isMvp = slot.player.id === mvpId;
                        const rating = ratings[slot.player.id] || 0;
                        const isCoach = role === Role.COACH;
                        return (
                            <div key={role} onDragOver={!isCoach ? handleDragOver : undefined} onDrop={!isCoach ? (e) => handleDrop(e, slot.player.id) : undefined} className={`flex items-center justify-between bg-black/40 p-4 rounded-md border-2 h-20 relative transition-all duration-300 ${isMvp ? 'border-yellow-400 shadow-[0_0_25px_rgba(251,191,36,0.3)] scale-[1.02] z-10' : 'border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={`shrink-0 scale-[0.85] ${teamColor === 'cyan' ? 'text-cyan-400' : 'text-red-500'}`}>{RoleIcons[role]}</div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`text-lg font-orbitron truncate font-bold tracking-wider ${isMvp || slot.player.isCaptain ? 'text-[#fbbf24]' : 'text-white'}`}>{slot.player.name}</div>
                                        {slot.player.isCaptain && (
                                            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter bg-[#fbbf24] text-black clip-corner-sm shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0">
                                                CAPTAIN
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!isCoach && (
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="flex flex-col gap-1">{renderRatingButton(slot.player.id, 'up', rating)}{renderRatingButton(slot.player.id, 'down', rating)}</div>
                                    <div className="w-12 h-12 flex items-center justify-center">
                                        {isMvp ? <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-black text-black text-[10px] shadow-[0_0_15px_gold] border-2 border-white/40">MVP</div> : <div className="w-10 h-10 border-2 border-dashed border-white/10 rounded-full opacity-30"></div>}
                                    </div>
                                </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#05090f] fixed inset-0 z-[50] flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-7xl h-full flex flex-col py-6 animate-slide-in">
          <div className="text-center mb-8 flex justify-between items-center px-8">
             <div className="text-left">
                <h1 className="text-4xl font-cinzel font-black text-[#dcb06b] tracking-[0.3em] mb-1 uppercase drop-shadow-[0_0_10px_rgba(220,176,107,0.3)]">EVALUATION SESSION</h1>
                <p className="text-[10px] text-[#4a5f78] uppercase font-black tracking-[0.5em]">ANALYZE COMBAT PERFORMANCE & REWARD VALOR</p>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[#8a9db8] text-[10px] font-orbitron tracking-widest mb-2 uppercase">BATTLE TIME</span>
                <div className="text-3xl font-mono font-bold text-white bg-black/80 px-10 py-2 rounded-md border-2 border-[#dcb06b]/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">{formatTime(elapsedSeconds)}</div>
             </div>
          </div>
          
          <div className="flex flex-col items-center mb-8 h-16">
            {!mvpId ? (
                <div draggable onDragStart={handleDragStart} className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 rounded-full flex items-center justify-center shadow-[0_0_30px_#fbbf24] border-4 border-white/30 animate-pulse">
                        <span className="font-black italic text-[#05090f] text-sm">MVP</span>
                    </div>
                </div>
            ) : (
                <button onClick={() => setMvpId('')} className="text-[10px] text-red-400 border-2 border-red-500/30 px-8 py-3 uppercase font-black tracking-[0.3em] hover:bg-red-950/60 transition-all clip-corner-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]">RESET MVP SELECTION</button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-stretch justify-center flex-1 max-h-[65vh]">
            {renderTeamColumn(match.azureTeam, "AZURE GOLEM", winner === 'azure', 'cyan')}
            {renderTeamColumn(match.crimsonTeam, "CRIMSON GOLEM", winner === 'crimson', 'red')}
          </div>

          <div className="mt-12 flex justify-center pb-6">
             <Button onClick={() => onComplete(mvpId, ratings)} size="lg" className="px-24 py-6 text-lg tracking-[0.4em] shadow-[0_0_30px_rgba(220,176,107,0.2)]">FINISH EVALUATION</Button>
          </div>
       </div>
    </div>
  );
};
