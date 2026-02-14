
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player, MatchResult, Role, MatchHistoryEntry, BracketMatchResult } from './types';
import { PlayerForm } from './components/PlayerForm';
import { PlayerList } from './components/PlayerList';
import { MatchDisplay } from './components/MatchDisplay';
import { EditPlayerModal } from './components/EditPlayerModal';
import { HistoryList } from './components/HistoryList';
import { generateMatch, generateBracketMatch, validateBracketPool } from './utils/matchmaker';
import { Button } from './components/Button';
import { BackgroundParticles } from './components/BackgroundParticles';
import { LocalClock } from './components/LocalClock';
import { ConfirmModal } from './components/ConfirmModal';
import { BracketDisplay } from './components/BracketDisplay';
import { PreparingModal } from './components/PreparingModal';
import { CookieConsent } from './components/CookieConsent';
import { setCookie, getCookie, eraseCookie } from './utils/cookies';

type ViewMode = 'lobby' | 'match' | 'battle' | 'bracket';
interface Toast { id: string; message: string; isExiting: boolean; }

// Persistence Keys
const STORAGE_KEY_PLAYERS = 'hok_roster_data_v2';
const STORAGE_KEY_HISTORY = 'hok_match_history_v2';
const STORAGE_KEY_ACTIVE_MATCH = 'hok_active_match_session';
const STORAGE_KEY_ACTIVE_BRACKET = 'hok_active_bracket_session';
const COOKIE_CONSENT_KEY = 'hok_cookie_consent_accepted';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('lobby');
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- STATE INITIALIZATION WITH COOKIES (NOW LOCAL STORAGE) ---

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      if (window.location.hash && window.location.hash.length > 1) {
        const hashData = window.location.hash.substring(1);
        const decoded = JSON.parse(atob(hashData));
        if (Array.isArray(decoded)) return decoded;
      }
      const saved = getCookie(STORAGE_KEY_PLAYERS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>(() => {
    try {
      const saved = getCookie(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Load Active Sessions
  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(() => {
      try {
          const saved = getCookie(STORAGE_KEY_ACTIVE_MATCH);
          return saved ? JSON.parse(saved) : null;
      } catch (e) { return null; }
  });

  const [bracketMatch, setBracketMatch] = useState<BracketMatchResult | null>(() => {
      try {
          const saved = getCookie(STORAGE_KEY_ACTIVE_BRACKET);
          return saved ? JSON.parse(saved) : null;
      } catch (e) { return null; }
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [isCoachMode, setIsCoachMode] = useState(false);
  const [isBracketMode, setIsBracketMode] = useState(false);
  const [numBracketTeams, setNumBracketTeams] = useState(4);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1); // 1: Config, 2: Roster, 3: Launch
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isPreparing, setIsPreparing] = useState(false);
  const [prepMessage, setPrepMessage] = useState("");
  const [prepError, setPrepError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- FULLSCREEN LOGIC ---
  const enableFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
        const req = elem.requestFullscreen || (elem as any).webkitRequestFullscreen || (elem as any).msRequestFullscreen;
        if (req) {
            req.call(elem).catch((err: any) => console.log("Fullscreen request blocked or failed:", err));
        }
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
        enableFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  }, [enableFullscreen]);

  useEffect(() => {
      const activate = () => {
          enableFullscreen();
          window.removeEventListener('click', activate);
          window.removeEventListener('touchstart', activate);
          window.removeEventListener('keydown', activate);
      };
      window.addEventListener('click', activate);
      window.addEventListener('touchstart', activate);
      window.addEventListener('keydown', activate);
      return () => {
          window.removeEventListener('click', activate);
          window.removeEventListener('touchstart', activate);
          window.removeEventListener('keydown', activate);
      };
  }, [enableFullscreen]);

  useEffect(() => {
    const hasConsented = getCookie(COOKIE_CONSENT_KEY);
    if (!hasConsented) setShowCookieConsent(true);
  }, []);

  const handleAcceptCookies = () => {
    setCookie(COOKIE_CONSENT_KEY, 'true', 365);
    setShowCookieConsent(false);
    enableFullscreen();
  };

  useEffect(() => {
    setCookie(STORAGE_KEY_PLAYERS, JSON.stringify(players), 30);
    try {
      const compactData = players.map(p => ({
        id: p.id,
        name: p.name,
        roles: p.roles,
        isAllRoles: p.isAllRoles,
        isActive: p.isActive,
        stats: p.stats
      }));
      const hash = btoa(JSON.stringify(compactData));
      if (hash.length < 50000) {
         window.history.replaceState(null, '', `#${hash}`);
      }
    } catch (e) {}
  }, [players]);

  useEffect(() => {
    setCookie(STORAGE_KEY_HISTORY, JSON.stringify(matchHistory), 30);
  }, [matchHistory]);

  useEffect(() => {
      if (currentMatch) {
          setCookie(STORAGE_KEY_ACTIVE_MATCH, JSON.stringify(currentMatch), 1);
      } else {
          eraseCookie(STORAGE_KEY_ACTIVE_MATCH);
      }
  }, [currentMatch]);

  useEffect(() => {
      if (bracketMatch) {
          setCookie(STORAGE_KEY_ACTIVE_BRACKET, JSON.stringify(bracketMatch), 1);
      } else {
          eraseCookie(STORAGE_KEY_ACTIVE_BRACKET);
      }
  }, [bracketMatch]);

  const navigate = useCallback((mode: ViewMode, data: any) => {
    setViewMode(mode);
    if (mode === 'lobby' && Array.isArray(data)) setPlayers(data);
    else if ((mode === 'match' || mode === 'battle') && data) setCurrentMatch(data);
    else if (mode === 'bracket' && data) setBracketMatch(data);
  }, []);

  const handleBackToLobby = () => {
      setViewMode('lobby');
  };

  const handleResumeSession = () => {
      if (currentMatch) {
          setViewMode('match');
      } else if (bracketMatch) {
          setViewMode('bracket');
      }
  };

  const hasActiveSession = !!currentMatch || !!bracketMatch;

  const dismissToast = (id: string) => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 1000);
  };

  const addToast = (message: string) => {
      const id = Date.now().toString() + Math.random().toString();
      setToasts(prev => [...prev, { id, message, isExiting: false }]);
      setTimeout(() => {
          dismissToast(id);
      }, 1500);
  };

  const handleBatchProcess = (batchData: { name: string; roles: Role[]; isAllRoles: boolean; action?: 'add' | 'bench' }[]) => {
    setPlayers(prev => {
      let updatedPlayers = [...prev];
      batchData.forEach(item => {
        const normalizedName = item.name.trim().toLowerCase();
        const existingIndex = updatedPlayers.findIndex(p => p.name.trim().toLowerCase() === normalizedName);
        if (item.action === 'bench') {
           if (existingIndex !== -1) updatedPlayers[existingIndex] = { ...updatedPlayers[existingIndex], isActive: false };
        } else {
           if (existingIndex !== -1) {
              updatedPlayers[existingIndex] = { ...updatedPlayers[existingIndex], roles: item.roles, isAllRoles: item.isAllRoles, isActive: true };
           } else {
              updatedPlayers.push({
                 id: crypto.randomUUID(),
                 name: item.name,
                 roles: item.roles,
                 isAllRoles: item.isAllRoles,
                 isActive: true,
                 isLastMatchMvp: false,
                 stats: { matchesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0 }
              });
           }
        }
      });
      return updatedPlayers;
    });
    setErrorMsg(null);
    batchData.forEach((item, index) => {
        setTimeout(() => {
            if (item.action === 'bench') {
                 addToast(`${item.name} :: BENCHED`);
            } else {
                 const roleDisplay = item.isAllRoles ? 'ALL ROLES' : item.roles.map(r => r.replace(' Lane', '')).join(', ').toUpperCase();
                 addToast(`${item.name} :: ${roleDisplay}`);
            }
        }, index * 300);
    });
  };

  const removePlayer = (id: string) => setPlayers(prev => prev.filter(p => p.id !== id));
  const togglePlayerActive = (id: string) => setPlayers(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  const handleEditPlayer = (player: Player) => { setEditingPlayer(player); setIsEditModalOpen(true); };
  
  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    if (currentMatch) {
       setCurrentMatch(prev => {
          if (!prev) return null;
          return {
             ...prev,
             azureTeam: prev.azureTeam.map(slot => slot.player.id === updatedPlayer.id ? { ...slot, player: { ...slot.player, name: updatedPlayer.name } } : slot),
             crimsonTeam: prev.crimsonTeam.map(slot => slot.player.id === updatedPlayer.id ? { ...slot, player: { ...slot.player, name: updatedPlayer.name } } : slot)
          };
       });
    }
    if (bracketMatch) {
       setBracketMatch(prev => {
          if (!prev) return null;
          return {
             ...prev,
             teams: prev.teams.map(team => ({
                 ...team,
                 slots: team.slots.map(slot => slot.player.id === updatedPlayer.id ? { ...slot, player: { ...slot.player, name: updatedPlayer.name } } : slot)
             }))
          };
       });
    }
  };

  const activePlayers = players.filter(p => p.isActive);

  const handleGenerate = async () => {
    if (!isBracketMode) {
      if (!roomId.trim() || roomId.length < 4) { setErrorMsg("Please enter a valid 4-digit Room ID."); return; }
    }
    
    setCurrentMatch(null);
    setBracketMatch(null);
    setErrorMsg(null);
    setIsPreparing(true);
    setPrepError(null);
    setPrepMessage("CONNECTING TO SERVER...");

    try {
        await delay(1000);
        setPrepMessage("SCANNING ACTIVE ROSTER...");
        await delay(800);
        
        // Phase 1: Validation
        setPrepMessage("VALIDATING ROLE COMPATIBILITY...");
        await delay(500); // Short delay to let UI show this message
        
        if (isBracketMode) {
            const validation = validateBracketPool(activePlayers, numBracketTeams);
            if (!validation.valid) throw new Error(validation.error);
            
            // Update UI before starting heavy process
            setPrepMessage("GENERATING TOURNAMENT BRACKET...");
            await delay(100); // Critical yield to let React render the "GENERATING" message

            // Phase 2: Heavy Generation (Synchronous)
            const result = generateBracketMatch(activePlayers, roomId, numBracketTeams);
            
            if (result) { 
                await delay(800); // Cosmetic delay to show success
                setBracketMatch(result); 
                setViewMode('bracket'); 
                setIsSetupOpen(false);
            } else { 
                throw new Error("UNABLE TO BALANCE TEAMS. Please check role distribution or add more flexible players."); 
            }
        } else {
            const required = isCoachMode ? 12 : 10;
            if (activePlayers.length < required) throw new Error(`INSUFFICIENT PLAYERS: Need ${required} active players.`);
            
            const result = generateMatch(activePlayers, roomId, isCoachMode);
            if (result) { 
                setPrepMessage("FINALIZING BATTLE DATA...");
                await delay(800);
                setCurrentMatch(result); 
                navigate('match', result); 
                setIsSetupOpen(false);
            } else { throw new Error("IMPOSSIBLE COMPOSITION. Too many constrained roles."); }
        }
        setIsPreparing(false);
    } catch (err: any) {
        setPrepError(err.message || "Unknown Error Occurred");
    }
  };

  const handleExportRoster = () => {
    if (players.length === 0) { alert("Roster is empty."); return; }
    const lines = players.map(p => {
        const name = p.name.trim();
        const roles = p.isAllRoles ? 'All Role' : p.roles.map(r => r === Role.JUNGLE ? 'Jungle' : r).join(', ');
        return `${name} : ${roles}`;
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => alert("Roster saved to clipboard!"));
  };

  const handleClearAll = () => {
    setConfirmState({
      isOpen: true,
      title: "CLEAR ROSTER",
      message: "This will permanently delete ALL players from your squad list.",
      isDestructive: true,
      onConfirm: () => setPlayers([]),
    });
  };

  const handleRerollSlot = (team: 'azure' | 'crimson', role: Role, newPlayer: Player) => {
    if (!currentMatch) return;
    const updatedMatch = {
        ...currentMatch,
        azureTeam: currentMatch.azureTeam.map(slot => (team === 'azure' && slot.role === role) ? { ...slot, player: newPlayer } : slot),
        crimsonTeam: currentMatch.crimsonTeam.map(slot => (team === 'crimson' && slot.role === role) ? { ...slot, player: newPlayer } : slot)
    };
    setCurrentMatch(updatedMatch); navigate('match', updatedMatch);
  };

  const handleBracketReroll = (teamIndex: number, role: Role, newPlayer: Player) => {
    if (!bracketMatch) return;
    const updatedTeams = bracketMatch.teams.map((team, idx) => {
        if (idx === teamIndex) {
            return { ...team, slots: team.slots.map(slot => slot.role === role ? { ...slot, player: newPlayer } : slot) };
        }
        return team;
    });
    setBracketMatch({ ...bracketMatch, teams: updatedTeams });
  };

  const handleMatchFinish = (winner: 'azure' | 'crimson' | null, mvpId?: string, ratings?: Record<string, number>) => {
    if (!currentMatch) return;
    const historyEntry = { ...currentMatch, id: crypto.randomUUID(), winningTeam: winner, mvpId, ratings };
    setMatchHistory(prev => [historyEntry, ...prev]);
    
    const azureIds = new Set(currentMatch.azureTeam.map(slot => slot.player.id));
    const crimsonIds = new Set(currentMatch.crimsonTeam.map(slot => slot.player.id));
    const allMatchIds = new Set([...azureIds, ...crimsonIds]);

    const updatedPlayers = players.map(p => {
      let isLastMatchMvp = mvpId === p.id;
      if (!allMatchIds.has(p.id)) return { ...p, isLastMatchMvp: false };
      const isAzure = azureIds.has(p.id);
      const isWinner = winner && ((isAzure && winner === 'azure') || (!isAzure && winner === 'crimson'));
      const newStats = { ...p.stats, matchesPlayed: p.stats.matchesPlayed + 1 };
      if (winner) {
        if (isWinner) {
           newStats.wins += 1; newStats.currentStreak += 1;
           if (newStats.currentStreak > newStats.maxStreak) newStats.maxStreak = newStats.currentStreak;
        } else { newStats.currentStreak = 0; }
      }
      return { ...p, stats: newStats, isLastMatchMvp, lastMatchRating: ratings?.[p.id] || 0 };
    });
    
    setPlayers(updatedPlayers); 
    setCurrentMatch(null); 
    eraseCookie(STORAGE_KEY_ACTIVE_MATCH);
    navigate('lobby', updatedPlayers);
    setRoomId('');
  };

  const handleClearHistory = () => {
    setConfirmState({
      isOpen: true,
      title: "ERASE HISTORY",
      message: "This will permanently delete all recorded battle logs.",
      isDestructive: true,
      onConfirm: () => setMatchHistory([]),
    });
  };

  const isRoomReady = roomId.length === 4;

  const renderSetupWizard = () => {
    return (
        <div className="flex flex-col min-h-0 overflow-hidden h-full">
             <div className="shrink-0 mb-6">
                 <div className="flex items-center justify-between px-8 mb-2">
                     <button onClick={() => setSetupStep(1)} className={`text-[10px] font-orbitron font-bold tracking-[0.2em] transition-colors hover:text-white cursor-pointer ${setupStep >= 1 ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>01 CONFIG</button>
                     <button onClick={() => setSetupStep(2)} className={`text-[10px] font-orbitron font-bold tracking-[0.2em] transition-colors hover:text-white cursor-pointer ${setupStep >= 2 ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>02 ROSTER</button>
                     <button onClick={() => setSetupStep(3)} className={`text-[10px] font-orbitron font-bold tracking-[0.2em] transition-colors hover:text-white cursor-pointer ${setupStep >= 3 ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>03 LAUNCH</button>
                 </div>
                 <div className="h-1 w-full bg-[#0a1a2f] flex">
                     <div className={`flex-1 transition-all duration-500 ${setupStep >= 1 ? 'bg-[#dcb06b] shadow-[0_0_10px_#dcb06b]' : 'bg-[#1e3a5f]'}`}></div>
                     <div className={`flex-1 transition-all duration-500 border-l border-[#0a1a2f] ${setupStep >= 2 ? 'bg-[#dcb06b] shadow-[0_0_10px_#dcb06b]' : 'bg-[#1e3a5f]'}`}></div>
                     <div className={`flex-1 transition-all duration-500 border-l border-[#0a1a2f] ${setupStep >= 3 ? 'bg-[#dcb06b] shadow-[0_0_10px_#dcb06b]' : 'bg-[#1e3a5f]'}`}></div>
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-1 px-4 md:px-8">
                {setupStep === 1 && (
                    <div className="animate-slide-in space-y-6 md:space-y-8">
                         {isBracketMode ? (
                          <div className="relative group opacity-80">
                            <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent clip-corner-sm opacity-20"></div>
                            <div className="bg-[#0a1a2f]/60 backdrop-blur-sm p-4 clip-corner-sm border border-[#1e3a5f] relative">
                              <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                    <h3 className="text-xs text-[#8a9db8] font-cinzel font-bold tracking-[0.2em] uppercase">Battle Room</h3>
                                  </div>
                                  <span className="text-[9px] px-2 py-0.5 border border-white/10 rounded text-white/40 font-bold">AUTO-ASSIGN</span>
                              </div>
                              <div className="mt-2 text-[10px] text-[#4a5f78] font-orbitron tracking-wide leading-tight">Room IDs will be assigned individually per match.</div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group">
                            <div className="absolute -inset-[1px] bg-gradient-to-b from-[#dcb06b]/50 to-transparent clip-corner-md opacity-30"></div>
                            <div className="bg-[#0a1a2f]/90 backdrop-blur-md p-6 clip-corner-md relative overflow-hidden">
                              <div className="flex items-center justify-between mb-4 border-b border-[#dcb06b]/20 pb-2">
                                <h3 className="text-sm text-[#dcb06b] font-cinzel font-bold tracking-[0.2em] uppercase">Battle Room</h3>
                                <span className={`text-[10px] font-orbitron font-bold transition-colors duration-300 ${isRoomReady ? 'text-green-500' : 'text-red-500'}`}>LOBBY STATUS: {isRoomReady ? 'READY' : 'NOT READY'}</span>
                              </div>
                              <div className="relative"><input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="0000" className={`relative z-10 bg-black/40 border border-[#1e3a5f] p-4 text-3xl md:text-5xl font-orbitron font-black w-full text-center focus:outline-none tracking-[0.4em] transition-all duration-300 clip-corner-sm ${roomId ? 'text-white border-[#dcb06b] shadow-[0_0_15px_rgba(220,176,107,0.2)] animate-[chromatic_0.2s_infinite]' : 'text-[#4a5f78] opacity-60'} placeholder-[#1e3a5f]`} /></div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {!isBracketMode && (
                            <button onClick={() => setIsCoachMode(!isCoachMode)} className="relative w-full group overflow-hidden p-[3px] clip-corner-sm transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.98]">
                              {isCoachMode && <div className="absolute inset-[-100%] transition-opacity duration-700"><div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#dcb06b_60deg,#f3dcb1_120deg,transparent_180deg,#dcb06b_240deg,#f3dcb1_300deg,transparent_360deg)] animate-[spin_3s_linear_infinite]"></div></div>}
                              <div className={`relative z-10 py-4 px-6 flex items-center justify-center transition-all duration-300 clip-corner-sm border h-full ${isCoachMode ? 'bg-black text-[#dcb06b] border-transparent shadow-[inset_0_0_20px_rgba(220,176,107,0.5)]' : 'bg-[#0a1a2f]/80 border-[#1e3a5f] text-[#4a5f78]'}`}><span className={`font-cinzel font-black text-xs tracking-[0.3em] uppercase transition-all duration-500 ${isCoachMode ? 'text-white drop-shadow-[0_0_10px_#dcb06b]' : ''}`}>COACH MODE {isCoachMode ? 'ON' : 'OFF'}</span></div>
                            </button>
                          )}
                          <button onClick={() => { setIsBracketMode(!isBracketMode); if(!isBracketMode) setIsCoachMode(false); }} className="relative w-full group overflow-hidden p-[3px] clip-corner-sm transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.98]">
                            {isBracketMode && <div className="absolute inset-[-100%] transition-opacity duration-700"><div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#ffffff_60deg,#e2e8f0_120deg,transparent_180deg,#ffffff_240deg,#e2e8f0_300deg,transparent_360deg)] animate-[spin_3s_linear_infinite]"></div></div>}
                            <div className={`relative z-10 py-4 px-6 flex items-center justify-center transition-all duration-300 clip-corner-sm border h-full ${isBracketMode ? 'bg-black text-white border-transparent shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]' : 'bg-[#0a1a2f]/80 border-[#1e3a5f] text-[#4a5f78]'}`}><span className={`font-cinzel font-black text-xs tracking-[0.3em] uppercase transition-all duration-500 ${isBracketMode ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`}>BRACKET MODE {isBracketMode ? 'ON' : 'OFF'}</span></div>
                          </button>
                        </div>

                        {isBracketMode && (
                          <div className="relative animate-slide-in">
                            <div className="bg-[#0a1a2f]/80 border border-[#dcb06b]/30 p-4 clip-corner-sm">
                                <div className="text-[10px] text-[#8a9db8] font-black uppercase tracking-widest mb-3 flex justify-between"><span>Number of Teams</span><span className="text-white font-orbitron">{numBracketTeams} TEAMS</span></div>
                                <div className="flex gap-1">{[3, 4, 5, 6, 8, 12, 14, 16].map(n => (<button key={n} onClick={() => setNumBracketTeams(n)} className={`flex-1 py-2 font-orbitron font-bold text-xs clip-corner-sm border transition-all ${numBracketTeams === n ? 'bg-[#dcb06b] text-black border-[#dcb06b] shadow-[0_0_10px_#dcb06b]' : 'bg-black/40 text-[#4a5f78] border-[#1e3a5f]'}`}>{n}</button>))}</div>
                                <div className="mt-2 text-[8px] text-[#4a5f78] uppercase text-center font-bold tracking-widest">Requires {numBracketTeams * 5} active players</div>
                            </div>
                          </div>
                        )}
                    </div>
                )}

                {setupStep === 2 && (
                    <div className="animate-slide-in">
                        <PlayerForm onBatchProcess={handleBatchProcess} isCoachMode={isCoachMode} />
                    </div>
                )}

                {setupStep === 3 && (
                    <div className="animate-slide-in space-y-6">
                        <div className="relative group">
                          <div className="absolute -inset-[1px] bg-gradient-to-b from-[#dcb06b]/50 to-transparent clip-corner-md opacity-30"></div>
                          <div className="bg-[#0a1a2f]/90 backdrop-blur-md p-6 clip-corner-md relative">
                            <div className="flex justify-between items-end mb-6">
                                <div><div className="text-[#8a9db8] text-[10px] uppercase font-bold mb-1">Active Players</div><div className="flex items-baseline gap-2"><div className="text-5xl font-orbitron font-bold text-white">{activePlayers.length}</div><div className="text-xl font-orbitron font-bold text-[#4a5f78]">/ {players.length}</div></div></div>
                            </div>
                            
                            <div className="mb-6 p-4 bg-black/40 border border-[#1e3a5f] clip-corner-sm">
                                <h4 className="text-[#dcb06b] font-cinzel text-xs font-bold mb-2 tracking-widest">REQUIREMENTS</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase">
                                        <span className="text-[#8a9db8]">Minimum Players</span>
                                        <span className={activePlayers.length >= (isBracketMode ? numBracketTeams * 5 : (isCoachMode ? 12 : 10)) ? "text-green-500" : "text-red-500"}>
                                            {isBracketMode ? numBracketTeams * 5 : (isCoachMode ? 12 : 10)} REQ
                                        </span>
                                    </div>
                                    {!isBracketMode && (
                                        <div className="flex justify-between text-[10px] uppercase">
                                            <span className="text-[#8a9db8]">Room ID</span>
                                            <span className={isRoomReady ? "text-green-500" : "text-red-500"}>{isRoomReady ? "VALID" : "INVALID"}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {errorMsg && <div className="mb-4 p-3 border-l-2 border-red-500 bg-red-900/20 text-red-200 text-xs animate-pulse">{errorMsg}</div>}
                          </div>
                        </div>
                    </div>
                )}
             </div>

             <div className="shrink-0 p-4 md:p-8 pt-4 border-t border-[#1e3a5f] bg-[#05090f]/50 flex justify-between gap-4">
                 {setupStep > 1 ? (
                     <Button variant="secondary" onClick={() => setSetupStep(prev => (prev - 1) as 1|2|3)} className="w-32 border-[#1e3a5f] text-[#4a5f78] hover:text-white">BACK</Button>
                 ) : (
                     <div className="w-32"></div>
                 )}

                 {setupStep < 3 ? (
                     <Button onClick={() => setSetupStep(prev => (prev + 1) as 1|2|3)} className="flex-1 max-w-xs">NEXT STEP</Button>
                 ) : (
                     <Button onClick={handleGenerate} disabled={activePlayers.length < (isBracketMode ? numBracketTeams * 5 : (isCoachMode ? 12 : 10)) || (!isBracketMode && !isRoomReady)} className="flex-1 max-w-xs shadow-[0_0_20px_rgba(220,176,107,0.3)] animate-pulse">START MATCHMAKING</Button>
                 )}
             </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-200 font-inter overflow-x-hidden relative flex flex-col">
      <BackgroundParticles />
      <LocalClock />
      
      <div className="fixed top-24 right-4 z-[3000] flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
              <div 
                key={toast.id} 
                className={`bg-[#0a1a2f]/95 border border-[#dcb06b] p-4 clip-corner-sm shadow-[0_0_20px_rgba(220,176,107,0.3)] pointer-events-auto flex items-center gap-3 min-w-[300px] transition-opacity duration-1000 ease-in-out ${toast.isExiting ? 'opacity-0' : 'opacity-100 animate-slide-in'}`}
              >
                  <div className="w-2 h-2 bg-[#dcb06b] rounded-full animate-pulse"></div>
                  <span className="text-[#dcb06b] font-orbitron text-xs font-bold tracking-wide uppercase flex-1">{toast.message}</span>
                  <button onClick={() => dismissToast(toast.id)} className="text-[#4a5f78] hover:text-white transition-colors ml-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              </div>
          ))}
      </div>

      <PreparingModal isOpen={isPreparing} message={prepMessage} error={prepError} onClose={() => setIsPreparing(false)} />
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmState.isDestructive}
      />
      {showCookieConsent && <CookieConsent onAccept={handleAcceptCookies} />}

      <div className="fixed inset-0 bg-black -z-10">
         <img src="https://www.levelinfinite.com/wp-content/uploads/2024/03/honor-of-kings-global-launch-pc.jpg" alt="HoK" className="absolute inset-0 w-full h-full object-cover opacity-50" />
         <div className="absolute inset-0 bg-gradient-to-b from-[#05090f]/90 via-[#05090f]/60 to-[#05090f] mix-blend-multiply"></div>
      </div>
      
      {editingPlayer && <EditPlayerModal player={editingPlayer} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleUpdatePlayer} />}

      {viewMode === 'lobby' && (
        <>
          <main className="relative z-10 pt-16 px-4 flex-grow max-w-7xl mx-auto w-full">
            {hasActiveSession && (
                <div className="mb-6 animate-slide-in">
                    <button 
                        onClick={handleResumeSession}
                        className="w-full bg-[#0a1a2f]/90 border border-[#dcb06b] clip-corner-md p-6 flex items-center justify-between group hover:bg-[#dcb06b]/10 transition-colors shadow-[0_0_20px_rgba(220,176,107,0.2)]"
                    >
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 flex items-center justify-center bg-[#dcb06b]/20 rounded-full border border-[#dcb06b] animate-pulse">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#dcb06b]" viewBox="0 0 20 20" fill="currentColor">
                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                 </svg>
                             </div>
                             <div className="text-left">
                                 <h3 className="text-[#dcb06b] font-cinzel font-bold text-xl tracking-widest">SESSION IN PROGRESS</h3>
                                 <p className="text-[#8a9db8] font-orbitron text-xs tracking-wide">
                                     {currentMatch ? 'RANKED DRAFT • BATTLEFIELD' : 'TOURNAMENT BRACKET • MANAGEMENT'}
                                 </p>
                             </div>
                         </div>
                         <div className="text-[#dcb06b] font-bold font-orbitron tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                             RESUME &gt;&gt;
                         </div>
                    </button>
                </div>
            )}

            {isSetupOpen && (
              <div className="fixed inset-0 z-[100] bg-[#05090f]/95 backdrop-blur-xl flex items-center justify-center p-2 md:p-4 animate-slide-in">
                 <div className="w-full max-w-2xl bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md relative shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-[90vh] h-auto flex flex-col">
                    <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#1e3a5f] bg-[#05090f]/50 shrink-0">
                       <h2 className="text-[#dcb06b] font-cinzel font-black text-lg md:text-xl tracking-[0.2em] flex items-center gap-3">
                          <div className="w-2 h-6 md:h-8 bg-[#dcb06b]"></div>
                          BATTLE CONFIGURATION
                       </h2>
                       <button onClick={() => setIsSetupOpen(false)} className="text-[#4a5f78] hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                       </button>
                    </div>
                    {renderSetupWizard()}
                 </div>
              </div>
            )}
            <div className="w-full">
                 <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <button onClick={() => setIsSetupOpen(true)} className="group relative px-8 py-3 bg-[#0a1a2f] border border-[#dcb06b] clip-corner-sm text-[#dcb06b] font-cinzel font-bold tracking-[0.2em] hover:bg-[#dcb06b] hover:text-[#05090f] transition-all shadow-[0_0_15px_rgba(220,176,107,0.2)]">
                       <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>OPEN COMMAND CENTER</span>
                    </button>
                    <h2 className="text-3xl font-cinzel font-black text-[#dcb06b] tracking-widest hidden md:block">SQUAD ROSTER</h2>
                    <div className="flex gap-3">
                      <button onClick={toggleFullscreen} className="px-6 py-3 border border-[#dcb06b]/30 text-[#dcb06b]/80 hover:text-[#dcb06b] hover:border-[#dcb06b] hover:bg-[#dcb06b]/5 transition-all text-[10px] uppercase font-bold tracking-[0.2em] clip-corner-sm flex items-center justify-center gap-2 group"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>Screen</button>
                      <button onClick={handleExportRoster} className="px-6 py-3 border border-[#dcb06b]/30 text-[#dcb06b]/80 hover:text-[#dcb06b] hover:border-[#dcb06b] hover:bg-[#dcb06b]/5 transition-all text-[10px] uppercase font-bold tracking-[0.2em] clip-corner-sm flex items-center justify-center gap-2 group"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>Save</button>
                      <button onClick={handleClearAll} className="px-6 py-3 border border-red-500/30 text-red-500/80 hover:text-red-500 hover:border-red-500 hover:bg-red-500/5 transition-all text-[10px] uppercase font-bold tracking-[0.2em] clip-corner-sm flex items-center justify-center gap-2 group"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Clear</button>
                    </div>
                 </div>
                 <div className="tech-border p-6 bg-[#0a1a2f]/40 min-h-[400px]">
                    <PlayerList players={players} onRemove={removePlayer} onToggleActive={togglePlayerActive} onEdit={handleEditPlayer} isSidebarOpen={false} />
                 </div>
                 <div className="mt-12 tech-border p-6 bg-[#0a1a2f]/40">
                    <h2 className="text-2xl font-cinzel font-black text-[#dcb06b] mb-6">BATTLE HISTORY</h2>
                    <HistoryList history={matchHistory} onClear={handleClearHistory} />
                 </div>
            </div>
          </main>
          <footer className="py-12 px-6 text-center border-t border-[#dcb06b]/10 bg-[#05090f] mt-auto">
              <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#dcb06b] to-transparent mb-2"></div>
                  <div className="text-[#dcb06b] font-cinzel font-black text-sm tracking-[0.2em] mb-1">APPLICATION DEVELOPED BY KAZEHUNT</div>
                  <div className="text-[#4a5f78] font-orbitron text-[9px] leading-relaxed tracking-[0.1em] uppercase max-w-2xl flex flex-col gap-2"><p>DESIGNED EXCLUSIVELY FOR HONOR OF KINGS CUSTOM FUN MATCHES ON THE OFFICIAL DISCORD. THE DEVELOPER ASSUMES NO RESPONSIBILITY FOR USAGE OUTSIDE THIS INTENDED SCOPE.</p></div>
              </div>
          </footer>
        </>
      )}

      {currentMatch && viewMode !== 'lobby' && viewMode !== 'bracket' && (
        <MatchDisplay 
          match={currentMatch} 
          activePlayers={activePlayers} 
          initialMode={viewMode === 'battle' ? 'battle' : 'draft'}
          onReset={() => { 
              setCurrentMatch(null); 
              eraseCookie(STORAGE_KEY_ACTIVE_MATCH);
              setViewMode('lobby'); 
          }}
          onMinimize={handleBackToLobby}
          onCompleteMatch={handleMatchFinish}
          onReroll={handleRerollSlot}
          onStartBattle={() => setViewMode('battle')}
          onUpdatePlayer={handleUpdatePlayer}
        />
      )}

      {bracketMatch && viewMode === 'bracket' && (
        <BracketDisplay 
          match={bracketMatch} 
          onReset={() => { 
              setBracketMatch(null); 
              eraseCookie(STORAGE_KEY_ACTIVE_BRACKET);
              setViewMode('lobby'); 
          }} 
          onMinimize={handleBackToLobby}
          activePlayers={activePlayers}
          onReroll={handleBracketReroll}
          onUpdatePlayer={handleUpdatePlayer}
        />
      )}

      <style>{`@keyframes chromatic { 0% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; } 25% { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #0000ff; } 50% { text-shadow: 2px -1px 0 #ff0000, -2px 1px 0 #0000ff; } 75% { text-shadow: -2px 1px 0 #ff0000, 2px -1px 0 #0000ff; } 100% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #0000ff; } }`}</style>
    </div>
  );
}
