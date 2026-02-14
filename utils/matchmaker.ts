
import { Player, Role, TeamSlot, MatchResult, BracketMatchResult, BracketTeam } from '../types';
import { ROLES_ORDER, HOK_ITEM_TEAMS } from '../constants';

const BRACKET_NAMES = [
  "Alpha", "Beta", "Charlie", "Delta", "Echo", "Foxtrot", 
  "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima",
  "Mike", "November", "Oscar", "Papa"
];

const BRACKET_COLORS = [
  "#00d2ff", // Cyan
  "#ef4444", // Red
  "#fbbf24", // Gold
  "#a855f7", // Purple
  "#10b981", // Emerald
  "#f97316", // Orange
  "#ec4899", // Pink
  "#ffffff", // White
  "#6366f1", // Indigo
  "#84cc16", // Lime
  "#06b6d4", // Cyan Dark
  "#d946ef", // Fuchsia
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#8b5cf6", // Violet
];

export const TBD_PLAYER: Player = {
  id: 'tbd',
  name: '?',
  roles: [],
  isAllRoles: false,
  isActive: true,
  stats: { matchesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0 }
};

// Fisher-Yates Shuffle for true randomness
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Check if a player can play a specific role
export const canPlay = (player: Player, role: Role): boolean => {
  if (player.id === 'tbd') return true;
  
  if (role === Role.COACH) {
    return player.roles.includes(Role.COACH);
  }
  
  if (player.roles.includes(Role.COACH) && player.roles.length === 1 && !player.isAllRoles) {
     return false; 
  }

  if (player.isAllRoles) return true;
  return player.roles.includes(role);
};

// Calculate versatility score 
const getPlayerVersatility = (player: Player): number => {
  if (player.isAllRoles) return 6;
  return player.roles.length;
};

const noisySort = (a: Player, b: Player) => {
  const scoreA = getPlayerVersatility(a) + (Math.random() * 2.5);
  const scoreB = getPlayerVersatility(b) + (Math.random() * 2.5);
  return scoreA - scoreB;
};

export const getFlexibleCandidate = (pool: Player[], role: Role): Player | null => {
  let candidates = pool.filter(p => canPlay(p, role));
  if (candidates.length === 0) return null;
  candidates = shuffle(candidates);
  if (candidates.length > 1) {
      candidates.sort(noisySort);
  }
  return candidates[0];
};

export const generateMatch = (players: Player[], roomId: string, isCoachMode: boolean): MatchResult | null => {
  const requiredPlayers = isCoachMode ? 12 : 10;
  if (players.length < requiredPlayers) return null;

  const neededRoles: { team: 'azure' | 'crimson', role: Role }[] = [];
  ROLES_ORDER.forEach(role => neededRoles.push({ team: 'azure', role }));
  ROLES_ORDER.forEach(role => neededRoles.push({ team: 'crimson', role }));

  if (isCoachMode) {
    neededRoles.push({ team: 'azure', role: Role.COACH });
    neededRoles.push({ team: 'crimson', role: Role.COACH });
  }

  const totalSlots = neededRoles.length;
  
  // Optimization: Group players by role upfront
  const playersByRole: Record<string, Player[]> = {};
  const allRoles = isCoachMode ? [...ROLES_ORDER, Role.COACH] : ROLES_ORDER;
  
  for (const role of allRoles) {
      let capable = players.filter(p => canPlay(p, role));
      capable = shuffle(capable);
      capable.sort((a, b) => getPlayerVersatility(a) - getPlayerVersatility(b));
      playersByRole[role] = capable;
  }

  const assignments = new Map<number, Player>();
  const usedPlayerIds = new Set<string>();
  
  let operations = 0;
  const MAX_OPS = 500000;

  const solve = (slotIndex: number): boolean => {
    operations++;
    if (operations > MAX_OPS) return false;

    if (slotIndex >= totalSlots) return true;
    const currentSlot = neededRoles[slotIndex];
    
    const candidates = playersByRole[currentSlot.role] || [];

    for (const player of candidates) {
      if (!usedPlayerIds.has(player.id)) {
          assignments.set(slotIndex, player);
          usedPlayerIds.add(player.id);
          if (solve(slotIndex + 1)) return true;
          assignments.delete(slotIndex);
          usedPlayerIds.delete(player.id);
      }
    }
    return false;
  };

  if (solve(0)) {
    const azureTeam: TeamSlot[] = [];
    const crimsonTeam: TeamSlot[] = [];
    for (let i = 0; i < totalSlots; i++) {
        const slot = neededRoles[i];
        const player = assignments.get(i)!;
        if (slot.team === 'azure') azureTeam.push({ role: slot.role, player });
        else crimsonTeam.push({ role: slot.role, player });
    }
    const roleOrderMap = [...ROLES_ORDER, Role.COACH];
    const sortTeam = (a: TeamSlot, b: TeamSlot) => roleOrderMap.indexOf(a.role) - roleOrderMap.indexOf(b.role);
    azureTeam.sort(sortTeam);
    crimsonTeam.sort(sortTeam);

    const randomTeamNames = shuffle(HOK_ITEM_TEAMS);
    const azureTeamName = randomTeamNames[0].split(' — ')[1] || randomTeamNames[0];
    const crimsonTeamName = randomTeamNames[1].split(' — ')[1] || randomTeamNames[1];

    return { 
      roomId, 
      azureTeam, 
      crimsonTeam, 
      azureTeamName,
      crimsonTeamName,
      isCoachMode, 
      timestamp: Date.now() 
    };
  }
  return null;
};

export const validateBracketPool = (players: Player[], numTeams: number): { valid: boolean; error?: string } => {
  const totalSlots = numTeams * 5;
  if (players.length < totalSlots) {
      return { valid: false, error: `INSUFFICIENT PLAYERS: Need ${totalSlots} active players for ${numTeams} teams. Current: ${players.length}` };
  }

  for (const role of ROLES_ORDER) {
      const capablePlayers = players.filter(p => canPlay(p, role));
      if (capablePlayers.length < numTeams) {
          return { valid: false, error: `CRITICAL SHORTAGE: Need ${numTeams} players for ${role.toUpperCase()}, but only ${capablePlayers.length} are available.` };
      }
  }

  return { valid: true };
};

export const generateBracketMatch = (players: Player[], roomId: string, numTeams: number): BracketMatchResult | null => {
  const totalSlots = numTeams * 5;
  if (players.length < totalSlots) return null;

  // 1. Setup Base Slots
  const baseSlots: { teamIdx: number, role: Role }[] = [];
  for(let i=0; i<numTeams; i++) {
      ROLES_ORDER.forEach(r => baseSlots.push({ teamIdx: i, role: r }));
  }

  // 2. Analyze Scarcity to determine strict slot order
  const roleCounts: Record<string, number> = {};
  ROLES_ORDER.forEach(r => {
      roleCounts[r] = players.filter(p => canPlay(p, r)).length;
  });

  // 3. Randomized Restart Strategy
  // Instead of one deep recursion (which freezes the UI on complex 12+ team brackets),
  // we try multiple times with different random seeds and a lower operation limit per attempt.
  // This drastically increases the chance of finding a solution in a "good branch" quickly.
  
  const MAX_ATTEMPTS = 50; 
  const OPS_LIMIT_PER_ATTEMPT = 50000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      
      // Shuffle players deeply to change candidate order
      const shuffledPlayers = shuffle([...players]);

      // Pre-calculate candidates for this attempt
      const playersByRole: Record<string, Player[]> = {};
      for (const role of ROLES_ORDER) {
          let capable = shuffledPlayers.filter(p => canPlay(p, role));
          // Heuristic: Use least versatile players first
          // Add random noise to handle players with equal versatility differently each attempt
          capable.sort((a, b) => {
             const vA = getPlayerVersatility(a);
             const vB = getPlayerVersatility(b);
             if (vA === vB) return Math.random() - 0.5;
             return vA - vB;
          });
          playersByRole[role] = capable;
      }

      // Sort slots: Scarcest roles first (Critical), then random order for same scarcity
      const slotsToFill = [...baseSlots].sort((a, b) => {
          const countA = roleCounts[a.role];
          const countB = roleCounts[b.role];
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
      });

      const assignments = new Map<number, Player>();
      const usedIds = new Set<string>();
      let operations = 0;

      const solve = (idx: number): boolean => {
          operations++;
          // Fail fast if this path is taking too long
          if (operations > OPS_LIMIT_PER_ATTEMPT) return false;

          if (idx >= slotsToFill.length) return true;
          
          const { role } = slotsToFill[idx];
          const candidates = playersByRole[role] || [];

          for (const p of candidates) {
              if (!usedIds.has(p.id)) {
                  assignments.set(idx, p);
                  usedIds.add(p.id);
                  
                  if (solve(idx + 1)) return true;
                  
                  // Backtrack
                  usedIds.delete(p.id);
                  assignments.delete(idx);
              }
          }
          return false;
      };

      if (solve(0)) {
          // Success! Build the result
          const randomItemNames = shuffle(HOK_ITEM_TEAMS).map(n => n.split(' — ')[1] || n);
          const teams: BracketTeam[] = [];
          const tempTeams: Record<number, TeamSlot[]> = {};
          
          for (let i = 0; i < slotsToFill.length; i++) {
              const { teamIdx, role } = slotsToFill[i];
              const player = assignments.get(i)!;
              if (!tempTeams[teamIdx]) tempTeams[teamIdx] = [];
              tempTeams[teamIdx].push({ role, player });
          }

          for (let t = 0; t < numTeams; t++) {
            const teamSlots = tempTeams[t];
            // Consistent role order for display
            teamSlots.sort((a, b) => ROLES_ORDER.indexOf(a.role) - ROLES_ORDER.indexOf(b.role));
            
            const teamName = t < randomItemNames.length ? randomItemNames[t] : `TEAM ${BRACKET_NAMES[t % BRACKET_NAMES.length]}`;
            teams.push({
              name: teamName.toUpperCase(),
              slots: teamSlots,
              color: BRACKET_COLORS[t % BRACKET_COLORS.length]
            });
          }
          return { roomId, teams, timestamp: Date.now() };
      }
      // If attempt failed, loop continues to next randomized attempt
  }

  return null; // Could not find solution after all attempts
};
