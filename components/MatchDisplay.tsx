
import React, { useState, useEffect } from 'react';
import { MatchResult, TeamSlot, Role, Player } from '../types';
import { RoleIcons, ROLES_ORDER } from '../constants';
import { Button } from './Button';
import { SpinWheel } from './SpinWheel';
import { PortalTransition } from './PortalTransition';
import { MatchSummary } from './MatchSummary';
import { VictoryCelebration } from './VictoryCelebration';
import { EvaluationScreen } from './EvaluationScreen';
import { ConfirmModal } from './ConfirmModal';

interface MatchDisplayProps {
  match: MatchResult;
  activePlayers: Player[]; 
  initialMode: 'draft' | 'battle';
  onReset: () => void; 
  onMinimize: () => void; // New Prop
  onCompleteMatch: (winner: 'azure' | 'crimson' | null, mvpId?: string, ratings?: Record<string, number>) => void; 
  onReroll: (team: 'azure' | 'crimson', role: Role, newPlayer: Player) => void;
  onStartBattle: () => void;
  onUpdatePlayer: (updatedPlayer: Player) => void;
}

type ViewState = 'drafting' | 'transition' | 'final' | 'celebration' | 'evaluation';

export const MatchDisplay: React.FC<MatchDisplayProps> = ({ 
  match, activePlayers, initialMode, 
  onReset, onMinimize, onCompleteMatch, onReroll, onStartBattle, onUpdatePlayer
}) => {
  const [viewState, setViewState] = useState<ViewState>('drafting');
  const [winningTeam, setWinningTeam] = useState<'azure' | 'crimson' | null>(null);
  const [autoFillFlash, setAutoFillFlash] = useState<string | null>(null);

  const [renameState, setRenameState] = useState<{ isOpen: boolean; player: Player | null; newName: string }>({
    isOpen: false,
    player: null,
    newName: ''
  });

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
  
  useEffect(() => {
     if (initialMode === 'battle') {
        setViewState('final');
     } else {
        setViewState('drafting');
     }
  }, [initialMode]);

  const displayRoles = match.isCoachMode ? [...ROLES_ORDER, Role.COACH] : ROLES_ORDER;
  const [currentRoleIndex, setCurrentRoleIndex] = useState(-1);
  const [wheelState, setWheelState] = useState<{
    isOpen: boolean;
    type: 'draft' | 'reroll';
    team: 'azure' | 'crimson';
    role: Role;
    winnerName: string;
    winnerPlayer?: Player;
    candidates: string[];
    duration: number;
  } | null>(null);

  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  const getPlayerForRole = (team: TeamSlot[], role: Role) => {
    return team.find(slot => slot.role === role);
  };

  const getCardId = (team: 'azure' | 'crimson', role: Role) => `${team}-${role}`;

  const formatRoleLabelShort = (role: Role) => {
    switch(role) {
        case Role.CLASH: return "CLASH";
        case Role.JUNGLE: return "JUNGLE";
        case Role.MID: return "MID";
        case Role.FARM: return "FARM";
        case Role.ROAM: return "ROAM";
        case Role.COACH: return "COACH";
        default: return (role as string).toUpperCase();
    }
  };

  const handleNext = () => {
    const nextIndex = currentRoleIndex + 1;
    if (nextIndex >= displayRoles.length) return;
    const roleToReveal = displayRoles[nextIndex];
    const azureId = getCardId('azure', roleToReveal);
    if (!revealedCards.has(azureId)) { startWheel('azure', roleToReveal); return; }
    const crimsonId = getCardId('crimson', roleToReveal);
    if (!revealedCards.has(crimsonId)) { startWheel('crimson', roleToReveal); return; }
  };

  const handleSkipAll = () => {
    setConfirmState({
      isOpen: true,
      title: "SKIP DRAFT",
      message: "Are you sure you want to skip the remaining draft reveals? This will reveal all players instantly.",
      onConfirm: () => {
        const allCards = new Set<string>();
        displayRoles.forEach(r => { 
          allCards.add(getCardId('azure', r)); 
          allCards.add(getCardId('crimson', r)); 
        });
        setRevealedCards(allCards);
        setCurrentRoleIndex(displayRoles.length - 1);
      }
    });
  };

  const handleAbort = () => {
    setConfirmState({
      isOpen: true,
      title: "ABORT BATTLE",
      message: "Are you sure you want to abort the current draft? All progress will be lost and you will return to the lobby.",
      isDestructive: true,
      onConfirm: () => onReset()
    });
  };

  const startWheel = (team: 'azure' | 'crimson', role: Role) => {
    const teamSlots = team === 'azure' ? match.azureTeam : match.crimsonTeam;
    const winner = getPlayerForRole(teamSlots, role)?.player;
    if (!winner) return;

    const revealedPlayerIds = new Set<string>();
    match.azureTeam.forEach(slot => { if (revealedCards.has(getCardId('azure', slot.role))) revealedPlayerIds.add(slot.player.id); });
    match.crimsonTeam.forEach(slot => { if (revealedCards.has(getCardId('crimson', slot.role))) revealedPlayerIds.add(slot.player.id); });

    const candidates = activePlayers.filter(p => {
          if (revealedPlayerIds.has(p.id)) return false;
          if (role === Role.COACH) return p.roles.includes(Role.COACH);
          return p.isAllRoles || p.roles.includes(role);
      });

    const candidateNames = candidates.map(p => p.name);
    if (candidates.length === 1) {
        const cardId = getCardId(team, role);
        setAutoFillFlash(cardId);
        setRevealedCards(prev => new Set(prev).add(cardId));
        if (team === 'crimson') setCurrentRoleIndex(prev => prev + 1);
        setTimeout(() => setAutoFillFlash(null), 1000);
        return;
    }
    if (!candidateNames.includes(winner.name)) candidateNames.push(winner.name);
    const randomDuration = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    setWheelState({ isOpen: true, type: 'draft', team, role, winnerName: winner.name, candidates: candidateNames, duration: randomDuration });
  };

  const handleRerollClick = (team: 'azure' | 'crimson', role: Role) => {
    const azureIds = new Set(match.azureTeam.map(s => s.player.id));
    const crimsonIds = new Set(match.crimsonTeam.map(s => s.player.id));
    const benchPlayers = activePlayers.filter(p => !azureIds.has(p.id) && !crimsonIds.has(p.id));
    if (benchPlayers.length === 0) return;
    const candidates = benchPlayers.filter(p => {
       if (role === Role.COACH) return p.roles.includes(Role.COACH);
       return p.isAllRoles || p.roles.includes(role);
    });
    if (candidates.length === 0) return;
    const newPlayer = candidates[Math.floor(Math.random() * candidates.length)];
    const candidateNames = candidates.map(p => p.name);
    if (candidates.length === 1) { onReroll(team, role, candidates[0]); return; }
    const randomDuration = Math.floor(Math.random() * (9000 - 4000 + 1)) + 4000; 
    setWheelState({ isOpen: true, type: 'reroll', team, role, winnerName: newPlayer.name, winnerPlayer: newPlayer, candidates: candidateNames, duration: randomDuration });
  };

  const handleWheelComplete = () => {
    if (!wheelState) return;
    if (wheelState.type === 'draft') {
        const { team, role } = wheelState;
        setRevealedCards(prev => new Set(prev).add(getCardId(team, role)));
        if (team === 'crimson') setCurrentRoleIndex(prev => prev + 1);
    } else if (wheelState.type === 'reroll' && wheelState.winnerPlayer) {
        onReroll(wheelState.team, wheelState.role, wheelState.winnerPlayer);
    }
    setWheelState(null);
  };

  const handleWheelCancel = () => setWheelState(null);
  const handleInitializeBattle = () => setViewState('transition');
  const handleTransitionComplete = () => { onStartBattle(); setViewState('final'); };
  const handleMatchDecided = (winner: 'azure' | 'crimson' | null) => {
    if (winner) { setWinningTeam(winner); setViewState('celebration'); } 
    else { onCompleteMatch(null); }
  };
  const handleCelebrationDismiss = () => setViewState('evaluation');
  const handleEvaluationComplete = (mvpId?: string, ratings?: Record<string, number>) => { onCompleteMatch(winningTeam, mvpId, ratings); }

  const openRenameModal = (player: Player) => {
    setRenameState({ isOpen: true, player, newName: player.name });
  };
  
  const submitRename = () => {
    if (renameState.player && renameState.newName.trim()) {
        onUpdatePlayer({ ...renameState.player, name: renameState.newName.trim() });
        setRenameState({ isOpen: false, player: null, newName: '' });
    }
  };

  // Pass minimize to sub-components where needed or render generic back button overlay
  if (viewState === 'evaluation' && winningTeam) return (
     <>
        <div className="fixed top-6 left-6 z-[300]">
            <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                LOBBY
            </Button>
        </div>
        <EvaluationScreen match={match} winner={winningTeam} onComplete={handleEvaluationComplete} />
     </>
  );

  if (viewState === 'celebration' && winningTeam) return (
      <VictoryCelebration winner={winningTeam} teamSlots={winningTeam === 'azure' ? match.azureTeam : match.crimsonTeam} onDismiss={handleCelebrationDismiss} />
  );

  if (viewState === 'transition') return (
    <>
       <div className="fixed top-6 left-6 z-[300]">
            <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                LOBBY
            </Button>
       </div>
       <PortalTransition azureTeam={match.azureTeam} crimsonTeam={match.crimsonTeam} onComplete={handleTransitionComplete} />
    </>
  );

  if (viewState === 'final') return (
     <>
        <div className="fixed top-6 left-6 z-[300]">
            <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                LOBBY
            </Button>
        </div>
        <MatchSummary match={match} onReset={handleMatchDecided} />
     </>
  );

  const renderPlayerCard = (role: Role, team: 'azure' | 'crimson') => {
    const teamSlots = team === 'azure' ? match.azureTeam : match.crimsonTeam;
    const player = getPlayerForRole(teamSlots, role)?.player;
    const cardId = getCardId(team, role);
    const isRevealed = revealedCards.has(cardId);
    const isAutoFilled = autoFillFlash === cardId;
    const isCoach = role === Role.COACH;

    let theme = isCoach ? { bg: 'bg-[#1a1a1a]', border: 'border-white', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.6)]', text: 'text-white', gradient: 'from-white/20 to-transparent' }
      : team === 'azure' ? { bg: 'bg-[#0a1a2f]', border: 'border-hok-cyan', glow: 'shadow-[0_0_15px_#00d2ff]', text: 'text-hok-cyan', gradient: 'from-[#00d2ff]/20 to-transparent' }
      : { bg: 'bg-[#1a0505]', border: 'border-hok-red', glow: 'shadow-[0_0_15px_#ef4444]', text: 'text-hok-red', gradient: 'from-[#c02d2d]/20 to-transparent' };

    if (!isRevealed) {
       return (
         <div className="h-16 w-full relative overflow-hidden clip-corner-md border border-[#1e3a5f] bg-[#05090f]/80 flex flex-col items-center justify-center opacity-40 group">
            <div className="text-[#1e3a5f] group-hover:text-[#dcb06b]/50 transition-colors duration-500 transform scale-100 opacity-50">
               {RoleIcons[role]}
            </div>
         </div>
       );
    }

    return (
      <div className={`relative h-16 w-full animate-slide-in perspective-container group ${isAutoFilled ? 'scale-105 z-20' : ''}`}>
        <div className={`absolute inset-0 clip-corner-md border-l-4 tilt-card ${theme.bg} ${theme.border} ${isAutoFilled ? 'shadow-[0_0_30px_#dcb06b] border-[#dcb06b]' : theme.glow} shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300`}>
           <div className={`flex flex-col h-full relative z-10 px-6 py-0 justify-center ${team === 'crimson' ? 'items-end text-right' : 'items-start text-left'}`}>
             <div className={`mb-1 px-2 py-0.5 rounded-sm bg-black/50 border border-white/10 ${theme.text} scale-[0.8] origin-${team === 'crimson' ? 'right' : 'left'} opacity-90`}>
                {RoleIcons[role]}
             </div>
             <span className="block text-xl md:text-3xl font-bold text-white truncate font-orbitron drop-shadow-md w-full">
                {player?.name}
             </span>
             <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-50 pointer-events-none`}></div>
           </div>
           
           <div className={`absolute top-2 z-50 flex gap-2 transition-all opacity-0 group-hover:opacity-100 ${team === 'azure' ? 'right-4' : 'left-4'}`}>
              <button onClick={(e) => { e.stopPropagation(); handleRerollClick(team, role); }} className="p-2.5 bg-black/60 hover:bg-[#dcb06b] rounded-full text-white hover:text-black transition-all" title="Reroll Player"><svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
              <button onClick={(e) => { e.stopPropagation(); if(player) openRenameModal(player); }} className="p-2.5 bg-black/60 hover:bg-[#00d2ff] rounded-full text-white hover:text-black transition-all" title="Change Nickname"><svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
           </div>
        </div>
      </div>
    );
  };

  const nextRoleIndex = currentRoleIndex + 1;
  const nextRoleName = nextRoleIndex < displayRoles.length ? displayRoles[nextRoleIndex] : null;
  const isFinished = currentRoleIndex >= displayRoles.length - 1 && revealedCards.size === (match.isCoachMode ? 12 : 10);
  
  let buttonText = "START DRAFT";
  if (nextRoleName) {
     const nextTeam = !revealedCards.has(getCardId('azure', nextRoleName)) ? 'AZURE' : 'CRIMSON';
     buttonText = `SELECT ${nextTeam} ${formatRoleLabelShort(nextRoleName)}`;
  }

  return (
    <>
      <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isDestructive={confirmState.isDestructive} />
      {renameState.isOpen && (<div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })}></div><div className="relative w-full max-w-sm bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in p-6"><h3 className="text-[#dcb06b] font-cinzel font-bold text-lg mb-4 text-center tracking-widest">CHANGE NICKNAME</h3><input type="text" value={renameState.newName} onChange={e => setRenameState({ ...renameState, newName: e.target.value })} className="w-full bg-black/50 border border-[#1e3a5f] p-3 text-white font-orbitron focus:border-[#dcb06b] outline-none mb-6 text-center" autoFocus /><div className="flex gap-3"><Button variant="secondary" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })} className="flex-1">CANCEL</Button><Button onClick={submitRename} className="flex-1">CONFIRM</Button></div></div></div>)}

      {wheelState && wheelState.isOpen && <SpinWheel candidates={wheelState.candidates} winnerName={wheelState.winnerName} team={wheelState.team} roleName={wheelState.role} roomId={match.roomId} duration={wheelState.duration} onComplete={handleWheelComplete} onCancel={handleWheelCancel} />}
      <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28 relative h-screen flex flex-col justify-center overflow-hidden">
        
        {/* TOP CONTROLS */}
        <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-center">
           <div className="flex gap-3">
               <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  LOBBY
               </Button>
               <Button variant="outline" size="sm" onClick={handleAbort} className="border-red-900/60 text-red-500 hover:bg-red-900/20 text-xs px-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  END SESSION
               </Button>
           </div>

           {/* ROOM ID CENTERED */}
           <div className="flex flex-col items-center gap-0 scale-[0.85] origin-top">
              <span className="text-[#dcb06b] font-orbitron text-[10px] tracking-[0.5em] font-black uppercase mb-1 opacity-70">ROOM ID</span>
              <div className="relative">
                 <div className="absolute -inset-2 bg-[#dcb06b] blur-[15px] opacity-20 pointer-events-none"></div>
                 <div className="relative bg-black/90 border border-[#dcb06b]/50 px-8 py-2 clip-corner-sm flex flex-col items-center shadow-[0_0_20px_rgba(220,176,107,0.3)]">
                    <span className="text-2xl font-orbitron font-black text-white tracking-[0.4em] drop-shadow-[0_0_10px_#dcb06b]">{match.roomId}</span>
                 </div>
              </div>
           </div>

           {!isFinished && <Button variant="outline" size="sm" onClick={handleSkipAll} className="border-[#dcb06b]/60 text-[#dcb06b] hover:bg-[#dcb06b]/10 text-xs px-6">SKIP ALL</Button>}
        </div>
        
        <div className="relative max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center px-10">
          <div className="grid grid-cols-2 gap-12 md:gap-32 items-end mb-6">
              <div className="text-left"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-600 tracking-widest drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">AZURE <span className="hidden md:inline">GOLEM</span></h2><div className="mt-2 h-1 w-full bg-gradient-to-r from-cyan-500 to-transparent shadow-[0_0_10px_#00d2ff]"></div></div>
              <div className="text-right"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-red-100 to-red-600 tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]"><span className="hidden md:inline">CRIMSON</span> GOLEM</h2><div className="mt-2 h-1 w-full bg-gradient-to-l from-red-500 to-transparent shadow-[0_0_10px_#ef4444]"></div></div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20"><span className="text-[12rem] font-black italic text-[#dcb06b] font-orbitron select-none">VS</span></div>
          <div className="space-y-4 relative z-10">{displayRoles.map((role) => (<div key={role} className="grid grid-cols-2 gap-12 md:gap-32 items-center"><div>{renderPlayerCard(role, 'azure')}</div><div>{renderPlayerCard(role, 'crimson')}</div></div>))}</div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 z-50 flex justify-center items-end h-28 pointer-events-none">
           <div className="pointer-events-auto">
              {!isFinished ? (
                 <button onClick={handleNext} className="group relative px-16 h-16 bg-[#0a1a2f] border-2 border-[#dcb06b] clip-corner-md flex items-center justify-center text-[#dcb06b] font-cinzel font-bold text-base hover:bg-[#dcb06b] hover:text-[#05090f] transition-all duration-300 shadow-[0_0_30px_rgba(220,176,107,0.4)]">{buttonText}</button>
              ) : (
                 <Button onClick={handleInitializeBattle} size="lg" className="px-24 h-16 text-lg animate-pulse shadow-[0_0_40px_rgba(220,176,107,0.5)]">INITIALIZE BATTLE</Button>
              )}
           </div>
        </div>
      </div>
    </>
  );
};
