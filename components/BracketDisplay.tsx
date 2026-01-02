
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BracketMatchResult, Role, TeamSlot, Player, MatchResult, BracketTeam } from '../types';
import { RoleIcons, ROLES_ORDER } from '../constants';
import { Button } from './Button';
import { SpinWheel } from './SpinWheel';
import { EvaluationScreen } from './EvaluationScreen';
import { MatchSummary } from './MatchSummary';
import { PortalTransition } from './PortalTransition';
import { VictoryCelebration } from './VictoryCelebration';
import { ConfirmModal } from './ConfirmModal';
import { getFlexibleCandidate, canPlay, TBD_PLAYER } from '../utils/matchmaker';

interface BracketDisplayProps {
  match: BracketMatchResult;
  onReset: () => void;
  activePlayers: Player[];
  onReroll: (teamIndex: number, role: Role, newPlayer: Player) => void;
  onUpdatePlayer: (updatedPlayer: Player) => void;
}

interface InternalMatch {
    id: number;
    label: string;
    mode: string;
    teamA: any;
    teamB: any;
}

type BracketPhase = 'OVERVIEW' | 'REVEAL' | 'TRANSITION' | 'DECLARE_WIN' | 'CELEBRATION' | 'EVALUATION' | 'TOURNAMENT_END';

export const BracketDisplay: React.FC<BracketDisplayProps> = ({ match, onReset, activePlayers, onReroll, onUpdatePlayer }) => {
  const [phase, setPhase] = useState<BracketPhase>('OVERVIEW');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [matchRoomIds, setMatchRoomIds] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [matchEvaluations, setMatchEvaluations] = useState<Record<string, { mvpId?: string, ratings?: Record<string, number> }>>({});
  const [currentRoundWinner, setCurrentRoundWinner] = useState<'azure' | 'crimson' | null>(null);
  const [tournamentChampion, setTournamentChampion] = useState<any | null>(null);

  // GLOBAL ASSIGNMENT TRACKING - Initialize from pre-assigned match if available
  const [globalAssignments, setGlobalAssignments] = useState<Record<string, string>>(() => {
      const initial: Record<string, string> = {};
      match.teams.forEach((team, tIdx) => {
          team.slots.forEach(slot => {
              if (slot.player && slot.player.id !== 'tbd') {
                  initial[`${tIdx}-${slot.role}`] = slot.player.id;
              }
          });
      });
      return initial;
  });

  // Update assignments if match prop changes (e.g. from reroll in parent)
  useEffect(() => {
      setGlobalAssignments(prev => {
          const next = { ...prev };
          match.teams.forEach((team, tIdx) => {
              team.slots.forEach(slot => {
                  if (slot.player && slot.player.id !== 'tbd') {
                      next[`${tIdx}-${slot.role}`] = slot.player.id;
                  }
              });
          });
          return next;
      });
  }, [match]);

  // UI States
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  // Rename State
  const [renameState, setRenameState] = useState<{ isOpen: boolean; player: Player | null; newName: string }>({
    isOpen: false,
    player: null,
    newName: ''
  });

  const [completedReveals, setCompletedReveals] = useState<Set<number>>(new Set());
  const [revealedSlots, setRevealedSlots] = useState<Set<string>>(new Set());
  const [currentRoleIdx, setCurrentRoleIdx] = useState(-1);
  const [wheelState, setWheelState] = useState<{
    isOpen: boolean;
    type: 'reveal' | 'reroll';
    team: 'azure' | 'crimson';
    role: Role;
    winnerName: string;
    winnerPlayer?: Player;
    candidates: string[];
    duration: number;
  } | null>(null);

  // Helper to get the actual assigned player or TBD
  const getAssignedPlayer = useCallback((teamIdx: number, role: Role): Player => {
      const key = `${teamIdx}-${role}`;
      const pid = globalAssignments[key];
      if (pid) {
          return activePlayers.find(p => p.id === pid) || TBD_PLAYER;
      }
      return TBD_PLAYER;
  }, [globalAssignments, activePlayers]);

  // --- MEMOIZED BRACKET GENERATION ---
  const { quarterMatches, semiMatches, grandFinalMatch, allMatches, hasQuarterFinals } = useMemo(() => {
      const getTeamObj = (teamIndex: number) => {
          if (teamIndex < 0 || teamIndex >= match.teams.length) return null;
          const original = match.teams[teamIndex];
          const updatedSlots = original.slots.map(s => ({
              ...s,
              player: getAssignedPlayer(teamIndex, s.role)
          }));
          return { ...original, slots: updatedSlots };
      };

      const getWinnerTeam = (matchIdx: number, teamA: any, teamB: any | null) => {
        if (!teamA) return null;
        if (!teamB) return teamA;
        const scoreA = scores[`${matchIdx}-A`] || 0;
        const scoreB = scores[`${matchIdx}-B`] || 0;
        if (scoreA > scoreB) return teamA;
        if (scoreB > scoreA) return teamB;
        return null;
      };

      const getLoserTeam = (matchIdx: number, teamA: any, teamB: any | null) => {
        if (!teamA || !teamB) return null;
        const scoreA = scores[`${matchIdx}-A`] || 0;
        const scoreB = scores[`${matchIdx}-B`] || 0;
        if (scoreA > 0 || scoreB > 0) {
            if (scoreA < scoreB) return teamA;
            if (scoreB < scoreA) return teamB;
        }
        return null;
      };

      const numTeams = match.teams.length;

      // Case 1: 3 teams (Stepladder)
      if (numTeams === 3) {
        const m0: InternalMatch = { id: 0, label: 'ELIMINATION', mode: 'BO1', teamA: getTeamObj(0), teamB: getTeamObj(1) };
        const m1: InternalMatch = { id: 1, label: 'CHALLENGER', mode: 'BO1', teamA: getLoserTeam(0, m0.teamA, m0.teamB), teamB: getTeamObj(2) };
        const m2: InternalMatch = { id: 2, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(0, m0.teamA, m0.teamB), teamB: getWinnerTeam(1, m1.teamA, m1.teamB) };
        const matches: InternalMatch[] = [m0, m1, m2];
        return { quarterMatches: [], semiMatches: [m0, m1], grandFinalMatch: m2, allMatches: matches, hasQuarterFinals: false };
      }

      // Case 2: 5 or 6 teams
      if (numTeams === 5 || numTeams === 6) {
        const q0: InternalMatch = { id: 0, label: 'QUARTER 1', mode: 'BO1', teamA: getTeamObj(0), teamB: getTeamObj(1) };
        const q1: InternalMatch = { id: 1, label: 'QUARTER 2', mode: 'BO1', teamA: getTeamObj(2), teamB: getTeamObj(3) };
        const q2: InternalMatch = { id: 2, label: 'QUARTER 3', mode: 'BO1', teamA: getTeamObj(4), teamB: getTeamObj(5) || null };
        const s1: InternalMatch = { id: 3, label: 'SEMI FINAL 1', mode: 'BO1', teamA: getWinnerTeam(0, q0.teamA, q0.teamB), teamB: getWinnerTeam(1, q1.teamA, q1.teamB) };
        const s2: InternalMatch = { id: 4, label: 'SEMI FINAL 2', mode: 'BO1', teamA: getWinnerTeam(2, q2.teamA, q2.teamB), teamB: getLoserTeam(3, s1.teamA, s1.teamB) };
        const gf: InternalMatch = { id: 5, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(3, s1.teamA, s1.teamB), teamB: getWinnerTeam(4, s2.teamA, s2.teamB) };
        const matches: InternalMatch[] = [q0, q1, q2, s1, s2, gf];
        return { quarterMatches: [q0, q1, q2], semiMatches: [s1, s2], grandFinalMatch: gf, allMatches: matches, hasQuarterFinals: true };
      }

      // Case 3: 4, 8 teams
      const hasQuarterFinals = numTeams === 8;
      const qMatches: InternalMatch[] = [];
      if (numTeams === 8) {
          for (let i = 0; i < 4; i++) {
              qMatches.push({ id: i, label: `QUARTER ${i + 1}`, mode: 'BO1', teamA: getTeamObj(i * 2), teamB: getTeamObj(i * 2 + 1) });
          }
      }
      const sMatches: InternalMatch[] = [];
      if (numTeams === 8) {
          sMatches.push({ id: 4, label: 'SEMI FINAL 1', mode: 'BO1', teamA: getWinnerTeam(0, qMatches[0].teamA, qMatches[0].teamB), teamB: getWinnerTeam(1, qMatches[1].teamA, qMatches[1].teamB) });
          sMatches.push({ id: 5, label: 'SEMI FINAL 2', mode: 'BO1', teamA: getWinnerTeam(2, qMatches[2].teamA, qMatches[2].teamB), teamB: getWinnerTeam(3, qMatches[3].teamA, qMatches[3].teamB) });
      } else {
          for (let i = 0; i < 2; i++) {
              sMatches.push({ id: i, label: `SEMI FINAL ${i + 1}`, mode: 'BO1', teamA: getTeamObj(i * 2), teamB: getTeamObj(i * 2 + 1) });
          }
      }
      const gfIndex = numTeams === 8 ? 6 : 2;
      const gf: InternalMatch = { id: gfIndex, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(sMatches[0].id, sMatches[0].teamA, sMatches[0].teamB), teamB: getWinnerTeam(sMatches[1].id, sMatches[1].teamA, sMatches[1].teamB) };
      const all: InternalMatch[] = [...qMatches, ...sMatches, gf];
      return { quarterMatches: qMatches, semiMatches: sMatches, grandFinalMatch: gf, allMatches: all, hasQuarterFinals };
  }, [match, scores, globalAssignments, getAssignedPlayer]); 

  // --- START MATCH FLOW ---

  const startMatchFlow = (idx: number) => {
    setCurrentMatchIdx(idx);

    const m = allMatches.find(m => m.id === idx);
    const numTeams = match.teams.length;
    let shouldEnableRolling = false;

    if (numTeams === 3 || numTeams === 4) {
        if (idx === 0 || idx === 1) shouldEnableRolling = true;
    } else {
        shouldEnableRolling = quarterMatches.some(q => q.id === idx);
    }

    if (idx === grandFinalMatch.id) {
        setPhase('TRANSITION');
        return;
    }

    // Determine target phase
    if (!shouldEnableRolling || completedReveals.has(idx)) {
         // Immediate "Skip" logic simulation - Fast Forward
         handleSkipAll(idx, true); 
         setPhase('REVEAL');
    } else {
        // First time Reveal
        setRevealedSlots(new Set());
        setCurrentRoleIdx(-1);
        setPhase('REVEAL');
    }
  };

  const handleByeCompletion = () => {
     // Auto-win for Bye rounds after reveal
     setScores(prev => ({ ...prev, [`${currentMatchIdx}-A`]: 1, [`${currentMatchIdx}-B`]: 0 }));
     setPhase('OVERVIEW');
  };

  const handleEvaluationComplete = (mvpId?: string, ratings?: Record<string, number>) => {
     const scoreKeyA = `${currentMatchIdx}-A`;
     const scoreKeyB = `${currentMatchIdx}-B`;
     const currentScoreA = scores[scoreKeyA] || 0;
     const currentScoreB = scores[scoreKeyB] || 0;

     let isSwapped = false;
     if (currentMatchIdx === grandFinalMatch.id) {
         const gamesPlayed = currentScoreA + currentScoreB;
         if (gamesPlayed % 2 !== 0) isSwapped = true;
     }

     let incrementA = 0;
     let incrementB = 0;

     if (currentRoundWinner === 'azure') {
         if (isSwapped) incrementB = 1;
         else incrementA = 1;
     } else if (currentRoundWinner === 'crimson') {
         if (isSwapped) incrementA = 1;
         else incrementB = 1;
     }

     let newScoreA = currentScoreA + incrementA;
     let newScoreB = currentScoreB + incrementB;

     setScores(prev => ({ ...prev, [scoreKeyA]: newScoreA, [scoreKeyB]: newScoreB }));
     setMatchEvaluations(prev => ({ ...prev, [`${currentMatchIdx}-${newScoreA + newScoreB}`]: { mvpId, ratings } }));

     if (currentMatchIdx === grandFinalMatch.id) {
         if (newScoreA >= 2 || newScoreB >= 2) {
             setTournamentChampion(newScoreA >= 2 ? grandFinalMatch.teamA : grandFinalMatch.teamB);
             setPhase('TOURNAMENT_END');
         } else setPhase('TRANSITION');
     } else setPhase('OVERVIEW');
  };

  const EnergyConnector = ({ type, height, style }: { type: 'fork' | 'straight', height: number, style?: React.CSSProperties }) => (
    <div className="absolute top-1/2 -right-24 md:-right-40 w-24 md:w-40 pointer-events-none z-0 overflow-visible" style={{ height: `${height}px`, ...style }}>
       <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
             <linearGradient id="energyLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#dcb06b"><animate attributeName="stop-opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" /></stop>
                <stop offset="100%" stopColor="#dcb06b" stopOpacity="0.8" />
             </linearGradient>
             <filter id="energyGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
          </defs>
          {type === 'fork' ? (
             <path d={`M 0,0 L 50,0 L 50,${height} L 0,${height} M 50,${height/2} L 100,${height/2}`} stroke="url(#energyLine)" strokeWidth="2.5" fill="none" filter="url(#energyGlow)" strokeLinecap="round" />
          ) : (
             <path d={`M 0,${height/2} L 100,${height/2}`} stroke="url(#energyLine)" strokeWidth="2.5" fill="none" filter="url(#energyGlow)" strokeLinecap="round" />
          )}
          <circle r="3" fill="#fff" filter="url(#energyGlow)"><animateMotion path={type === 'fork' ? `M 0,0 L 50,0 L 50,${height/2} L 100,${height/2}` : `M 0,${height/2} L 100,${height/2}`} dur="2s" repeatCount="indefinite" /></circle>
          {type === 'fork' && (<circle r="3" fill="#fff" filter="url(#energyGlow)"><animateMotion path={`M 0,${height} L 50,${height} L 50,${height/2} L 100,${height/2}`} dur="2s" begin="1s" repeatCount="indefinite" /></circle>)}
       </svg>
    </div>
  );

  const renderBracketMatchCard = (m: InternalMatch) => {
      if (!m.teamA && !m.teamB) return <div className="w-80 h-[210px] bg-black/10 border border-white/5 clip-corner-sm flex items-center justify-center opacity-20"><span className="text-[10px] font-black font-orbitron text-white/40 tracking-widest">PENDING MATCH</span></div>;
      const sA = scores[`${m.id}-A`] || 0;
      const sB = scores[`${m.id}-B`] || 0;
      const isDone = sA > 0 || sB > 0;
      const isBye = !m.teamB;
      const isGrandFinal = m.label === 'GRAND FINAL';
      const numTeams = match.teams.length;
      
      return (
        <div className={`w-80 bg-[#0a1a2f]/95 ${isGrandFinal ? 'border-2 border-[#dcb06b] shadow-[0_0_40px_rgba(220,176,107,0.4)]' : 'border border-[#1e3a5f]'} clip-corner-md p-0 relative transition-all duration-300 group hover:bg-[#0f223d] hover:border-[#dcb06b]/50 z-10`}>
            <div className={`flex justify-between items-center p-3 ${isGrandFinal ? 'bg-[#dcb06b]/30' : 'bg-[#05090f]/90'} border-b border-[#1e3a5f]`}>
                <h3 className={`${isGrandFinal ? 'text-[#dcb06b]' : 'text-[#8a9db8]'} font-orbitron font-black text-[10px] uppercase tracking-[0.2em]`}>{m.label}</h3>
                <span className={`text-[9px] px-2 py-0.5 font-bold border rounded ${isGrandFinal ? 'border-[#dcb06b] text-[#dcb06b]' : 'border-[#4a5f78] text-[#4a5f78] bg-black/30'}`}>{m.mode}</span>
            </div>
            <div className="p-4 space-y-3 h-[110px] flex flex-col justify-center">
                <div className={`flex items-center gap-3 relative transition-all duration-300 ${sA > sB || (isBye && !isDone) ? 'opacity-100 scale-100' : (isDone ? 'opacity-40 grayscale scale-95' : 'opacity-100')}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.teamA?.color }}></div>
                    <div className={`flex-1 flex justify-between items-center ml-3 p-2 border-b ${sA > sB ? 'border-[#dcb06b]/50 bg-[#dcb06b]/5' : 'border-[#1e3a5f]/50'}`}>
                        <span className={`text-xs font-cinzel font-black tracking-widest truncate ${sA > sB ? 'text-[#dcb06b]' : 'text-white'}`}>{m.teamA?.name || 'TBD'}</span>
                        <span className={`font-orbitron font-bold text-lg ${sA > sB ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>{sA}</span>
                    </div>
                </div>
                {!isBye && (
                   <>
                    <div className="flex items-center gap-2 opacity-20 px-6 my-1"><div className="h-[1px] flex-1 bg-white"></div><span className="text-[8px] font-black italic text-[#8a9db8]">VS</span><div className="h-[1px] flex-1 bg-white"></div></div>
                    <div className={`flex items-center gap-3 relative transition-all duration-300 ${sB > sA ? 'opacity-100 scale-100' : (isDone ? 'opacity-40 grayscale scale-95' : 'opacity-100')}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.teamB?.color }}></div>
                        <div className={`flex-1 flex justify-between items-center ml-3 p-2 border-b ${sB > sA ? 'border-[#dcb06b]/50 bg-[#dcb06b]/5' : 'border-[#1e3a5f]/50'}`}>
                            <span className={`text-xs font-cinzel font-black tracking-widest truncate ${sB > sA ? 'text-[#dcb06b]' : 'text-white'}`}>{m.teamB?.name || 'TBD'}</span>
                            <span className={`font-orbitron font-bold text-lg ${sB > sA ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>{sB}</span>
                        </div>
                    </div>
                   </>
                )}
            </div>
            <div className="p-3 bg-black/40 border-t border-[#1e3a5f] flex items-center gap-3">
                {isBye ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-[8px] text-[#dcb06b]/50 font-black uppercase tracking-widest">AUTO ADVANCE</span>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-[#4a5f78] font-black">ID</span>
                            <input type="text" value={matchRoomIds[m.id] || ''} onChange={(e) => { const val = e.target.value.replace(/\D/g,'').slice(0,4); setMatchRoomIds(prev => ({ ...prev, [m.id]: val })); }} className="w-full bg-black/60 border border-[#1e3a5f] text-center text-xs font-orbitron font-black text-[#dcb06b] focus:outline-none focus:border-[#dcb06b] py-1 pl-6 tracking-[0.2em] rounded-sm" placeholder="----" />
                        </div>
                        {!isDone && m.teamA && m.teamB && <Button onClick={() => startMatchFlow(m.id)} disabled={!matchRoomIds[m.id] || matchRoomIds[m.id].length < 4} size="sm" className="h-[28px] text-[8px] px-3">START</Button>}
                    </>
                )}
            </div>
        </div>
      );
  };
  
// ... rest of the file ...
  const activeMatchData = useMemo(() => {
    const data = allMatches.find(m => m.id === currentMatchIdx);
    if (!data) return undefined;
    if (data.label === 'GRAND FINAL') {
        const sA = scores[`${currentMatchIdx}-A`] || 0;
        const sB = scores[`${currentMatchIdx}-B`] || 0;
        const gamesPlayed = sA + sB;
        if (gamesPlayed % 2 !== 0) {
            return {
                ...data,
                teamA: data.teamB, 
                teamB: data.teamA
            };
        }
    }
    return data;
  }, [allMatches, currentMatchIdx, scores]);

  const activeRoomId = matchRoomIds[currentMatchIdx] || 'AUTO';

  const handleNextReveal = () => {
    if (!activeMatchData) return;
    
    // Logic to find the next valid role/side combo
    let targetRoleIdx = currentRoleIdx;
    let targetSide: 'azure' | 'crimson' = 'azure'; // Default
    
    // If starting fresh
    if (targetRoleIdx === -1) {
        targetRoleIdx = 0;
        targetSide = 'azure';
    } else {
        const currentRole = ROLES_ORDER[targetRoleIdx];
        const azureId = `m${currentMatchIdx}-A-${currentRole}`;
        
        // If Azure for current role is NOT revealed, target it
        if (!revealedSlots.has(azureId)) {
            targetSide = 'azure';
        } else {
            // Azure is revealed. Check if we need to reveal Crimson
            const crimsonId = `m${currentMatchIdx}-B-${currentRole}`;
            if (!revealedSlots.has(crimsonId)) {
                targetSide = 'crimson';
            } else {
                 // Both revealed, move to next role Azure
                 targetRoleIdx++;
                 targetSide = 'azure';
            }
        }
    }

    if (targetRoleIdx >= ROLES_ORDER.length) return; // Done

    const role = ROLES_ORDER[targetRoleIdx];
    const side = targetSide;

    // --- Proceed to reveal this slot ---
    const teamData = side === 'azure' ? activeMatchData.teamA : activeMatchData.teamB;
    const originalTeamIndex = match.teams.findIndex(t => t.name === teamData?.name);
    
    if (originalTeamIndex === -1) return;

    let winner = getAssignedPlayer(originalTeamIndex, role);
    
    // JUST IN TIME ASSIGNMENT
    if (winner.id === 'tbd') {
        const currentlyAssignedIds = new Set(Object.values(globalAssignments));
        const availablePlayers = activePlayers.filter(p => !currentlyAssignedIds.has(p.id));
        const pickedPlayer = getFlexibleCandidate(availablePlayers, role);
        
        if (pickedPlayer) {
            winner = pickedPlayer;
            const key = `${originalTeamIndex}-${role}`;
            setGlobalAssignments(prev => ({ ...prev, [key]: pickedPlayer.id }));
        }
    }

    const candidates = activePlayers.filter(p => {
        const assignedToOtherSlot = Object.entries(globalAssignments).some(([k, pid]) => k !== `${originalTeamIndex}-${role}` && pid === p.id);
        if (assignedToOtherSlot) return false;
        return canPlay(p, role);
    });

    const candidateNames = candidates.map(p => p.name);
    if (!candidateNames.includes(winner.name)) candidateNames.push(winner.name);
    const randomDuration = Math.floor(Math.random() * (9000 - 4500 + 1)) + 4500;
    
    setWheelState({ 
        isOpen: true, 
        type: 'reveal', 
        team: side, 
        role: role, 
        winnerName: winner.name, 
        winnerPlayer: winner, 
        candidates: candidateNames, 
        duration: randomDuration 
    });
  };

  const handleSkipAll = (forceMatchIdx = currentMatchIdx, background = false) => {
    const matchData = allMatches.find(m => m.id === forceMatchIdx);
    if (!matchData) return;
    
    const newAssignments: Record<string, string> = {};
    const usedIds = new Set(Object.values(globalAssignments));
    
    const fillTeam = (teamName: string) => {
        const teamIdx = match.teams.findIndex(t => t.name === teamName);
        if (teamIdx === -1) return;
        
        ROLES_ORDER.forEach(role => {
            const key = `${teamIdx}-${role}`;
            if (globalAssignments[key]) return; 
            
            const available = activePlayers.filter(p => !usedIds.has(p.id));
            const picked = getFlexibleCandidate(available, role);
            
            if (picked) {
                newAssignments[key] = picked.id;
                usedIds.add(picked.id);
            }
        });
    };

    if (matchData.teamA) fillTeam(matchData.teamA.name);
    if (matchData.teamB) fillTeam(matchData.teamB.name);
    
    setGlobalAssignments(prev => ({ ...prev, ...newAssignments }));

    if (!background) {
        const allCards = new Set<string>();
        ROLES_ORDER.forEach(r => { 
            allCards.add(`m${forceMatchIdx}-A-${r}`); 
            if (matchData.teamB) allCards.add(`m${forceMatchIdx}-B-${r}`); 
        });
        setRevealedSlots(allCards);
        setCurrentRoleIdx(ROLES_ORDER.length - 1);
        setCompletedReveals(prev => new Set(prev).add(forceMatchIdx));
    }
  };

  const handleRerollClick = (side: 'azure' | 'crimson', role: Role) => {
    const teamData = side === 'azure' ? activeMatchData?.teamA : activeMatchData?.teamB;
    if (!teamData) return;
    const teamIndex = match.teams.findIndex(t => t.name === teamData.name);
    if (teamIndex === -1) return;

    const currentlyAssignedIds = new Set(Object.values(globalAssignments));
    const benchPlayers = activePlayers.filter(p => !currentlyAssignedIds.has(p.id));
    
    if (benchPlayers.length === 0) return;
    
    const candidates = benchPlayers.filter(p => canPlay(p, role));
    if (candidates.length === 0) return;
    
    const newPlayer = candidates[Math.floor(Math.random() * candidates.length)];
    const randomDuration = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
    
    setWheelState({ 
        isOpen: true, 
        type: 'reroll', 
        team: side, 
        role: role, 
        winnerName: newPlayer.name, 
        winnerPlayer: newPlayer, 
        candidates: candidates.map(p => p.name), 
        duration: randomDuration 
    });
  };

  const handleWheelComplete = () => {
    if (!wheelState) return;
    if (wheelState.type === 'reveal') {
        const { team, role, winnerPlayer } = wheelState;
        if (winnerPlayer && activeMatchData) {
             const teamData = team === 'azure' ? activeMatchData.teamA : activeMatchData.teamB;
             const teamIdx = match.teams.findIndex(t => t.name === teamData?.name);
             if (teamIdx !== -1) {
                 const key = `${teamIdx}-${role}`;
                 setGlobalAssignments(prev => ({ ...prev, [key]: winnerPlayer.id }));
             }
        }
        const id = `m${currentMatchIdx}-${team === 'azure' ? 'A' : 'B'}-${role}`;
        setRevealedSlots(prev => new Set(prev).add(id));
        
        // Standard Match Logic Only (Bye support removed from reveal)
        if (team === 'crimson') {
            const nextIdx = currentRoleIdx + 1;
            setCurrentRoleIdx(nextIdx);
            if (nextIdx >= ROLES_ORDER.length) {
                setCompletedReveals(prev => new Set(prev).add(currentMatchIdx));
            }
        }
    } else if (wheelState.type === 'reroll' && wheelState.winnerPlayer) {
        const teamData = wheelState.team === 'azure' ? activeMatchData?.teamA : activeMatchData?.teamB;
        if (teamData) {
            const idx = match.teams.findIndex(t => t.name === teamData.name);
            if (idx !== -1) {
                const key = `${idx}-${wheelState.role}`;
                setGlobalAssignments(prev => ({ ...prev, [key]: wheelState.winnerPlayer!.id }));
            }
        }
    }
    setWheelState(null);
  };

  const openRenameModal = (player: Player) => {
    setRenameState({ isOpen: true, player, newName: player.name });
  };
  
  const submitRename = () => {
    if (renameState.player && renameState.newName.trim()) {
        onUpdatePlayer({ ...renameState.player, name: renameState.newName.trim() });
        setRenameState({ isOpen: false, player: null, newName: '' });
    }
  };

  const renderPlayerCard = (role: Role, teamSide: 'azure' | 'crimson') => {
    const teamData = teamSide === 'azure' ? activeMatchData?.teamA : activeMatchData?.teamB;
    const teamIdx = match.teams.findIndex(t => t.name === teamData?.name);
    const player = teamIdx !== -1 ? getAssignedPlayer(teamIdx, role) : TBD_PLAYER;

    const id = `m${currentMatchIdx}-${teamSide === 'azure' ? 'A' : 'B'}-${role}`;
    if (!revealedSlots.has(id)) return <div className="h-16 w-full relative overflow-hidden clip-corner-md border border-[#1e3a5f] bg-[#05090f]/80 flex flex-col items-center justify-center opacity-40 group"><div className="text-[#1e3a5f] group-hover:text-[#dcb06b]/50 transition-colors duration-500 transform scale-100 opacity-50">{RoleIcons[role]}</div></div>;
    
    const theme = teamSide === 'azure' ? { bg: 'bg-[#0a1a2f]', border: 'border-[#00d2ff]', glow: 'shadow-[0_0_15px_#00d2ff]', text: 'text-[#00d2ff]', gradient: 'from-[#00d2ff]/20 to-transparent' } : { bg: 'bg-[#1a0505]', border: 'border-[#ef4444]', glow: 'shadow-[0_0_15px_#ef4444]', text: 'text-[#ef4444]', gradient: 'from-[#ef4444]/20 to-transparent' };
    
    return (
        <div className="relative h-16 w-full animate-slide-in perspective-container group">
            <div className={`absolute inset-0 clip-corner-md border-l-4 tilt-card ${theme.bg} ${theme.border} ${theme.glow} shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300`}>
                <div className={`flex flex-col h-full relative z-10 px-6 py-0 justify-center ${teamSide === 'crimson' ? 'items-end text-right' : 'items-start text-left'}`}>
                    <div className={`mb-1 px-2 py-0.5 rounded-sm bg-black/50 border border-white/10 ${theme.text} scale-[0.8] origin-${teamSide === 'crimson' ? 'right' : 'left'} opacity-90`}>{RoleIcons[role]}</div>
                    <span className="block text-xl md:text-3xl font-bold text-white truncate font-orbitron drop-shadow-md w-full">{player.name}</span>
                    <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-50 pointer-events-none`}></div>
                </div>
                <div className={`absolute top-2 z-50 flex gap-2 transition-all opacity-0 group-hover:opacity-100 ${teamSide === 'azure' ? 'right-4' : 'left-4'}`}>
                   <button onClick={(e) => { e.stopPropagation(); handleRerollClick(teamSide, role); }} className="p-2.5 bg-black/60 hover:bg-[#dcb06b] rounded-full text-white hover:text-black transition-all" title="Reroll Player"><svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                   <button onClick={(e) => { e.stopPropagation(); if(player) openRenameModal(player); }} className="p-2.5 bg-black/60 hover:bg-[#00d2ff] rounded-full text-white hover:text-black transition-all" title="Change Nickname"><svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                </div>
            </div>
        </div>
    );
  };

  const renderTournamentEnd = () => {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#05090f] overflow-hidden">
        <iframe width="0" height="0" src="https://www.youtube.com/embed/13ARO0HDZsQ?autoplay=1&loop=1&playlist=13ARO0HDZsQ" frameBorder="0" allow="autoplay" className="hidden pointer-events-none"></iframe>
        <div className="god-rays opacity-40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#05090f_90%)] z-10"></div>
        {Array.from({ length: 40 }).map((_, i) => (<div key={i} className="confetti-piece" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, backgroundColor: Math.random() > 0.5 ? '#dcb06b' : '#ffffff', zIndex: 20 }}></div>))}
        <div className="relative z-20 flex flex-col items-center animate-trophy-pop w-full max-w-4xl">
            <h3 className="text-[#dcb06b] font-orbitron font-black tracking-[0.8em] text-sm uppercase mb-4 animate-pulse opacity-80">TOURNAMENT CONCLUDED</h3>
            <h1 className="text-5xl md:text-8xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#dcb06b] mb-12 tracking-[0.2em] drop-shadow-[0_10px_30px_rgba(220,176,107,0.4)] text-center px-4">TOURNAMENT CHAMPIONS</h1>
            <div className="bg-[#0a1a2f]/80 border-4 border-[#dcb06b] px-12 md:px-24 py-10 clip-corner-md shadow-[0_0_100px_rgba(220,176,107,0.3)] relative overflow-hidden group mb-12 transform hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-[#dcb06b]/10 to-transparent opacity-50"></div>
                <h2 className="text-6xl md:text-9xl font-black font-cinzel text-white text-center drop-shadow-[0_0_20px_#dcb06b]" style={{ color: tournamentChampion?.color || '#fff' }}>{tournamentChampion?.name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full px-6 mb-16">
               {tournamentChampion?.slots.map((slot: TeamSlot, idx: number) => (<div key={idx} className="flex flex-col items-center p-4 bg-black/40 border border-[#dcb06b]/40 clip-corner-sm backdrop-blur-md transform transition-all duration-700 hover:border-[#dcb06b] hover:bg-[#dcb06b]/5 animate-slide-in" style={{ animationDelay: `${idx * 150}ms` }}><div className="text-[#dcb06b] mb-2 opacity-70 scale-90">{RoleIcons[slot.role]}</div><span className="text-white font-orbitron font-black text-sm md:text-base tracking-widest truncate max-w-full">{slot.player.name}</span></div>))}
            </div>
            <Button onClick={onReset} size="lg" className="px-24 h-20 text-xl shadow-[0_0_50px_rgba(220,176,107,0.5)]">RETURN TO LOBBY</Button>
        </div>
      </div>
    );
  };

  if (phase === 'TOURNAMENT_END') return renderTournamentEnd();
  if (phase === 'TRANSITION' && activeMatchData) return <PortalTransition azureTeam={activeMatchData.teamA?.slots || []} crimsonTeam={activeMatchData.teamB?.slots || []} onComplete={() => setPhase('DECLARE_WIN')} />;
  if (phase === 'DECLARE_WIN' && activeMatchData) return <MatchSummary match={{ roomId: activeRoomId, azureTeam: activeMatchData.teamA?.slots || [], crimsonTeam: activeMatchData.teamB?.slots || [], isCoachMode: false, timestamp: Date.now() }} onReset={(w) => { if(!w) setPhase('OVERVIEW'); else { setCurrentRoundWinner(w); setPhase('CELEBRATION'); } }} />;
  if (phase === 'CELEBRATION' && currentRoundWinner && activeMatchData) return <VictoryCelebration winner={currentRoundWinner} teamSlots={(currentRoundWinner === 'azure' ? activeMatchData.teamA?.slots : activeMatchData.teamB?.slots) || []} onDismiss={() => setPhase('EVALUATION')} />;
  if (phase === 'EVALUATION' && currentRoundWinner && activeMatchData) return <EvaluationScreen match={{ roomId: activeRoomId, azureTeam: activeMatchData.teamA?.slots || [], crimsonTeam: activeMatchData.teamB?.slots || [], isCoachMode: false, timestamp: Date.now() }} winner={currentRoundWinner} onComplete={handleEvaluationComplete} />;

  // DETERMINE BUTTON TEXT FOR REVEAL PHASE
  const getRevealButtonText = () => {
     if (revealedSlots.size >= 10) return "INITIALIZE BATTLE";
     
     const nextRoleIdx = currentRoleIdx + 1;
     // If we are at the end, default to Start/Initialize
     if (nextRoleIdx >= ROLES_ORDER.length) return "INITIALIZE BATTLE";
     
     const nextRole = ROLES_ORDER[nextRoleIdx];
     const azureRevealed = revealedSlots.has(`m${currentMatchIdx}-A-${nextRole}`);
     
     return azureRevealed ? `SELECT CRIMSON ${nextRole.replace(' Lane', '').toUpperCase()}` : `SELECT AZURE ${nextRole.replace(' Lane', '').toUpperCase()}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#05090f] overflow-x-auto overflow-y-auto font-inter">
      <ConfirmModal isOpen={showAbortConfirm} title="ABORT TOURNAMENT" message="Are you sure you want to end the tournament? All progress will be lost." onConfirm={onReset} onCancel={() => setShowAbortConfirm(false)} isDestructive={true} />
      {renameState.isOpen && (<div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })}></div><div className="relative w-full max-w-sm bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in p-6"><h3 className="text-[#dcb06b] font-cinzel font-bold text-lg mb-4 text-center tracking-widest">CHANGE NICKNAME</h3><input type="text" value={renameState.newName} onChange={e => setRenameState({ ...renameState, newName: e.target.value })} className="w-full bg-black/50 border border-[#1e3a5f] p-3 text-white font-orbitron focus:border-[#dcb06b] outline-none mb-6 text-center" autoFocus /><div className="flex gap-3"><Button variant="secondary" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })} className="flex-1">CANCEL</Button><Button onClick={submitRename} className="flex-1">CONFIRM</Button></div></div></div>)}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0a1a2f_0%,#05090f_60%)] pointer-events-none"></div>
      {phase === 'OVERVIEW' ? (
        <div className="relative z-10 w-full min-h-screen p-8 md:p-12 flex flex-col items-center min-w-max">
          <div className="text-center mb-16"><h1 className="text-4xl md:text-6xl font-cinzel font-black text-[#dcb06b] tracking-[0.3em] mb-4 uppercase">TOURNAMENT BRACKET</h1><p className="text-[10px] text-[#4a5f78] font-orbitron font-black tracking-[0.5em] uppercase border-y border-[#4a5f78]/30 py-2 inline-block">BATTLE FOR GLORY</p></div>
          <div className="flex gap-24 md:gap-40 items-center justify-center relative py-20">
            {hasQuarterFinals && (<div className="flex flex-col gap-16 relative">{quarterMatches.map((m, i) => (<div key={m.id} className="relative">{renderBracketMatchCard(m)}{match.teams.length === 5 || match.teams.length === 6 ? (i < 2 ? (i === 0 && <EnergyConnector type="fork" height={274} />) : <EnergyConnector type="straight" height={0} />) : (i % 2 === 0 && <EnergyConnector type="fork" height={322} />)}</div>))}</div>)}
            <div className={`flex flex-col gap-32 relative`}>{semiMatches.map((m, i) => (<div key={m.id} className="relative">{renderBracketMatchCard(m)}{i === 0 && <EnergyConnector type="fork" height={338} />}</div>))}</div>
            <div className={`relative scale-125 ml-10`}>{renderBracketMatchCard(grandFinalMatch)}</div>
          </div>
          <button onClick={() => setShowAbortConfirm(true)} className="mt-24 px-12 py-3 bg-red-900/10 border border-red-900/40 text-red-500 font-cinzel font-bold tracking-[0.3em] uppercase hover:bg-red-900 hover:text-white transition-all clip-corner-sm">ABORT TOURNAMENT</button>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28 relative h-screen flex flex-col justify-center overflow-hidden">
            {wheelState && wheelState.isOpen && <SpinWheel candidates={wheelState.candidates} winnerName={wheelState.winnerName} team={wheelState.team} roleName={wheelState.role} roomId={activeRoomId} duration={wheelState.duration} onComplete={handleWheelComplete} onCancel={() => setWheelState(null)} />}
            <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-center"><Button variant="outline" size="sm" onClick={() => setPhase('OVERVIEW')} className="border-[#dcb06b]/60 text-[#dcb06b] hover:bg-[#dcb06b]/10 text-xs px-6">BACK TO BRACKET</Button><div className="flex flex-col items-center gap-0 scale-[0.85] origin-top"><span className="text-[#dcb06b] font-orbitron text-[10px] tracking-[0.4em] font-black uppercase mb-1 opacity-70">ROOM ID</span><div className="relative"><div className="absolute -inset-2 bg-[#dcb06b] blur-[15px] opacity-20 pointer-events-none"></div><div className="relative bg-black/90 border border-[#dcb06b]/50 px-8 py-2 clip-corner-sm flex flex-col items-center shadow-[0_0_20px_rgba(220,176,107,0.3)]"><span className="text-2xl font-orbitron font-black text-white tracking-[0.4em] drop-shadow-[0_0_10px_#dcb06b]">{activeRoomId}</span></div></div></div>{revealedSlots.size < 10 ? <Button variant="outline" size="sm" onClick={() => handleSkipAll(currentMatchIdx)} className="border-[#dcb06b]/60 text-[#dcb06b] hover:bg-[#dcb06b]/10 text-xs px-6">SKIP ALL</Button> : <div className="w-[120px]"></div>}</div>
            <div className="relative max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center px-10">
                <div className="grid grid-cols-2 gap-12 md:gap-32 items-end mb-6"><div className="text-left"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-600 tracking-widest drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]" style={{ color: activeMatchData?.teamA?.color }}>{activeMatchData?.teamA?.name.split(' ')[0]} <span className="hidden md:inline">{activeMatchData?.teamA?.name.split(' ')[1] || 'GOLEM'}</span></h2><div className="mt-2 h-1 w-full bg-gradient-to-r from-cyan-500 to-transparent shadow-[0_0_10px_#00d2ff]"></div></div><div className="text-right"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-red-100 to-red-600 tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" style={{ color: activeMatchData?.teamB?.color }}><span className="hidden md:inline">{activeMatchData?.teamB?.name.split(' ')[0] || 'CRIMSON'}</span> {activeMatchData?.teamB?.name.split(' ')[1] || 'GOLEM'}</h2><div className="mt-2 h-1 w-full bg-gradient-to-l from-red-500 to-transparent shadow-[0_0_10px_#ef4444]"></div></div></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20"><span className="text-[12rem] font-black italic text-[#dcb06b] font-orbitron select-none">VS</span></div>
                <div className="space-y-4 relative z-10">{ROLES_ORDER.map((role) => <div key={role} className="grid grid-cols-2 gap-12 md:gap-32 items-center"><div>{renderPlayerCard(role, 'azure')}</div><div>{renderPlayerCard(role, 'crimson')}</div></div>)}</div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-8 z-50 flex justify-center items-end h-28 pointer-events-none">
                <div className="pointer-events-auto">
                    {revealedSlots.size < 10 ? 
                       <button onClick={handleNextReveal} className="group relative px-16 h-16 bg-[#0a1a2f] border-2 border-[#dcb06b] clip-corner-md flex items-center justify-center text-[#dcb06b] font-cinzel font-bold text-base hover:bg-[#dcb06b] hover:text-[#05090f] transition-all duration-300 shadow-[0_0_30px_rgba(220,176,107,0.4)]">{getRevealButtonText()}</button> 
                       : 
                       <Button onClick={() => setPhase('TRANSITION')} size="lg" className="px-24 h-16 text-lg animate-pulse shadow-[0_0_40px_rgba(220,176,107,0.5)]">INITIALIZE BATTLE</Button>
                    }
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
