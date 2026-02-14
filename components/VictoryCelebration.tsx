
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { TeamSlot } from '../types';
import { ROLES_ORDER, RoleIcons } from '../constants';

interface VictoryCelebrationProps {
  winner: 'azure' | 'crimson';
  teamSlots: TeamSlot[];
  azureTeamName: string;
  crimsonTeamName: string;
  onDismiss: () => void;
}

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({ winner, teamSlots, azureTeamName, crimsonTeamName, onDismiss }) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    // Generate static confetti particles
    const arr = Array.from({ length: 50 }).map((_, i) => i);
    setParticles(arr);
  }, []);

  const isAzure = winner === 'azure';
  const themeColor = isAzure ? '#00d2ff' : '#ef4444';
  const teamName = isAzure ? azureTeamName : crimsonTeamName;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#05090f]/95 backdrop-blur-xl overflow-hidden animate-slide-in">
        
        {/* God Rays Background */}
        <div className="god-rays opacity-30"></div>

        {/* Background Ambient Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20 pointer-events-none ${isAzure ? 'bg-cyan-500' : 'bg-red-500'}`}></div>

        {/* Confetti */}
        {particles.map(i => (
           <div 
             key={i} 
             className="confetti-piece"
             style={{
               left: `${Math.random() * 100}%`,
               animationDelay: `${Math.random() * 2}s`,
               backgroundColor: Math.random() > 0.5 ? '#dcb06b' : themeColor
             }}
           ></div>
        ))}

        <div className="relative z-10 flex flex-col items-center animate-trophy-pop w-full max-w-5xl px-4">
            
            {/* Victory Text */}
            <h2 className="text-3xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#dcb06b] tracking-[0.2em] drop-shadow-[0_2px_10px_rgba(220,176,107,0.5)] mb-2">
                CONGRATULATIONS
            </h2>
            
            <div className="flex items-center gap-4 mb-8">
               <div className={`h-[2px] w-12 md:w-20 ${isAzure ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
               <h1 className={`text-4xl md:text-5xl font-orbitron font-bold uppercase ${isAzure ? 'text-cyan-400' : 'text-red-500'} drop-shadow-[0_0_15px_currentColor] text-center`}>
                   {teamName}
               </h1>
               <div className={`h-[2px] w-12 md:w-20 ${isAzure ? 'bg-cyan-500' : 'bg-red-500'}`}></div>
            </div>

            {/* Main Trophy Graphic */}
            <div className="relative mb-8 transform hover:scale-105 transition-transform duration-500 animate-float">
                <div className="absolute inset-0 bg-[#dcb06b] blur-[50px] opacity-30"></div>
                <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                    <path d="M170 30H150V20C150 14.477 145.523 10 140 10H60C54.477 10 50 14.477 50 20V30H30C18.954 30 10 38.954 10 50V70C10 93.85 26.65 113.79 49.03 118.94C53.47 143.5 72.56 162.7 96 168.3V180H70C64.477 180 60 184.477 60 190H140C140 184.477 135.523 180 130 180H104V168.3C127.44 162.7 146.53 143.5 150.97 118.94C173.35 113.79 190 93.85 190 70V50C190 38.954 181.046 30 170 30ZM30 70V50C30 49.63 30.04 49.27 30.1 48.91C30.69 49.49 31.32 50 32 50H50V99.1C38.31 94.66 30 83.33 30 70ZM170 70C170 83.33 161.69 94.66 150 99.1V50H168C168.68 50 169.31 49.49 169.9 48.91C169.96 49.27 170 49.63 170 50V70Z" fill="url(#paint0_linear)"/>
                    <defs>
                        <linearGradient id="paint0_linear" x1="100" y1="10" x2="100" y2="190" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#F3DCB1"/>
                            <stop offset="0.5" stopColor="#DCB06B"/>
                            <stop offset="1" stopColor="#8A6D3B"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Winning Roster Grid */}
            <div className="w-full mb-10">
               <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {ROLES_ORDER.map((role, idx) => {
                     const slot = teamSlots.find(s => s.role === role);
                     return (
                       <div 
                         key={role} 
                         className="flex flex-col items-center p-3 bg-[#0a1a2f]/40 border border-[#dcb06b]/30 clip-corner-sm backdrop-blur-md transform transition-all duration-500 hover:scale-105 hover:bg-[#dcb06b]/10"
                       >
                          <div className="text-[#dcb06b] mb-2 opacity-80 flex items-center justify-center">
                             {RoleIcons[role]}
                          </div>
                          <span className="text-white font-orbitron font-bold text-sm tracking-wide truncate max-w-full">
                             {slot?.player.name}
                          </span>
                       </div>
                     );
                  })}
               </div>
            </div>

            <Button onClick={onDismiss} className="px-12 py-4 text-lg border border-[#dcb06b] shadow-[0_0_20px_#dcb06b] animate-pulse">
                PROCEED TO EVALUATION
            </Button>
        </div>
    </div>
  );
};
