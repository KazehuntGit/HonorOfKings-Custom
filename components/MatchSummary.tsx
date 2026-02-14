
import React from 'react';
import { MatchResult, TeamSlot, Role } from '../types';
import { ROLES_ORDER, RoleIcons } from '../constants';
import { Button } from './Button';

interface MatchSummaryProps {
  match: MatchResult;
  onReset: (winner: 'azure' | 'crimson' | null) => void;
}

export const MatchSummary: React.FC<MatchSummaryProps> = ({ match, onReset }) => {
  const getPlayer = (slots: TeamSlot[], role: Role) => slots.find(s => s.role === role)?.player;

  return (
    <div className="min-h-screen bg-[url('https://wallpaperaccess.com/full/3739268.jpg')] bg-cover bg-center bg-no-repeat bg-fixed relative flex flex-col items-center justify-center p-4 overflow-hidden">
       {/* Dark Overlay */}
       <div className="absolute inset-0 bg-[#05090f]/90 backdrop-blur-md z-0"></div>

       <div className="relative z-10 w-full max-w-7xl animate-slide-in flex flex-col items-center h-full justify-center">
          
          {/* Header - Scaled Up */}
          <div className="text-center mb-10">
             <h1 className="text-5xl md:text-7xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-[#f3dcb1] to-[#dcb06b] drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-[0.1em]">
                BATTLE FINISHED
             </h1>
             <div className="flex items-center justify-center gap-4 mt-4">
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-[#dcb06b]"></div>
                <p className="text-[#dcb06b] font-orbitron tracking-[0.4em] font-bold text-lg uppercase">ROOM ID: {match.roomId}</p>
                <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-[#dcb06b]"></div>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-center relative w-full">
             
             {/* AZURE TEAM - Wider */}
             <div className="flex-1 bg-gradient-to-r from-[#0a1a2f]/90 to-transparent p-6 border-l-8 border-cyan-500 clip-corner-md shadow-[0_0_30px_rgba(6,182,212,0.2)] relative min-w-[320px]">
                <div className="mb-6 relative">
                   <h2 className="text-xl md:text-2xl font-cinzel font-black text-white tracking-[0.2em] drop-shadow-[0_0_15px_#00d2ff] flex items-center gap-4 uppercase leading-tight whitespace-normal break-words">
                      <div className="w-3 h-8 bg-cyan-500 shadow-[0_0_15px_#00d2ff] shrink-0"></div>
                      {match.azureTeamName}
                   </h2>
                </div>

                <div className="space-y-3">
                   {ROLES_ORDER.map((role) => {
                      const player = getPlayer(match.azureTeam, role);
                      return (
                        <div key={role} className="flex items-center gap-4 group h-12 bg-black/30 p-2 rounded border border-white/5">
                           <div className="shrink-0 flex items-center justify-center w-32 h-10 bg-[#05090f] border border-cyan-500/30 rounded text-cyan-500">
                              {RoleIcons[role]}
                           </div>
                           <div className="min-w-0 flex-1">
                              <div className="text-lg md:text-xl font-orbitron text-white truncate font-bold">{player?.name}</div>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>

             {/* VS DIVIDER - Larger */}
             <div className="relative z-20 flex items-center justify-center shrink-0 my-4 lg:my-0 lg:-mx-10">
                <div className="relative w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center">
                   <div className="absolute inset-0 bg-[#dcb06b] rotate-45 opacity-25 blur-2xl animate-pulse"></div>
                   <div className="absolute inset-0 border-4 border-[#dcb06b] rotate-45 bg-[#05090f] shadow-[0_0_30px_rgba(220,176,107,0.4)]"></div>
                   <span className="text-4xl lg:text-5xl font-black italic text-[#dcb06b] font-orbitron z-10 drop-shadow-[0_0_10px_#dcb06b]">VS</span>
                </div>
             </div>

             {/* CRIMSON TEAM - Wider */}
             <div className="flex-1 bg-gradient-to-l from-[#1a0505]/90 to-transparent p-6 border-r-8 border-red-500 clip-corner-md text-right shadow-[0_0_30px_rgba(239,68,68,0.2)] relative min-w-[320px]">
                <div className="mb-6 relative">
                   <h2 className="text-xl md:text-2xl font-cinzel font-black text-white tracking-[0.2em] drop-shadow-[0_0_15px_#ef4444] flex flex-row-reverse items-center gap-4 uppercase leading-tight whitespace-normal break-words">
                      <div className="w-3 h-8 bg-red-500 shadow-[0_0_15px_#ef4444] shrink-0"></div>
                      {match.crimsonTeamName}
                   </h2>
                </div>

                <div className="space-y-3">
                   {ROLES_ORDER.map((role) => {
                      const player = getPlayer(match.crimsonTeam, role);
                      return (
                        <div key={role} className="flex flex-row-reverse items-center gap-4 group h-12 bg-black/30 p-2 rounded border border-white/5">
                           <div className="shrink-0 flex items-center justify-center w-32 h-10 bg-[#05090f] border border-red-500/30 rounded text-red-500">
                              {RoleIcons[role]}
                           </div>
                           <div className="min-w-0 flex-1">
                              <div className="text-lg md:text-xl font-orbitron text-white truncate font-bold">{player?.name}</div>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>

          {/* Footer Actions - Scaled Up */}
          <div className="mt-12 flex flex-col items-center gap-6">
             <div className="flex flex-wrap justify-center gap-8">
                <button 
                  onClick={() => onReset('azure')}
                  className="group relative px-12 py-4 bg-[#0a1a2f] border-4 border-cyan-500 clip-corner-sm hover:bg-cyan-500 hover:text-black transition-all font-cinzel font-black text-xl text-cyan-400 tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] uppercase"
                >
                   {match.azureTeamName.split(' (')[0]} WIN
                </button>

                <Button onClick={() => onReset(null)} variant="secondary" className="px-10 h-16 border-[#8a9db8] text-[#8a9db8] text-sm">
                   DECLARE DRAW
                </Button>

                <button 
                  onClick={() => onReset('crimson')}
                  className="group relative px-12 py-4 bg-[#1a0505] border-4 border-red-500 clip-corner-sm hover:bg-red-500 hover:text-black transition-all font-cinzel font-black text-xl text-red-500 tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] uppercase"
                >
                   {match.crimsonTeamName.split(' (')[0]} WIN
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
