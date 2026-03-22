import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Player } from '../types';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (presentNames: string[]) => void;
  players: Player[];
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose, onProcess, players }) => {
  const [input, setInput] = useState('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [parsedNames, setParsedNames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setStep('input');
      setParsedNames([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParse = () => {
    const lines = input.split('\n');
    let currentDiscordName = '';
    const presentNames = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check for timestamp
        const timestampMatch = line.match(/^(.*?)(?:[\—\-]\s+)(?:Today|Yesterday|Tomorrow|\d{1,2}\/\d{1,2})/i);
        if (timestampMatch) {
            const possibleName = timestampMatch[1].trim();
            if (possibleName) {
                currentDiscordName = possibleName;
            } else if (i > 0) {
                // If the line is just " — 2/12/2026 1:15", the name is on the previous line
                currentDiscordName = lines[i-1].trim();
            }
            continue;
        }

        // Check for "hadir"
        if (line.toLowerCase().includes('hadir')) {
            if (currentDiscordName) {
                presentNames.add(currentDiscordName.toLowerCase());
            }
            // Also try to extract IGN if format is "IGN: Hadir"
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const ign = line.substring(0, colonIndex).trim();
                if (ign) presentNames.add(ign.toLowerCase());
            } else {
                // If no colon, maybe just "Hadir" or "IGN Hadir"
                // Just add the whole line minus "hadir" if there's something else
                const cleanIgn = line.toLowerCase().replace('hadir', '').trim();
                if (cleanIgn) presentNames.add(cleanIgn);
            }
        }
    }

    setParsedNames(Array.from(presentNames));
    setStep('confirm');
  };

  const handleConfirm = () => {
    onProcess(parsedNames);
  };

  // Find matching players based on discordName
  const matchedPlayers = players.filter(p => p.discordName && parsedNames.includes(p.discordName.toLowerCase()));
  const unmatchedNames = parsedNames.filter(name => !players.some(p => p.discordName?.toLowerCase() === name));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#dcb06b]/20 flex justify-between items-center shrink-0">
          <h3 className="text-[#dcb06b] font-cinzel font-bold text-xl tracking-widest">
            {step === 'input' ? 'ATTENDANCE VERIFICATION' : 'CONFIRM ATTENDANCE'}
          </h3>
          <button onClick={onClose} className="text-[#8a9db8] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {step === 'input' ? (
            <>
              <p className="text-[#8a9db8] text-sm mb-4 font-orbitron">
                Paste the Discord chat logs below. Players who typed "Hadir" will be marked as Active based on their Discord Nickname. All other players will remain Benched.
              </p>
              <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Player 1&#10; — 2/12/2026 1:15&#10;Player1_IGN: Hadir&#10;&#10;Player 2&#10; — 2/12/2026 17:00&#10;Hadir"
                className="w-full h-64 bg-[#05090f] border border-[#1e3a5f] p-4 text-[#f0f4f8] focus:outline-none focus:border-[#dcb06b] clip-corner-sm font-orbitron resize-none"
              />
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#1e3a5f]/20 p-4 border border-[#1e3a5f] clip-corner-sm">
                <h4 className="text-[#dcb06b] font-orbitron font-bold mb-2 flex items-center justify-between">
                  <span>MATCHED PLAYERS ({matchedPlayers.length})</span>
                  <span className="text-xs text-[#8a9db8] font-normal">Will be marked ACTIVE</span>
                </h4>
                {matchedPlayers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchedPlayers.map(p => (
                      <span key={p.id} className="bg-[#05090f] border border-[#dcb06b]/50 text-white px-3 py-1 text-sm font-orbitron clip-corner-sm flex items-center gap-2">
                        {p.name} <span className="text-[#5865F2] text-xs">({p.discordName})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8a9db8] text-sm italic">No matching players found in roster.</p>
                )}
              </div>

              {unmatchedNames.length > 0 && (
                <div className="bg-red-900/20 p-4 border border-red-500/30 clip-corner-sm">
                  <h4 className="text-red-400 font-orbitron font-bold mb-2 flex items-center justify-between">
                    <span>UNMATCHED DISCORD NAMES ({unmatchedNames.length})</span>
                    <span className="text-xs text-red-400/70 font-normal">Not found in roster</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {unmatchedNames.map((name, i) => (
                      <span key={i} className="bg-[#05090f] border border-red-500/30 text-red-300 px-3 py-1 text-sm font-orbitron clip-corner-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-[#8a9db8] text-sm font-orbitron text-center mt-4 border-t border-[#1e3a5f] pt-4">
                Are you sure you want to proceed? All other players in the roster will be marked as Benched.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#dcb06b]/20 flex gap-3 shrink-0">
          {step === 'input' ? (
            <>
              <Button variant="secondary" onClick={onClose} className="flex-1">CANCEL</Button>
              <Button onClick={handleParse} className="flex-1" disabled={!input.trim()}>PARSE ATTENDANCE</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep('input')} className="flex-1">BACK</Button>
              <Button onClick={handleConfirm} className="flex-1">CONFIRM & APPLY</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
