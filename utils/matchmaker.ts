
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
  "#f43f5e"  // Rose
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
  let pool = shuffle(players);
  pool.sort(noisySort);

  const assignments: Map<number, Player> = new Map();
  const usedPlayerIds = new Set<string>();

  const solve = (slotIndex: number): boolean => {
    if (slotIndex >= totalSlots) return true;
    const currentSlot = neededRoles[slotIndex];
    for (const player of pool) {
      if (!usedPlayerIds.has(player.id)) {
        if (canPlay(player, currentSlot.role)) {
          assignments.set(slotIndex, player);
          usedPlayerIds.add(player.id);
          if (solve(slotIndex + 1)) return true;
          assignments.delete(slotIndex);
          usedPlayerIds.delete(player.id);
        }
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
    // Use the full name (part after the em-dash) if available
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

  const neededRoles: Role[] = [];
  ROLES_ORDER.forEach(role => {
      for(let i=0; i<numTeams; i++) neededRoles.push(role);
  });

  const roleCounts: Record<string, number> = {};
  ROLES_ORDER.forEach(r => {
      roleCounts[r] = players.filter(p => canPlay(p, r)).length;
  });
  neededRoles.sort((a, b) => roleCounts[a] - roleCounts[b]);

  const usedIds = new Set<string>();

  const solve = (index: number): boolean => {
      if (index >= neededRoles.length) return true;
      const currentRole = neededRoles[index];
      let candidates = players.filter(p => !usedIds.has(p.id) && canPlay(p, currentRole));
      candidates.sort((a, b) => getPlayerVersatility(a) - getPlayerVersatility(b));

      for (const player of candidates) {
          usedIds.add(player.id);
          if (solve(index + 1)) return true;
          usedIds.delete(player.id);
      }
      return false;
  };

  if (!solve(0)) {
      return { valid: false, error: "IMPOSSIBLE COMPOSITION: Unable to assign all roles validly." };
  }

  return { valid: true };
};

export const generateBracketMatch = (players: Player[], roomId: string, numTeams: number): BracketMatchResult | null => {
  const totalSlots = numTeams * 5;
  if (players.length < totalSlots) return null;

  const slotsToFill: { teamIdx: number, role: Role }[] = [];
  for(let i=0; i<numTeams; i++) {
      ROLES_ORDER.forEach(r => slotsToFill.push({ teamIdx: i, role: r }));
  }

  let pool = shuffle(players);
  pool.sort(noisySort);

  const assignments = new Map<number, Player>();
  const usedIds = new Set<string>();

  const solve = (idx: number): boolean => {
      if (idx >= slotsToFill.length) return true;
      const { role } = slotsToFill[idx];
      let candidates = pool.filter(p => !usedIds.has(p.id) && canPlay(p, role));
      candidates.sort((a, b) => getPlayerVersatility(a) - getPlayerVersatility(b));

      for (const p of candidates) {
          assignments.set(idx, p);
          usedIds.add(p.id);
          if (solve(idx + 1)) return true;
          usedIds.delete(p.id);
          assignments.delete(idx);
      }
      return false;
  };

  if (!solve(0)) return null;

  // Use the full name (part after the em-dash) if available
  const randomItemNames = shuffle(HOK_ITEM_TEAMS).map(n => n.split(' — ')[1] || n);
  const teams: BracketTeam[] = [];
  for (let t = 0; t < numTeams; t++) {
    const teamSlots: TeamSlot[] = [];
    ROLES_ORDER.forEach(role => {
        const rIdx = ROLES_ORDER.indexOf(role);
        const flatIdx = (t * 5) + rIdx;
        const player = assignments.get(flatIdx)!;
        teamSlots.push({ role, player });
    });
    
    // Mix item names with bracket identifiers if list is too short, or just use items
    const teamName = t < randomItemNames.length ? randomItemNames[t] : `TEAM ${BRACKET_NAMES[t % BRACKET_NAMES.length]}`;

    teams.push({
      name: teamName.toUpperCase(),
      slots: teamSlots,
      color: BRACKET_COLORS[t % BRACKET_COLORS.length]
    });
  }
  return { roomId, teams, timestamp: Date.now() };
};
