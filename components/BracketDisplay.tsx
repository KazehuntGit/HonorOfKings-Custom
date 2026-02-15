
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BracketMatchResult, Role, TeamSlot, Player } from '../types';
import { RoleIcons, ROLES_ORDER, RoleImagesActive } from '../constants'; // Using RoleImagesActive explicitly
import { Button } from './Button';
import { SpinWheel } from './SpinWheel';
import { EvaluationScreen } from './EvaluationScreen';
import { MatchSummary } from './MatchSummary';
import { PortalTransition } from './PortalTransition';
import { VictoryCelebration } from './VictoryCelebration';
import { ConfirmModal } from './ConfirmModal';
import { canPlay, TBD_PLAYER } from '../utils/matchmaker';

interface BracketDisplayProps {
  match: BracketMatchResult;
  onReset: () => void;
  onMinimize: () => void;
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

type BracketPhase = 'TEAM_REVEAL' | 'MATCHUP_LOTTERY' | 'OVERVIEW' | 'TRANSITION' | 'DECLARE_WIN' | 'CELEBRATION' | 'EVALUATION' | 'TOURNAMENT_END';

const ScrambleText: React.FC<{ text: string; isRevealed: boolean; className?: string }> = ({ text, isRevealed, className }) => {
  const [display, setDisplay] = useState(isRevealed ? text : 'INITIALIZING...');
  
  useEffect(() => {
    if (!isRevealed) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@&";
        const interval = setInterval(() => {
            setDisplay(Array(text.length > 0 ? text.length : 8).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join(''));
        }, 50);
        return () => clearInterval(interval);
    } else {
        let iteration = 0;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const interval = setInterval(() => {
            setDisplay(text.split("").map((letter, index) => {
                if (index < iteration) return letter;
                return chars[Math.floor(Math.random() * chars.length)];
            }).join(""));
            if (iteration >= text.length) clearInterval(interval);
            iteration += 1/2; 
        }, 30);
        return () => clearInterval(interval);
    }
  }, [text, isRevealed]);

  return <span className={className}>{display}</span>;
};

// Component for the rolling team name in Lottery Phase
const RollingTeamName: React.FC<{ targetName: string; isLocked: boolean; color: string }> = ({ targetName, isLocked, color }) => {
    const [currentName, setCurrentName] = useState("SEARCHING...");
    
    useEffect(() => {
        if (isLocked) {
            setCurrentName(targetName);
            return;
        }
        
        // Random names/words to cycle through
        const pool = ["ALPHA", "OMEGA", "DELTA", "SEARCHING", "TARGETING", "LOCKED", "PENDING", "SYSTEM", "KINGS", "HONOR"];
        const interval = setInterval(() => {
            setCurrentName(pool[Math.floor(Math.random() * pool.length)]);
        }, 80);
        
        return () => clearInterval(interval);
    }, [isLocked, targetName]);

    return (
        <div className={`transition-all duration-300 ${isLocked ? 'scale-100 opacity-100' : 'scale-95 opacity-50 blur-[1px]'}`}>
            <h4 className="font-cinzel font-black text-lg md:text-2xl uppercase tracking-widest break-words leading-tight" style={{ color: isLocked ? color : '#4a5f78' }}>
                {currentName}
            </h4>
        </div>
    );
};

export const BracketDisplay: React.FC<BracketDisplayProps> = ({ match, onReset, onMinimize, activePlayers, onReroll, onUpdatePlayer }) => {
  const [phase, setPhase] = useState<BracketPhase>('TEAM_REVEAL');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [matchRoomIds, setMatchRoomIds] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [matchEvaluations, setMatchEvaluations] = useState<Record<string, { mvpId?: string, ratings?: Record<string, number> }>>({});
  const [currentRoundWinner, setCurrentRoundWinner] = useState<'azure' | 'crimson' | null>(null);
  const [tournamentChampion, setTournamentChampion] = useState<any | null>(null);

  // Team Reveal State
  const [revealedTeamIndices, setRevealedTeamIndices] = useState<Set<number>>(new Set());
  const [isGlobalRolling, setIsGlobalRolling] = useState(false);
  const [isGlobalRevealComplete, setIsGlobalRevealComplete] = useState(false);

  // Matchup Lottery State
  const [lotteryRevealedCount, setLotteryRevealedCount] = useState(0);

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

  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [renameState, setRenameState] = useState<{ isOpen: boolean; player: Player | null; newName: string }>({
    isOpen: false,
    player: null,
    newName: ''
  });

  const [wheelState, setWheelState] = useState<{
    isOpen: boolean;
    type: 'reroll';
    team: 'azure' | 'crimson';
    role: Role;
    winnerName: string;
    winnerPlayer?: Player;
    candidates: string[];
    duration: number;
  } | null>(null);

  const getAssignedPlayer = useCallback((teamIdx: number, role: Role): Player => {
      const key = `${teamIdx}-${role}`;
      const pid = globalAssignments[key];
      if (pid) {
          return activePlayers.find(p => p.id === pid) || TBD_PLAYER;
      }
      return TBD_PLAYER;
  }, [globalAssignments, activePlayers]);

  const { roundOneMatches, quarterMatches, semiMatches, grandFinalMatch, allMatches, hasRoundOne } = useMemo(() => {
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

      // Logika khusus 12 Tim
      if (numTeams === 12) {
          const r1: InternalMatch[] = [];
          for (let i = 0; i < 4; i++) {
              r1.push({ id: i, label: `PLAY-IN ${i + 1}`, mode: 'BO1', teamA: getTeamObj(i * 2), teamB: getTeamObj(i * 2 + 1) });
          }
          const qm: InternalMatch[] = [];
          qm.push({ id: 4, label: 'QUARTER 1', mode: 'BO1', teamA: getWinnerTeam(0, r1[0].teamA, r1[0].teamB), teamB: getTeamObj(8) });
          qm.push({ id: 5, label: 'QUARTER 2', mode: 'BO1', teamA: getWinnerTeam(1, r1[1].teamA, r1[1].teamB), teamB: getTeamObj(9) });
          qm.push({ id: 6, label: 'QUARTER 3', mode: 'BO1', teamA: getWinnerTeam(2, r1[2].teamA, r1[2].teamB), teamB: getTeamObj(10) });
          qm.push({ id: 7, label: 'QUARTER 4', mode: 'BO1', teamA: getWinnerTeam(3, r1[3].teamA, r1[3].teamB), teamB: getTeamObj(11) });
          
          const sm: InternalMatch[] = [];
          sm.push({ id: 8, label: 'SEMI FINAL 1', mode: 'BO1', teamA: getWinnerTeam(4, qm[0].teamA, qm[0].teamB), teamB: getWinnerTeam(5, qm[1].teamA, qm[1].teamB) });
          sm.push({ id: 9, label: 'SEMI FINAL 2', mode: 'BO1', teamA: getWinnerTeam(6, qm[2].teamA, qm[2].teamB), teamB: getWinnerTeam(7, qm[3].teamA, qm[3].teamB) });
          
          const gf: InternalMatch = { id: 10, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(8, sm[0].teamA, sm[0].teamB), teamB: getWinnerTeam(9, sm[1].teamA, sm[1].teamB) };
          
          return { roundOneMatches: r1, quarterMatches: qm, semiMatches: sm, grandFinalMatch: gf, allMatches: [...r1, ...qm, ...sm, gf], hasRoundOne: true };
      }

      // Logika khusus 14 Tim
      if (numTeams === 14) {
          const r1: InternalMatch[] = [];
          for (let i = 0; i < 6; i++) {
              r1.push({ id: i, label: `PLAY-IN ${i + 1}`, mode: 'BO1', teamA: getTeamObj(i * 2), teamB: getTeamObj(i * 2 + 1) });
          }

          const qm: InternalMatch[] = [];
          qm.push({ id: 6, label: 'QUARTER 1', mode: 'BO1', teamA: getWinnerTeam(0, r1[0].teamA, r1[0].teamB), teamB: getWinnerTeam(1, r1[1].teamA, r1[1].teamB) });
          qm.push({ id: 7, label: 'QUARTER 2', mode: 'BO1', teamA: getWinnerTeam(2, r1[2].teamA, r1[2].teamB), teamB: getWinnerTeam(3, r1[3].teamA, r1[3].teamB) });
          qm.push({ id: 8, label: 'QUARTER 3', mode: 'BO1', teamA: getWinnerTeam(4, r1[4].teamA, r1[4].teamB), teamB: getTeamObj(12) });
          qm.push({ id: 9, label: 'QUARTER 4', mode: 'BO1', teamA: getWinnerTeam(5, r1[5].teamA, r1[5].teamB), teamB: getTeamObj(13) });

          const sm: InternalMatch[] = [];
          sm.push({ id: 10, label: 'SEMI FINAL 1', mode: 'BO1', teamA: getWinnerTeam(6, qm[0].teamA, qm[0].teamB), teamB: getWinnerTeam(7, qm[1].teamA, qm[1].teamB) });
          sm.push({ id: 11, label: 'SEMI FINAL 2', mode: 'BO1', teamA: getWinnerTeam(8, qm[2].teamA, qm[2].teamB), teamB: getWinnerTeam(9, qm[3].teamA, qm[3].teamB) });

          const gf: InternalMatch = { id: 12, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(10, sm[0].teamA, sm[0].teamB), teamB: getWinnerTeam(11, sm[1].teamA, sm[1].teamB) };
          
          return { roundOneMatches: r1, quarterMatches: qm, semiMatches: sm, grandFinalMatch: gf, allMatches: [...r1, ...qm, ...sm, gf], hasRoundOne: true };
      }

      // Logika khusus 16 Tim
      if (numTeams === 16) {
          const r16: InternalMatch[] = [];
          for (let i = 0; i < 8; i++) {
              r16.push({ id: i, label: `R16 - MATCH ${i + 1}`, mode: 'BO1', teamA: getTeamObj(i * 2), teamB: getTeamObj(i * 2 + 1) });
          }
          const qm: InternalMatch[] = [];
          for (let i = 0; i < 4; i++) {
              qm.push({ id: 8+i, label: `QUARTER ${i + 1}`, mode: 'BO1', teamA: getWinnerTeam(i*2, r16[i*2].teamA, r16[i*2].teamB), teamB: getWinnerTeam(i*2+1, r16[i*2+1].teamA, r16[i*2+1].teamB) });
          }
          const sm: InternalMatch[] = [];
          for (let i = 0; i < 2; i++) {
              sm.push({ id: 12+i, label: `SEMI FINAL ${i + 1}`, mode: 'BO1', teamA: getWinnerTeam(8+i*2, qm[i*2].teamA, qm[i*2].teamB), teamB: getWinnerTeam(8+i*2+1, qm[i*2+1].teamA, qm[i*2+1].teamB) });
          }
          const gf: InternalMatch = { id: 14, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(12, sm[0].teamA, sm[0].teamB), teamB: getWinnerTeam(13, sm[1].teamA, sm[1].teamB) };
          
          return { roundOneMatches: r16, quarterMatches: qm, semiMatches: sm, grandFinalMatch: gf, allMatches: [...r16, ...qm, ...sm, gf], hasRoundOne: true };
      }

      // Existing logics for 3, 4, 5, 6, 8 teams...
      if (numTeams === 3) {
        const m0: InternalMatch = { id: 0, label: 'ELIMINATION', mode: 'BO1', teamA: getTeamObj(0), teamB: getTeamObj(1) };
        const m1: InternalMatch = { id: 1, label: 'CHALLENGER', mode: 'BO1', teamA: getLoserTeam(0, m0.teamA, m0.teamB), teamB: getTeamObj(2) };
        const m2: InternalMatch = { id: 2, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(0, m0.teamA, m0.teamB), teamB: getWinnerTeam(1, m1.teamA, m1.teamB) };
        const matches: InternalMatch[] = [m0, m1, m2];
        return { roundOneMatches: [], quarterMatches: [], semiMatches: [m0, m1], grandFinalMatch: m2, allMatches: matches, hasRoundOne: false };
      }

      if (numTeams === 5 || numTeams === 6) {
        const q0: InternalMatch = { id: 0, label: 'QUARTER 1', mode: 'BO1', teamA: getTeamObj(0), teamB: getTeamObj(1) };
        const q1: InternalMatch = { id: 1, label: 'QUARTER 2', mode: 'BO1', teamA: getTeamObj(2), teamB: getTeamObj(3) };
        const q2: InternalMatch = { id: 2, label: 'QUARTER 3', mode: 'BO1', teamA: getTeamObj(4), teamB: getTeamObj(5) || null };
        const s1: InternalMatch = { id: 3, label: 'SEMI FINAL 1', mode: 'BO1', teamA: getWinnerTeam(0, q0.teamA, q0.teamB), teamB: getWinnerTeam(1, q1.teamA, q1.teamB) };
        const s2: InternalMatch = { id: 4, label: 'SEMI FINAL 2', mode: 'BO1', teamA: getWinnerTeam(2, q2.teamA, q2.teamB), teamB: getLoserTeam(3, s1.teamA, s1.teamB) };
        const gf: InternalMatch = { id: 5, label: 'GRAND FINAL', mode: 'BO3', teamA: getWinnerTeam(3, s1.teamA, s1.teamB), teamB: getWinnerTeam(4, s2.teamA, s2.teamB) };
        return { roundOneMatches: [], quarterMatches: [q0, q1, q2], semiMatches: [s1, s2], grandFinalMatch: gf, allMatches: [q0, q1, q2, s1, s2, gf], hasRoundOne: false };
      }

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
      return { roundOneMatches: [], quarterMatches: qMatches, semiMatches: sMatches, grandFinalMatch: gf, allMatches: [...qMatches, ...sMatches, gf], hasRoundOne: false };
  }, [match, scores, globalAssignments, getAssignedPlayer]); 

  // LOTTERY LOGIC
  useEffect(() => {
      if (phase === 'MATCHUP_LOTTERY') {
          const matchesToReveal = hasRoundOne ? roundOneMatches : quarterMatches;
          if (lotteryRevealedCount <= matchesToReveal.length) {
              const timer = setTimeout(() => {
                  setLotteryRevealedCount(prev => prev + 1);
              }, 1200); 
              return () => clearTimeout(timer);
          }
      }
  }, [phase, lotteryRevealedCount, hasRoundOne, roundOneMatches, quarterMatches]);

  const activeMatchData = useMemo(() => {
    const data = allMatches.find(m => m.id === currentMatchIdx);
    if (!data) return undefined;
    if (data.label === 'GRAND FINAL') {
        const sA = scores[`${currentMatchIdx}-A`] || 0;
        const sB = scores[`${currentMatchIdx}-B`] || 0;
        if ((sA + sB) % 2 !== 0) return { ...data, teamA: data.teamB, teamB: data.teamA };
    }
    return data;
  }, [allMatches, currentMatchIdx, scores]);

  const activeRoomId = matchRoomIds[currentMatchIdx] || 'AUTO';

  const startMatchFlow = (idx: number) => {
    setCurrentMatchIdx(idx);
    setPhase('TRANSITION');
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
     let incrementA = 0; let incrementB = 0;
     if (currentRoundWinner === 'azure') { if (isSwapped) incrementB = 1; else incrementA = 1; } 
     else if (currentRoundWinner === 'crimson') { if (isSwapped) incrementA = 1; else incrementB = 1; }
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

  const submitRename = () => {
    if (renameState.player && renameState.newName.trim()) {
        onUpdatePlayer({ ...renameState.player, name: renameState.newName.trim() });
        setRenameState({ isOpen: false, player: null, newName: '' });
    }
  };

  const handleWheelComplete = () => {
    if (!wheelState) return;
    if (wheelState.type === 'reroll' && wheelState.winnerPlayer && activeMatchData) {
        const side = wheelState.team;
        const teamData = side === 'azure' ? activeMatchData.teamA : activeMatchData.teamB;
        const teamIdx = match.teams.findIndex(t => t.name === teamData?.name);
        if (teamIdx !== -1) {
            setGlobalAssignments(prev => ({ ...prev, [`${teamIdx}-${wheelState.role}`]: wheelState.winnerPlayer!.id }));
            onReroll(teamIdx, wheelState.role, wheelState.winnerPlayer!);
        }
    }
    setWheelState(null);
  };

  const handleStartGlobalReveal = () => {
     setIsGlobalRolling(true);
     match.teams.forEach((_, idx) => {
         setTimeout(() => {
             setRevealedTeamIndices(prev => new Set(prev).add(idx));
             if (idx === match.teams.length - 1) {
                 setTimeout(() => {
                     setIsGlobalRolling(false);
                     setIsGlobalRevealComplete(true);
                 }, 1500);
             }
         }, (idx + 1) * 2000); // Stagger reveal
     });
  };

  const renderPlayerCard = (role: Role, side: 'azure' | 'crimson') => {
    if (!activeMatchData) return null;
    const teamData = side === 'azure' ? activeMatchData.teamA : activeMatchData.teamB;
    const teamIdx = match.teams.findIndex(t => t.name === teamData?.name);
    const player = teamData ? teamData.slots.find(s => s.role === role)?.player : null;
    const isCoach = role === Role.COACH;

    let theme = isCoach ? { bg: 'bg-[#1a1a1a]', border: 'border-white', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.6)]', text: 'text-white', gradient: 'from-white/20 to-transparent' }
      : side === 'azure' ? { bg: 'bg-[#0a1a2f]', border: 'border-[#00d2ff]', glow: 'shadow-[0_0_15px_#00d2ff]', text: 'text-[#00d2ff]', gradient: 'from-[#00d2ff]/20 to-transparent' }
      : { bg: 'bg-[#1a0505]', border: 'border-[#ef4444]', glow: 'shadow-[0_0_15px_#ef4444]', text: 'text-[#ef4444]', gradient: 'from-[#c02d2d]/20 to-transparent' };

    return (
      <div className={`relative h-16 w-full max-w-md mx-auto animate-slide-in perspective-container group`}>
        <div className={`absolute inset-0 clip-corner-md border-l-4 tilt-card ${theme.bg} ${theme.border} ${theme.glow} shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300`}>
           <div className={`flex flex-col h-full relative z-10 px-4 py-0 justify-center ${side === 'crimson' ? 'items-end text-right' : 'items-start text-left'}`}>
             <div className={`mb-0.5 px-2 py-0.5 rounded-sm bg-black/50 border border-white/10 ${theme.text} scale-[0.75] origin-${side === 'crimson' ? 'right' : 'left'} opacity-90`}>
                {RoleIcons[role]}
             </div>
             <span className="block text-lg md:text-xl font-bold text-white truncate font-orbitron drop-shadow-md w-full">
                {player?.name}
             </span>
             <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-50 pointer-events-none`}></div>
           </div>
           
           <div className={`absolute top-2 z-50 flex gap-2 transition-all opacity-0 group-hover:opacity-100 ${side === 'azure' ? 'right-2' : 'left-2'}`}>
              <button onClick={(e) => { 
                  e.stopPropagation(); 
                  if (teamIdx !== -1) {
                      const usedIds = new Set(Object.values(globalAssignments));
                      const candidates = activePlayers.filter(p => !usedIds.has(p.id) && canPlay(p, role));
                      if (candidates.length > 0) {
                          const newPlayer = candidates[Math.floor(Math.random() * candidates.length)];
                          setWheelState({ isOpen: true, type: 'reroll', team: side, role, winnerName: newPlayer.name, winnerPlayer: newPlayer, candidates: candidates.map(p => p.name), duration: 4000 });
                      }
                  }
              }} className="p-1.5 bg-black/60 hover:bg-[#dcb06b] rounded-full text-white hover:text-black transition-all" title="Reroll Player"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
              <button onClick={(e) => { e.stopPropagation(); if(player) setRenameState({ isOpen: true, player, newName: player.name }); }} className="p-1.5 bg-black/60 hover:bg-[#00d2ff] rounded-full text-white hover:text-black transition-all" title="Change Nickname"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
           </div>
        </div>
      </div>
    );
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
                        <span className={`text-xs font-cinzel font-black tracking-widest break-words leading-none whitespace-normal line-clamp-2 ${sA > sB ? 'text-[#dcb06b]' : 'text-white'}`}>{m.teamA?.name || 'TBD'}</span>
                        <span className={`font-orbitron font-bold text-lg ${sA > sB ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>{sA}</span>
                    </div>
                </div>
                {!isBye && (
                   <>
                    <div className="flex items-center gap-2 opacity-20 px-6 my-1"><div className="h-[1px] flex-1 bg-white"></div><span className="text-[8px] font-black italic text-[#8a9db8]">VS</span><div className="h-[1px] flex-1 bg-white"></div></div>
                    <div className={`flex items-center gap-3 relative transition-all duration-300 ${sB > sA ? 'opacity-100 scale-100' : (isDone ? 'opacity-40 grayscale scale-95' : 'opacity-100')}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: m.teamB?.color }}></div>
                        <div className={`flex-1 flex justify-between items-center ml-3 p-2 border-b ${sB > sA ? 'border-[#dcb06b]/50 bg-[#dcb06b]/5' : 'border-[#1e3a5f]/50'}`}>
                            <span className={`text-xs font-cinzel font-black tracking-widest break-words leading-none whitespace-normal line-clamp-2 ${sB > sA ? 'text-[#dcb06b]' : 'text-white'}`}>{m.teamB?.name || 'TBD'}</span>
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

  const renderMatchupLottery = () => {
      const matchesToDisplay = hasRoundOne ? roundOneMatches : quarterMatches;
      const isComplete = lotteryRevealedCount > matchesToDisplay.length;

      return (
          <div className="min-h-screen bg-[#05090f] p-8 relative overflow-y-auto flex flex-col items-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e3a5f_0%,#05090f_80%)] opacity-30 pointer-events-none"></div>
              
              {/* Back Button */}
              <div className="fixed top-6 left-6 z-[300]">
                  <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black shadow-[0_0_10px_rgba(220,176,107,0.3)]">LOBBY</Button>
              </div>

              <div className="relative z-10 text-center mb-12 animate-slide-in">
                  <h1 className="text-4xl md:text-6xl font-cinzel font-black text-[#dcb06b] tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(220,176,107,0.5)]">
                      RANDOMIZING MATCHUPS
                  </h1>
                  <div className="h-1 w-48 bg-[#dcb06b] mx-auto mt-4 mb-2 animate-pulse"></div>
                  <p className="text-[#8a9db8] font-orbitron tracking-widest text-xs">CALCULATING BRACKET SEEDS...</p>
              </div>

              <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-48">
                  {matchesToDisplay.map((m, idx) => {
                      const isRevealed = idx < lotteryRevealedCount;
                      const isRolling = idx === lotteryRevealedCount;
                      
                      // For UX, we only show matchups that actually have two teams
                      if (!m.teamA || !m.teamB) return null;

                      return (
                          <div key={m.id} className={`
                              relative bg-[#0a1a2f]/80 border-2 clip-corner-md p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500
                              ${isRevealed ? 'border-[#dcb06b] shadow-[0_0_20px_rgba(220,176,107,0.2)] opacity-100 scale-100' : 
                                isRolling ? 'border-[#00d2ff] shadow-[0_0_30px_rgba(0,210,255,0.4)] opacity-100 scale-105 z-10' : 
                                'border-[#1e3a5f] opacity-40 scale-95'}
                          `}>
                              <div className="absolute top-2 left-4 text-[10px] font-orbitron font-black text-[#4a5f78]">{m.label}</div>
                              
                              <div className="flex w-full items-center justify-between gap-4">
                                  {/* Team A */}
                                  <div className="flex-1 text-center">
                                      <div className="h-1 w-full bg-gradient-to-r from-transparent to-[#00d2ff] mb-2 opacity-50"></div>
                                      <RollingTeamName targetName={m.teamA.name} isLocked={isRevealed} color="#00d2ff" />
                                  </div>

                                  {/* VS */}
                                  <div className="font-black font-orbitron text-2xl italic text-white/20">VS</div>

                                  {/* Team B */}
                                  <div className="flex-1 text-center">
                                      <div className="h-1 w-full bg-gradient-to-l from-transparent to-[#ef4444] mb-2 opacity-50"></div>
                                      <RollingTeamName targetName={m.teamB.name} isLocked={isRevealed} color="#ef4444" />
                                  </div>
                              </div>
                              
                              {!isRevealed && isRolling && (
                                  <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none"></div>
                              )}
                          </div>
                      );
                  })}
              </div>

              {isComplete && (
                  <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 animate-slide-in">
                      <Button onClick={() => setPhase('OVERVIEW')} className="px-24 py-6 text-xl tracking-[0.2em] shadow-[0_0_40px_rgba(220,176,107,0.5)]">
                          VIEW BRACKET TREE
                      </Button>
                  </div>
              )}
          </div>
      );
  };

  const renderTeamRevealScreen = () => {
     return (
        <div className="fixed inset-0 z-[150] bg-[#05090f] overflow-y-auto custom-scrollbar flex flex-col items-center">
            
            {/* --- IMMERSIVE BACKGROUND --- */}
            {/* Hex Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e3a5f' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
            }}></div>
            
            {/* Fog & Mist Layers */}
            <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/yoshiharuyamashita/css-fog-animation/master/img/fog1.png')] bg-repeat-x bg-cover opacity-10 animate-fog pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/yoshiharuyamashita/css-fog-animation/master/img/fog2.png')] bg-repeat-x bg-cover opacity-10 animate-fog pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '30s' }}></div>
            
            {/* Spotlight Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dcb06b]/10 via-transparent to-transparent pointer-events-none"></div>

            {/* Back Button (Fixed) */}
            <div className="fixed top-6 left-6 z-[300]">
                <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black shadow-[0_0_10px_rgba(220,176,107,0.3)]">LOBBY</Button>
            </div>
            
            <div className="relative z-10 w-full max-w-[1800px] p-4 md:p-8 lg:p-12 flex flex-col items-center min-h-screen">
                
                {/* Header Section */}
                <div className="text-center mb-16 relative animate-slide-in mt-8">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[#dcb06b] blur-[100px] opacity-10 pointer-events-none"></div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-[#f3dcb1] via-[#dcb06b] to-[#8a6d3b] tracking-[0.15em] drop-shadow-[0_0_30px_rgba(220,176,107,0.4)] mb-4">
                        OFFICIAL DRAFT
                    </h1>
                    <div className="flex items-center justify-center gap-6">
                         <div className="h-[2px] w-12 md:w-32 bg-gradient-to-r from-transparent to-[#dcb06b]"></div>
                         <div className="flex flex-col items-center">
                            <p className="text-[#8a9db8] font-orbitron tracking-[0.6em] text-[10px] md:text-sm font-bold uppercase">TOURNAMENT ROSTER REVEAL</p>
                            <p className="text-[#4a5f78] font-orbitron tracking-[0.3em] text-[8px] uppercase mt-1">SECURE CONNECTION ESTABLISHED</p>
                         </div>
                         <div className="h-[2px] w-12 md:w-32 bg-gradient-to-l from-transparent to-[#dcb06b]"></div>
                    </div>
                </div>

                {/* Team Grid */}
                {/* Added pb-48 to allow scrolling past the fixed footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full pb-48">
                    {match.teams.map((team, idx) => {
                        const isRevealed = revealedTeamIndices.has(idx);
                        
                        return (
                            <div 
                                key={idx} 
                                className={`
                                    relative group transition-all duration-700
                                    ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-8'}
                                `}
                            >
                                {/* Holographic Glow */}
                                {isRevealed && <div className="absolute -inset-[2px] bg-gradient-to-b from-[#dcb06b]/50 to-transparent blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-lg"></div>}

                                <div className={`
                                    relative bg-[#0a1a2f]/80 backdrop-blur-xl border-t border-x border-b-2
                                    ${isRevealed ? 'border-[#dcb06b] shadow-[0_0_40px_rgba(220,176,107,0.1)]' : 'border-[#1e3a5f]'} 
                                    clip-corner-md h-full flex flex-col transition-all duration-500
                                `}>
                                    {/* Scanning Line Animation if rolling */}
                                    {isGlobalRolling && !isRevealed && (
                                        <div className="absolute inset-0 z-20 overflow-hidden clip-corner-md pointer-events-none">
                                            <div className="w-full h-[2px] bg-[#00d2ff] shadow-[0_0_15px_#00d2ff] absolute top-0 animate-[scan_1.5s_linear_infinite]"></div>
                                            <div className="absolute inset-0 bg-gradient-to-b from-[#00d2ff]/10 to-transparent animate-[scan-gradient_1.5s_linear_infinite]"></div>
                                        </div>
                                    )}

                                    {/* Card Header */}
                                    <div className="bg-[#05090f]/90 p-5 border-b border-white/5 relative overflow-hidden group-hover:bg-[#05090f] transition-colors">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <span className="text-[60px] font-black font-orbitron text-white leading-none tracking-tighter">{String(idx + 1).padStart(2, '0')}</span>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-10 shadow-[0_0_15px_currentColor]" style={{ backgroundColor: team.color, color: team.color }}></div>
                                                <h3 className="font-cinzel font-black text-white tracking-widest text-xl break-words leading-tight drop-shadow-md">{team.name}</h3>
                                            </div>
                                            <div className={`text-[9px] font-orbitron font-bold tracking-wider uppercase pl-5 flex items-center gap-2 ${isRevealed ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isRevealed ? 'bg-[#dcb06b] animate-pulse shadow-[0_0_5px_#dcb06b]' : 'bg-[#4a5f78]'}`}></div>
                                                {isRevealed ? <ScrambleText text="ROSTER CONFIRMED" isRevealed={true} /> : 'AWAITING DECRYPTION...'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body (Roles) */}
                                    <div className="p-4 space-y-3 flex-1 bg-gradient-to-b from-[#0a1a2f]/40 to-[#05090f]/60 relative">
                                        {/* Grid lines decoration */}
                                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#dcb06b 1px, transparent 1px)', backgroundSize: '100% 20px' }}></div>
                                        
                                        {ROLES_ORDER.map((role, rIdx) => {
                                            const player = getAssignedPlayer(idx, role);
                                            const roleImg = RoleImagesActive[role]; // USING ACTIVE ICON EXPLICITLY
                                            return (
                                                <div key={role} className="flex items-center gap-3 relative group/row z-10">
                                                    {/* Change Nickname Button - NOW WITH ROLE ICON */}
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            if(player && player.id !== 'tbd') setRenameState({ isOpen: true, player, newName: player.name }); 
                                                        }}
                                                        disabled={!isRevealed || !player || player.id === 'tbd'}
                                                        className={`
                                                            w-10 h-10 flex items-center justify-center rounded-full bg-[#05090f] border transition-all duration-300
                                                            ${isRevealed 
                                                                ? 'border-[#dcb06b]/40 shadow-[0_0_10px_rgba(220,176,107,0.2)] hover:border-[#dcb06b] hover:scale-110 cursor-pointer' 
                                                                : 'border-[#1e3a5f] opacity-50 cursor-default grayscale'}
                                                        `}
                                                        title={isRevealed ? "Edit Nickname" : ""}
                                                    >
                                                        {roleImg ? (
                                                            <img src={roleImg} alt={role} className="w-full h-full object-contain p-1.5" />
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRevealed ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Player Name & Full Role Name */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                                        <span className="text-[7px] text-[#4a5f78] uppercase font-bold tracking-wider leading-none mb-0.5">
                                                            {role.toUpperCase()}
                                                        </span>
                                                        <div className={`
                                                            text-sm font-orbitron font-bold truncate transition-colors duration-300
                                                            ${isRevealed ? 'text-white drop-shadow-sm' : 'text-[#1e3a5f]'}
                                                        `}>
                                                            <ScrambleText text={player?.name || '???'} isRevealed={isRevealed} />
                                                        </div>
                                                    </div>

                                                    {/* Tech Decor */}
                                                    {isRevealed && (
                                                        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                            <div className="w-1 h-1 bg-[#dcb06b] rounded-full shadow-[0_0_5px_#dcb06b]"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="h-1.5 w-full flex">
                                        <div className={`h-full flex-1 transition-all duration-1000 ${isRevealed ? 'bg-[#dcb06b] shadow-[0_0_15px_#dcb06b]' : 'bg-[#1e3a5f]'}`}></div>
                                        <div className="h-full w-4 bg-[#05090f]"></div>
                                        <div className={`h-full w-8 transition-all duration-1000 ${isRevealed ? 'bg-[#dcb06b]' : 'bg-[#1e3a5f]'}`}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* SPACER ELEMENT: Allows scrolling past the footer */}
                    <div className="h-40 w-full shrink-0 col-span-full"></div>
                </div>

                {/* Footer Controls - Redesigned as a Command Console */}
                <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center">
                    {/* Decorative Top Border */}
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#dcb06b] to-transparent opacity-50"></div>
                    
                    <div className="w-full bg-[#05090f]/90 backdrop-blur-xl p-6 md:p-8 flex flex-col items-center justify-center border-t border-[#dcb06b]/20 shadow-[0_-10px_50px_rgba(0,0,0,0.8)]">
                         <div className="pointer-events-auto flex flex-col items-center gap-4">
                            {!isGlobalRevealComplete ? (
                                <button 
                                    onClick={handleStartGlobalReveal} 
                                    disabled={isGlobalRolling}
                                    className={`
                                        group relative px-20 py-5 bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md 
                                        text-[#dcb06b] font-cinzel font-black text-xl tracking-[0.2em] 
                                        hover:bg-[#dcb06b] hover:text-[#05090f] transition-all duration-300
                                        ${isGlobalRolling ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_30px_rgba(220,176,107,0.3)] hover:shadow-[0_0_50px_rgba(220,176,107,0.6)] animate-pulse'}
                                    `}
                                >
                                    <div className="absolute inset-0 bg-[#dcb06b] opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                    <span className="relative z-10 flex items-center gap-4">
                                        {isGlobalRolling ? (
                                            <>
                                                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                DECRYPTING...
                                            </>
                                        ) : (
                                            <>COMMENCE REVEAL</>
                                        )}
                                    </span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setPhase('MATCHUP_LOTTERY')} 
                                    className="group relative px-24 py-6 bg-[#dcb06b] text-[#05090f] clip-corner-md font-cinzel font-black text-2xl tracking-[0.2em] hover:bg-white hover:scale-105 transition-all shadow-[0_0_50px_rgba(220,176,107,0.6)]"
                                >
                                    START BRACKET
                                </button>
                            )}

                            {!isGlobalRolling && !isGlobalRevealComplete && (
                                <button onClick={() => setPhase('MATCHUP_LOTTERY')} className="text-[#4a5f78] hover:text-[#dcb06b] text-[10px] font-orbitron font-bold uppercase tracking-widest border-b border-transparent hover:border-[#dcb06b] transition-all">
                                    Skip Animation &gt;&gt;
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rename Modal Integration - Added to fix bug where modal wasn't rendering */}
            {renameState.isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })}></div>
                  <div className="relative w-full max-w-sm bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in p-6">
                    <h3 className="text-[#dcb06b] font-cinzel font-bold text-lg mb-4 text-center tracking-widest">CHANGE NICKNAME</h3>
                    <input type="text" value={renameState.newName} onChange={e => setRenameState({ ...renameState, newName: e.target.value })} className="w-full bg-black/50 border border-[#1e3a5f] p-3 text-white font-orbitron focus:border-[#dcb06b] outline-none mb-6 text-center" autoFocus />
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })} className="flex-1">CANCEL</Button>
                      <Button onClick={submitRename} className="flex-1">CONFIRM</Button>
                    </div>
                  </div>
                </div>
              )}

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes scan-gradient {
                    0% { top: -100%; }
                    100% { top: 100%; }
                }
            `}</style>
        </div>
     );
  };

  if (phase === 'TOURNAMENT_END') return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[#05090f] overflow-hidden">
        <div className="absolute top-6 left-6 z-[300]">
              <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">LOBBY</Button>
        </div>
        <div className="god-rays opacity-40"></div>
        <div className="relative z-20 flex flex-col items-center animate-trophy-pop w-full max-w-4xl">
            <h1 className="text-5xl md:text-8xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-[#dcb06b] mb-12 tracking-[0.2em] text-center px-4">TOURNAMENT CHAMPIONS</h1>
            <h2 className="text-6xl md:text-9xl font-black font-cinzel text-white text-center drop-shadow-[0_0_20px_#dcb06b] mb-12" style={{ color: tournamentChampion?.color }}>{tournamentChampion?.name}</h2>
            <Button onClick={onReset} size="lg" className="px-24 h-20 text-xl shadow-[0_0_50px_rgba(220,176,107,0.5)]">RETURN TO LOBBY</Button>
        </div>
      </div>
  );

  const overlayBackButton = (
      <div className="fixed top-6 left-6 z-[300]">
            <Button variant="outline" size="sm" onClick={onMinimize} className="bg-black/80 border-[#dcb06b] text-[#dcb06b] hover:bg-[#dcb06b] hover:text-black">LOBBY</Button>
      </div>
  );

  if (phase === 'TEAM_REVEAL') return renderTeamRevealScreen();
  if (phase === 'MATCHUP_LOTTERY') return renderMatchupLottery();
  if (phase === 'TRANSITION' && activeMatchData) return <>{overlayBackButton}<PortalTransition azureTeam={activeMatchData.teamA?.slots || []} crimsonTeam={activeMatchData.teamB?.slots || []} azureTeamName={activeMatchData.teamA?.name || 'TBD'} crimsonTeamName={activeMatchData.teamB?.name || 'TBD'} roomId={activeRoomId} onComplete={() => setPhase('DECLARE_WIN')} /></>;
  if (phase === 'DECLARE_WIN' && activeMatchData) return <>{overlayBackButton}<MatchSummary match={{ roomId: activeRoomId, azureTeam: activeMatchData.teamA?.slots || [], crimsonTeam: activeMatchData.teamB?.slots || [], isCoachMode: false, timestamp: Date.now(), azureTeamName: activeMatchData.teamA?.name, crimsonTeamName: activeMatchData.teamB?.name }} onReset={(w) => { if(!w) setPhase('OVERVIEW'); else { setCurrentRoundWinner(w); setPhase('CELEBRATION'); } }} /></>;
  if (phase === 'CELEBRATION' && currentRoundWinner && activeMatchData) return <VictoryCelebration winner={currentRoundWinner} teamSlots={(currentRoundWinner === 'azure' ? activeMatchData.teamA?.slots : activeMatchData.teamB?.slots) || []} azureTeamName={activeMatchData.teamA?.name} crimsonTeamName={activeMatchData.teamB?.name} onDismiss={() => setPhase('EVALUATION')} />;
  if (phase === 'EVALUATION' && currentRoundWinner && activeMatchData) return <>{overlayBackButton}<EvaluationScreen match={{ roomId: activeRoomId, azureTeam: activeMatchData.teamA?.slots || [], crimsonTeam: activeMatchData.teamB?.slots || [], isCoachMode: false, timestamp: Date.now(), azureTeamName: activeMatchData.teamA?.name, crimsonTeamName: activeMatchData.teamB?.name }} winner={currentRoundWinner} onComplete={handleEvaluationComplete} /></>;

  // Use a variable to handle depth spacing, similar to how 16 teams was handled
  const isDeepBracket = match.teams.length >= 14;

  return (
    <div className="fixed inset-0 z-[100] bg-[#05090f] overflow-x-auto overflow-y-auto font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0a1a2f_0%,#05090f_60%)] pointer-events-none"></div>
      
      {/* Rename Modal UI - This handles the Battle Phase modal */}
      {renameState.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })}></div>
          <div className="relative w-full max-w-sm bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in p-6">
            <h3 className="text-[#dcb06b] font-cinzel font-bold text-lg mb-4 text-center tracking-widest">CHANGE NICKNAME</h3>
            <input type="text" value={renameState.newName} onChange={e => setRenameState({ ...renameState, newName: e.target.value })} className="w-full bg-black/50 border border-[#1e3a5f] p-3 text-white font-orbitron focus:border-[#dcb06b] outline-none mb-6 text-center" autoFocus />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setRenameState({ isOpen: false, player: null, newName: '' })} className="flex-1">CANCEL</Button>
              <Button onClick={submitRename} className="flex-1">CONFIRM</Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'OVERVIEW' ? (
        <div className="relative z-10 w-full min-h-screen p-8 md:p-12 flex flex-col items-center min-w-max">
          <div className="absolute top-8 left-8"><Button variant="outline" size="sm" onClick={onMinimize}>LOBBY</Button></div>
          <h1 className="text-4xl md:text-6xl font-cinzel font-black text-[#dcb06b] tracking-[0.3em] mb-16 uppercase">TOURNAMENT BRACKET</h1>
          <div className={`flex items-center justify-center relative py-20 ${isDeepBracket ? 'gap-20 md:gap-28' : 'gap-16 md:gap-24'}`}>
            {hasRoundOne && (
                <div className={`flex flex-col relative ${isDeepBracket ? 'gap-8' : 'gap-8'}`}>
                    {roundOneMatches.map((m, i) => (
                        <div key={m.id} className="relative">
                            {renderBracketMatchCard(m)}
                            {match.teams.length === 14 ? (
                                // 14 Teams Special Connectors: First 4 matches are pairs (Fork), last 2 are singles (Straight)
                                <>
                                    {i < 4 && i % 2 === 0 && <EnergyConnector type="fork" height={218} style={{top:'50%'}}/>}
                                    {i >= 4 && <EnergyConnector type="straight" height={218} style={{top:'50%'}}/>}
                                </>
                            ) : (
                                i % 2 === 0 && <EnergyConnector type="fork" height={218} style={{top:'50%'}}/>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className={`flex flex-col relative ${isDeepBracket ? 'gap-[274px]' : 'gap-32'}`}>
                {quarterMatches.map((m, i) => (
                    <div key={m.id} className="relative">
                        {renderBracketMatchCard(m)}
                        {i % 2 === 0 && <EnergyConnector type="fork" height={isDeepBracket ? 458 : 338} style={{top:'50%'}}/>}
                    </div>
                ))}
            </div>
            <div className={`flex flex-col relative ${isDeepBracket ? 'gap-[758px]' : 'gap-64'}`}>
                {semiMatches.map((m, i) => (
                    <div key={m.id} className="relative">
                        {renderBracketMatchCard(m)}
                        {i === 0 && <EnergyConnector type="fork" height={isDeepBracket ? 938 : 458} style={{top:'50%'}}/>}
                    </div>
                ))}
            </div>
            <div className="relative scale-125 ml-10">{renderBracketMatchCard(grandFinalMatch)}</div>
          </div>
          <button onClick={() => setShowAbortConfirm(true)} className="mt-24 px-12 py-3 bg-red-900/10 border border-red-900/40 text-red-500 font-cinzel font-bold tracking-[0.3em] uppercase">ABORT TOURNAMENT</button>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28 relative h-screen flex flex-col justify-center overflow-hidden">
            {wheelState?.isOpen && <SpinWheel {...wheelState} roleName={wheelState.role} roomId={activeRoomId} onComplete={handleWheelComplete} onCancel={() => setWheelState(null)} />}
            
            {/* Top Bar with Centered Room ID */}
            <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-start">
                <Button variant="outline" size="sm" onClick={() => setPhase('OVERVIEW')}>BACK TO BRACKET</Button>
                
                {/* Centered Room ID Display */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center gap-0 scale-[0.85] origin-top">
                    <span className="text-[#dcb06b] font-orbitron text-[10px] tracking-[0.5em] font-black uppercase mb-1 opacity-70">ROOM ID</span>
                    <div className="relative">
                        <div className="absolute -inset-2 bg-[#dcb06b] blur-[15px] opacity-20 pointer-events-none"></div>
                        <div className="relative bg-black/90 border border-[#dcb06b]/50 px-8 py-2 clip-corner-sm flex flex-col items-center shadow-[0_0_20px_rgba(220,176,107,0.3)]">
                            <span className="text-2xl font-orbitron font-black text-white tracking-[0.4em] drop-shadow-[0_0_10px_#dcb06b]">{activeRoomId}</span>
                        </div>
                    </div>
                </div>
                
                {/* Empty div to balance flex layout if needed, or remove */}
                <div className="w-[100px]"></div> 
            </div>

            <div className="relative max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center px-10">
                <div className="grid grid-cols-2 gap-32 items-end mb-6">
                    <div className="text-left"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-cyan-400">{activeMatchData?.teamA?.name}</h2></div>
                    <div className="text-right"><h2 className="text-2xl md:text-5xl font-cinzel font-black text-red-500">{activeMatchData?.teamB?.name}</h2></div>
                </div>
                <div className="space-y-4 relative z-10">{ROLES_ORDER.map((role) => <div key={role} className="grid grid-cols-2 gap-32"><div>{renderPlayerCard(role, 'azure')}</div><div>{renderPlayerCard(role, 'crimson')}</div></div>)}</div>
            </div>
            <div className="fixed bottom-10 left-0 right-0 flex justify-center">
                 <Button onClick={() => setPhase('TRANSITION')} size="lg">INITIALIZE BATTLE</Button>
            </div>
        </div>
      )}
      <ConfirmModal isOpen={showAbortConfirm} title="ABORT TOURNAMENT" message="End tournament?" onConfirm={onReset} onCancel={() => setShowAbortConfirm(false)} isDestructive />
    </div>
  );
};
